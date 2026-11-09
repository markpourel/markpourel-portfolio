#!/usr/bin/env node
/**
 * memory.mjs — локальная память проекта.
 *
 * Источник истины: `.agent/memory.sqlite` (локально, в .gitignore, в контейнер не попадает).
 * Проекция в Obsidian: `Sessions/` и `Decisions/` — только файлы с `generated: true`.
 * Решения дополнительно живут текстом в `docs/adr/` (в Git); путь хранится в `decisions.adr_path`.
 *
 * Команды:
 *   init [--vault <путь>]                  создать базу и схему
 *   add-decision --title --why [--stage]   записать решение
 *                  [--alternatives] [--tags a,b] [--adr docs/adr/...] [--session <id>]
 *   task --stage --status --title          создать задачу
 *   task --id <id> [--status] [--title]    обновить задачу
 *   tasks [--status]                       список задач
 *   attach --decision <id> --path --kind   привязать артефакт к решению
 *   session-start [--summary]              открыть сессию
 *   session-close [--id] --summary         закрыть сессию
 *   search <запрос> [--kind] [--project] [--limit] [--json]
 *   export [--vault <путь>] [--project]    проекция в Obsidian (идемпотентно)
 *   verify                                 проверки целостности
 *
 * Требуется Node >= 22.5 (модуль `node:sqlite`); локально проверено на Node 24, на Node 22 — флаг
 * `--experimental-sqlite`.
 */
import process from "node:process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sqlite = await import("node:sqlite").catch(() => null);
if (!sqlite) {
  console.error(
    "memory: нужен Node с модулем node:sqlite (>= 22.5; на Node 22 — запуск с --experimental-sqlite)",
  );
  process.exit(1);
}
const { DatabaseSync } = sqlite;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = resolve(process.env.MEMORY_DB ?? join(ROOT, ".agent", "memory.sqlite"));
const CONFIG_PATH = join(dirname(DB_PATH), "memory.json");
const DEFAULT_PROJECT = process.env.MEMORY_PROJECT ?? "markpourel-portfolio-next";
const SCHEMA_VERSION = 1;
const TASK_STATUSES = ["todo", "in_progress", "done", "blocked", "paused"];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  project    TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at   TEXT,
  summary    TEXT,
  files      TEXT
);

CREATE TABLE IF NOT EXISTS decisions (
  id           TEXT PRIMARY KEY,
  project      TEXT NOT NULL,
  stage        INTEGER,
  date         TEXT NOT NULL,
  title        TEXT NOT NULL,
  why          TEXT NOT NULL,
  alternatives TEXT,
  tags         TEXT,
  adr_path     TEXT,
  session_id   TEXT REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  project    TEXT NOT NULL,
  stage      INTEGER,
  status     TEXT NOT NULL CHECK (status IN ('todo','in_progress','done','blocked','paused')),
  title      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id          TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  kind        TEXT NOT NULL,
  UNIQUE (decision_id, path)
);

CREATE INDEX IF NOT EXISTS decisions_project ON decisions(project);
CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  kind, ref_id, project, title, body,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS decisions_ai AFTER INSERT ON decisions BEGIN
  INSERT INTO memory_fts(kind, ref_id, project, title, body)
  VALUES ('decision', new.id, new.project, new.title,
          coalesce(new.why,'') || ' ' || coalesce(new.alternatives,'') || ' ' || coalesce(new.tags,''));
END;

CREATE TRIGGER IF NOT EXISTS decisions_au AFTER UPDATE ON decisions BEGIN
  DELETE FROM memory_fts WHERE kind = 'decision' AND ref_id = old.id;
  INSERT INTO memory_fts(kind, ref_id, project, title, body)
  VALUES ('decision', new.id, new.project, new.title,
          coalesce(new.why,'') || ' ' || coalesce(new.alternatives,'') || ' ' || coalesce(new.tags,''));
END;

CREATE TRIGGER IF NOT EXISTS decisions_ad AFTER DELETE ON decisions BEGIN
  DELETE FROM memory_fts WHERE kind = 'decision' AND ref_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
  INSERT INTO memory_fts(kind, ref_id, project, title, body)
  VALUES ('task', new.id, new.project, new.title, new.status || ' stage ' || coalesce(new.stage,''));
END;

CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
  DELETE FROM memory_fts WHERE kind = 'task' AND ref_id = old.id;
  INSERT INTO memory_fts(kind, ref_id, project, title, body)
  VALUES ('task', new.id, new.project, new.title, new.status || ' stage ' || coalesce(new.stage,''));
END;

CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
  DELETE FROM memory_fts WHERE kind = 'task' AND ref_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS sessions_ai AFTER INSERT ON sessions BEGIN
  INSERT INTO memory_fts(kind, ref_id, project, title, body)
  VALUES ('session', new.id, new.project, 'сессия ' || new.id, coalesce(new.summary,''));
END;

CREATE TRIGGER IF NOT EXISTS sessions_au AFTER UPDATE ON sessions BEGIN
  DELETE FROM memory_fts WHERE kind = 'session' AND ref_id = old.id;
  INSERT INTO memory_fts(kind, ref_id, project, title, body)
  VALUES ('session', new.id, new.project, 'сессия ' || new.id, coalesce(new.summary,''));
END;
`;

/* ─────────────── аргументы ─────────────── */

const BOOLEAN_FLAGS = new Set(["help", "json"]);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  const positional = [];

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    if (BOOLEAN_FLAGS.has(body)) {
      flags[body] = true;
      continue;
    }
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[body] = next;
      i += 1;
    } else {
      flags[body] = true;
    }
  }

  return { command, flags, positional };
}

function requireFlag(flags, name, hint) {
  const value = flags[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`не указан --${name}${hint ? ` (${hint})` : ""}`);
  }
  return value.trim();
}

function optionalInt(flags, name) {
  if (flags[name] === undefined) return null;
  const value = Number(flags[name]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} должен быть целым положительным числом`);
  }
  return value;
}

/* ─────────────── база ─────────────── */

function openDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

function withDb(fn) {
  const db = openDb();
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

function assertInitialized(db) {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
  if (!row) {
    throw new Error(`база не инициализирована — выполните: node scripts/memory.mjs init (${DB_PATH})`);
  }
  if (row.value !== String(SCHEMA_VERSION)) {
    throw new Error(`схема v${row.value}, ожидается v${SCHEMA_VERSION}`);
  }
}

/* ─────────────── утилиты ─────────────── */

const pad2 = (value) => String(value).padStart(2, "0");

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function localIso(date = new Date()) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

function localTime(iso) {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
}

function nextId(db, table, day = localDate()) {
  const row = db
    .prepare(`SELECT id FROM ${table} WHERE id LIKE ? ORDER BY id DESC LIMIT 1`)
    .get(`${day}-%`);
  const next = row ? Number(row.id.slice(-2)) + 1 : 1;
  return `${day}-${pad2(next)}`;
}

function yaml(value) {
  return JSON.stringify(String(value));
}

function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "item";
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function resolveVault(flags) {
  const raw = flags.vault ?? process.env.OBSIDIAN_VAULT ?? readConfig().vault;
  if (!raw) {
    throw new Error(
      "не задан vault: укажите --vault <путь>, переменную OBSIDIAN_VAULT или выполните init --vault <путь>",
    );
  }
  return resolve(String(raw));
}

function projectVaultDir(vault, project) {
  return join(vault, "01 – Work", "Projects", project);
}

/* ─────────────── команды ─────────────── */

function cmdInit(flags) {
  const project = typeof flags.project === "string" ? flags.project : DEFAULT_PROJECT;

  withDb((db) => {
    db.exec(SCHEMA);
    db.prepare("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', ?)").run(
      String(SCHEMA_VERSION),
    );
    db.prepare("INSERT OR IGNORE INTO meta(key, value) VALUES ('project', ?)").run(project);
    db.prepare("INSERT OR IGNORE INTO meta(key, value) VALUES ('created_at', ?)").run(localIso());
  });

  if (typeof flags.vault === "string") {
    writeFileSync(CONFIG_PATH, `${JSON.stringify({ vault: resolve(flags.vault) }, null, 2)}\n`, "utf8");
  }

  console.log(`база:  ${DB_PATH}`);
  console.log(`схема: v${SCHEMA_VERSION}, проект: ${project}`);
  if (typeof flags.vault === "string") console.log(`vault: ${resolve(flags.vault)}`);
}

function cmdAddDecision(flags) {
  const title = requireFlag(flags, "title", "что решили, одной фразой");
  const why = requireFlag(flags, "why", "почему именно так");
  const project = typeof flags.project === "string" ? flags.project : DEFAULT_PROJECT;
  const stage = optionalInt(flags, "stage");

  withDb((db) => {
    assertInitialized(db);
    const id = nextId(db, "decisions");
    db.prepare(
      `INSERT INTO decisions (id, project, stage, date, title, why, alternatives, tags, adr_path, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      project,
      stage,
      localDate(),
      title,
      why,
      typeof flags.alternatives === "string" ? flags.alternatives : null,
      typeof flags.tags === "string" ? splitList(flags.tags).join(",") : null,
      typeof flags.adr === "string" ? flags.adr : null,
      typeof flags.session === "string" ? flags.session : null,
    );

    if (typeof flags.adr === "string" && !existsSync(join(ROOT, flags.adr))) {
      console.error(`warning: ADR не найден: ${flags.adr} (путь сохранён как есть)`);
    }

    if (flags.json) {
      console.log(JSON.stringify({ id, project, stage, date: localDate(), title }));
    } else {
      console.log(id);
    }
  });
}

function cmdTask(flags) {
  const project = typeof flags.project === "string" ? flags.project : DEFAULT_PROJECT;

  withDb((db) => {
    assertInitialized(db);

    if (typeof flags.id === "string") {
      const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(flags.id);
      if (!existing) throw new Error(`задача не найдена: ${flags.id}`);
      const status = typeof flags.status === "string" ? flags.status : existing.status;
      if (!TASK_STATUSES.includes(status)) {
        throw new Error(`недопустимый статус: ${status} (${TASK_STATUSES.join(", ")})`);
      }
      const title = typeof flags.title === "string" ? flags.title.trim() : existing.title;
      db.prepare("UPDATE tasks SET status = ?, title = ?, updated_at = ? WHERE id = ?").run(
        status,
        title,
        localIso(),
        flags.id,
      );
      console.log(`${flags.id}\t${status}\t${title}`);
      return;
    }

    const title = requireFlag(flags, "title", "что нужно сделать");
    const stage = optionalInt(flags, "stage");
    const status = typeof flags.status === "string" ? flags.status : "todo";
    if (!TASK_STATUSES.includes(status)) {
      throw new Error(`недопустимый статус: ${status} (${TASK_STATUSES.join(", ")})`);
    }
    const id = nextId(db, "tasks");
    db.prepare(
      "INSERT INTO tasks (id, project, stage, status, title, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(id, project, stage, status, title, localIso());
    console.log(`${id}\t${status}\t${title}`);
  });
}

function cmdTasks(flags) {
  const project = typeof flags.project === "string" ? flags.project : DEFAULT_PROJECT;

  withDb((db) => {
    assertInitialized(db);
    const status = typeof flags.status === "string" ? flags.status : null;
    if (status && !TASK_STATUSES.includes(status)) {
      throw new Error(`недопустимый статус: ${status} (${TASK_STATUSES.join(", ")})`);
    }
    const rows = status
      ? db.prepare("SELECT * FROM tasks WHERE project = ? AND status = ? ORDER BY id").all(project, status)
      : db.prepare("SELECT * FROM tasks WHERE project = ? AND status <> 'done' ORDER BY stage, id").all(project);
    if (rows.length === 0) {
      console.log("задач нет");
      return;
    }
    for (const task of rows) {
      const stage = task.stage == null ? "—" : `этап ${task.stage}`;
      console.log(`${task.status.padEnd(11)} ${stage.padEnd(8)} ${task.id}  ${task.title}`);
    }
  });
}

function cmdAttach(flags) {
  const decisionId = requireFlag(flags, "decision", "id решения");
  const path = requireFlag(flags, "path", "путь к файлу или ссылка");
  const kind = typeof flags.kind === "string" ? flags.kind : "file";

  withDb((db) => {
    assertInitialized(db);
    const decision = db.prepare("SELECT id FROM decisions WHERE id = ?").get(decisionId);
    if (!decision) throw new Error(`решение не найдено: ${decisionId}`);
    const count = db.prepare("SELECT count(*) AS c FROM artifacts WHERE decision_id = ?").get(decisionId).c;
    const id = `a-${decisionId}-${pad2(count + 1)}`;
    db.prepare("INSERT INTO artifacts (id, decision_id, path, kind) VALUES (?, ?, ?, ?)").run(
      id,
      decisionId,
      path,
      kind,
    );
    console.log(`${id}\t${decisionId}\t${kind}\t${path}`);
  });
}

function cmdSessionStart(flags) {
  const project = typeof flags.project === "string" ? flags.project : DEFAULT_PROJECT;
  const summary = typeof flags.summary === "string" ? flags.summary : null;

  withDb((db) => {
    assertInitialized(db);
    const id = nextId(db, "sessions");
    db.prepare("INSERT INTO sessions (id, project, started_at, summary) VALUES (?, ?, ?, ?)").run(
      id,
      project,
      localIso(),
      summary,
    );
    console.log(id);
  });
}

function cmdSessionClose(flags) {
  const summary = requireFlag(flags, "summary", "чем закончилась сессия");
  const project = typeof flags.project === "string" ? flags.project : DEFAULT_PROJECT;
  const files = typeof flags.files === "string" ? splitList(flags.files).join(",") : null;

  withDb((db) => {
    assertInitialized(db);
    const id =
      typeof flags.id === "string"
        ? flags.id
        : db
            .prepare(
              "SELECT id FROM sessions WHERE project = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
            )
            .get(project)?.id;

    if (!id) throw new Error("нет открытой сессии: укажите --id или начните её через session-start");
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
    if (!session) throw new Error(`сессия не найдена: ${id}`);

    db.prepare("UPDATE sessions SET ended_at = ?, summary = ?, files = coalesce(?, files) WHERE id = ?").run(
      localIso(),
      summary,
      files,
      id,
    );
    console.log(`${id}\t${summary}`);
  });
}

function ftsQuery(input) {
  const tokens = String(input).toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!tokens || tokens.length === 0) throw new Error("пустой поисковый запрос");
  return tokens.map((token) => `"${token}"*`).join(" ");
}

function cmdSearch(flags, positional) {
  const query = positional.join(" ").trim();
  if (!query) throw new Error("пустой поисковый запрос");
  const limit = flags.limit ? Number(flags.limit) : 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("--limit должен быть целым от 1 до 100");
  }
  const kind = typeof flags.kind === "string" ? flags.kind : null;
  const project = typeof flags.project === "string" ? flags.project : null;
  if (kind && !["decision", "task", "session"].includes(kind)) {
    throw new Error("--kind: decision | task | session");
  }

  withDb((db) => {
    assertInitialized(db);
    const rows = db
      .prepare(
        `SELECT kind, ref_id, project, title,
                snippet(memory_fts, 4, '[', ']', '…', 12) AS snippet
         FROM memory_fts
         WHERE memory_fts MATCH ?
           AND (? IS NULL OR project = ?)
           AND (? IS NULL OR kind = ?)
         ORDER BY bm25(memory_fts)
         LIMIT ?`,
      )
      .all(ftsQuery(query), project, project, kind, kind, limit);

    if (flags.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    if (rows.length === 0) {
      console.log("ничего не найдено");
      return;
    }
    for (const row of rows) {
      console.log(`[${row.kind}] ${row.ref_id} · ${row.title}`);
      if (row.snippet) console.log(`    ${row.snippet.replace(/\s+/g, " ").trim()}`);
    }
  });
}

/* ─────────────── экспорт в Obsidian ─────────────── */

const GENERATED_MARK = /^---[\s\S]*?\ngenerated:\s*true\s*$/m;

function isGenerated(content) {
  return GENERATED_MARK.test(content);
}

function normalize(content) {
  return content.replace(/\r\n/g, "\n").trimEnd();
}

function writeGenerated(target, content, stats) {
  if (existsSync(target)) {
    const current = readFileSync(target, "utf8");
    if (!isGenerated(current)) {
      console.error(`skip: файл не сгенерирован, руками правится — ${target}`);
      stats.skipped += 1;
      return;
    }
    if (normalize(current) === normalize(content)) {
      stats.unchanged += 1;
      return;
    }
  }
  writeFileSync(target, content, "utf8");
  stats.written += 1;
}

function cleanupRenamed(dir, prefix, keepName, stats) {
  for (const file of readdirSync(dir)) {
    if (!file.startsWith(prefix) || file === keepName || !file.endsWith(".md")) continue;
    const full = join(dir, file);
    if (isGenerated(readFileSync(full, "utf8"))) {
      rmSync(full);
      stats.written += 1;
    } else {
      stats.skipped += 1;
      console.error(`skip: переименованный файл не сгенерирован — ${full}`);
    }
  }
}

function renderDecision(decision, artifacts) {
  const lines = [
    "---",
    "type: agent-decision",
    "generated: true",
    "generator: scripts/memory.mjs",
    "source: .agent/memory.sqlite",
    `project: ${yaml(decision.project)}`,
    `id: ${yaml(decision.id)}`,
    `date: ${decision.date}`,
  ];
  if (decision.stage != null) lines.push(`stage: ${decision.stage}`);
  lines.push(`decision: ${yaml(decision.title)}`);
  if (decision.tags) lines.push(`tags: [${splitList(decision.tags).map(yaml).join(", ")}]`);
  if (decision.adr_path) lines.push(`adr: ${yaml(decision.adr_path)}`);
  lines.push("---", "");
  lines.push(`# ${decision.id} — ${decision.title}`, "");
  lines.push(`**Почему.** ${decision.why}`, "");
  lines.push(`**Альтернативы.** ${decision.alternatives || "—"}`);

  if (artifacts.length > 0) {
    lines.push("", "**Артефакты.**");
    for (const artifact of artifacts) lines.push(`- \`${artifact.path}\` (${artifact.kind})`);
  }
  if (decision.adr_path) {
    lines.push("", `**ADR в репозитории.** \`${decision.adr_path}\``);
  }
  if (decision.session_id) {
    lines.push("", `**Сессия.** [[Sessions/${decision.session_id}|${decision.session_id}]]`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderSession(session, decisions) {
  const period = session.ended_at
    ? `${localTime(session.started_at)} — ${localTime(session.ended_at)}`
    : `${localTime(session.started_at)} — не закрыта`;
  const lines = [
    "---",
    "type: agent-session",
    "generated: true",
    "generator: scripts/memory.mjs",
    "source: .agent/memory.sqlite",
    `project: ${yaml(session.project)}`,
    `id: ${yaml(session.id)}`,
    `started: ${yaml(session.started_at)}`,
    `ended: ${session.ended_at ? yaml(session.ended_at) : "null"}`,
    "---",
    "",
    `# Сессия ${session.id}`,
    "",
    `**Период.** ${period} (${session.started_at.slice(0, 10)})`,
    "",
    `**Сводка.** ${session.summary || "—"}`,
  ];

  const files = splitList(session.files);
  if (files.length > 0) {
    lines.push("", "**Файлы.**");
    for (const file of files) lines.push(`- \`${file}\``);
  }

  if (decisions.length > 0) {
    lines.push("", "**Решения.**");
    for (const decision of decisions) {
      lines.push(`- [[Decisions/${decision.id}-${slugify(decision.title)}|${decision.id} — ${decision.title}]]`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function cmdExport(flags) {
  const vault = resolveVault(flags);
  const project = typeof flags.project === "string" ? flags.project : DEFAULT_PROJECT;
  const base = projectVaultDir(vault, project);
  const sessionsDir = join(base, "Sessions");
  const decisionsDir = join(base, "Decisions");
  mkdirSync(sessionsDir, { recursive: true });
  mkdirSync(decisionsDir, { recursive: true });

  const stats = { written: 0, unchanged: 0, skipped: 0 };

  withDb((db) => {
    assertInitialized(db);

    const decisions = db
      .prepare("SELECT * FROM decisions WHERE project = ? ORDER BY id")
      .all(project);
    for (const decision of decisions) {
      const name = `${decision.id}-${slugify(decision.title)}.md`;
      const target = join(decisionsDir, name);
      cleanupRenamed(decisionsDir, `${decision.id}-`, name, stats);
      const artifacts = db
        .prepare("SELECT path, kind FROM artifacts WHERE decision_id = ? ORDER BY path")
        .all(decision.id);
      writeGenerated(target, renderDecision(decision, artifacts), stats);
    }

    const sessions = db.prepare("SELECT * FROM sessions WHERE project = ? ORDER BY id").all(project);
    for (const session of sessions) {
      const name = `${session.id}.md`;
      const target = join(sessionsDir, name);
      const decisionsOfSession = db
        .prepare("SELECT id, title FROM decisions WHERE session_id = ? ORDER BY id")
        .all(session.id);
      writeGenerated(target, renderSession(session, decisionsOfSession), stats);
    }
  });

  console.log(
    `экспорт: записано ${stats.written}, без изменений ${stats.unchanged}, пропущено ${stats.skipped}`,
  );
  console.log(`каталог: ${base}`);
}

/* ─────────────── проверки ─────────────── */

function cmdVerify(flags) {
  const problems = [];

  withDb((db) => {
    assertInitialized(db);

    const counts = {
      sessions: db.prepare("SELECT count(*) AS c FROM sessions").get().c,
      decisions: db.prepare("SELECT count(*) AS c FROM decisions").get().c,
      tasks: db.prepare("SELECT count(*) AS c FROM tasks").get().c,
      artifacts: db.prepare("SELECT count(*) AS c FROM artifacts").get().c,
    };

    const orphans = db
      .prepare(
        "SELECT a.id FROM artifacts a LEFT JOIN decisions d ON d.id = a.decision_id WHERE d.id IS NULL",
      )
      .all();
    for (const orphan of orphans) problems.push(`артефакт без решения: ${orphan.id}`);

    const missingAdr = db
      .prepare("SELECT id, adr_path FROM decisions WHERE adr_path IS NOT NULL AND adr_path <> ''")
      .all()
      .filter((row) => !existsSync(join(ROOT, row.adr_path)));
    for (const row of missingAdr) problems.push(`ADR не найден: ${row.adr_path} (решение ${row.id})`);

    const blocked = db
      .prepare("SELECT id, title FROM tasks WHERE status = 'blocked' ORDER BY stage, id")
      .all();
    for (const task of blocked) console.log(`info: заблокировано ${task.id} — ${task.title}`);

    console.log(
      `сессии ${counts.sessions} · решения ${counts.decisions} · задачи ${counts.tasks} · артефакты ${counts.artifacts}`,
    );

    const vault = flags.vault ?? process.env.OBSIDIAN_VAULT ?? readConfig().vault;
    if (!vault) {
      console.log("vault не настроен — проверка экспорта пропущена");
    } else {
      const base = projectVaultDir(resolve(String(vault)), flags.project ?? DEFAULT_PROJECT);
      const missing = [];
      for (const decision of db
        .prepare("SELECT id, title FROM decisions WHERE project = ?")
        .all(flags.project ?? DEFAULT_PROJECT)) {
        const file = join(base, "Decisions", `${decision.id}-${slugify(decision.title)}.md`);
        if (!existsSync(file)) missing.push(`Decisions/${decision.id}-${slugify(decision.title)}.md`);
      }
      for (const session of db
        .prepare("SELECT id FROM sessions WHERE project = ?")
        .all(flags.project ?? DEFAULT_PROJECT)) {
        const file = join(base, "Sessions", `${session.id}.md`);
        if (!existsSync(file)) missing.push(`Sessions/${session.id}.md`);
      }
      for (const file of missing) problems.push(`нет экспорта: ${file}`);
      if (missing.length === 0) console.log("экспорт в vault на месте");
    }
  });

  if (problems.length > 0) {
    for (const problem of problems) console.error(`! ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log("ok");
}

/* ─────────────── справка ─────────────── */

function printHelp() {
  console.log(`memory.mjs — локальная память проекта

База: ${DB_PATH}
Vault: ${process.env.OBSIDIAN_VAULT ?? readConfig().vault ?? "не задан (--vault или OBSIDIAN_VAULT)"}
Проект: ${DEFAULT_PROJECT}

Команды:
  init [--vault <путь>]                     создать базу и схему
  session-start [--summary "…"]             открыть сессию
  session-close [--id <id>] --summary "…"   закрыть сессию
  add-decision --title "…" --why "…"        записать решение
      [--stage N] [--alternatives "…"] [--tags a,b]
      [--adr docs/adr/0001-x.md] [--session <id>] [--json]
  task --stage N --title "…" [--status todo] создать задачу
  task --id <id> [--status done] [--title "…"] обновить задачу
  tasks [--status blocked]                  список открытых задач
  attach --decision <id> --path <путь>      привязать артефакт
      [--kind file|adr|url]
  search <запрос> [--kind] [--limit N]      поиск (FTS5)
      [--project <slug>] [--json]
  export [--vault <путь>]                   проекция Sessions/ и Decisions/ в Obsidian
  verify                                    проверки целостности

Статусы задач: ${TASK_STATUSES.join(" | ")}
`);
}

/* ─────────────── вход ─────────────── */

function main() {
  const raw = process.argv.slice(2);
  const flagsFirst = raw.length > 0 && raw[0].startsWith("--");
  const { command, flags, positional } = parseArgs(raw);

  if (flagsFirst || !command || command === "help" || flags.help === true) {
    printHelp();
    return;
  }

  switch (command) {
    case "init":
      cmdInit(flags);
      break;
    case "add-decision":
      cmdAddDecision(flags);
      break;
    case "task":
      cmdTask(flags);
      break;
    case "tasks":
      cmdTasks(flags);
      break;
    case "attach":
      cmdAttach(flags);
      break;
    case "session-start":
      cmdSessionStart(flags);
      break;
    case "session-close":
      cmdSessionClose(flags);
      break;
    case "search":
      cmdSearch(flags, positional);
      break;
    case "export":
      cmdExport(flags);
      break;
    case "verify":
      cmdVerify(flags);
      break;
    default:
      throw new Error(`неизвестная команда: ${command} (см. --help)`);
  }
}

try {
  main();
} catch (error) {
  console.error(`memory: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
