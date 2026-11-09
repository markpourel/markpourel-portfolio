import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "memory.mjs");
const WORK = mkdtempSync(join(tmpdir(), "memory-test-"));
const DB = join(WORK, ".agent", "memory.sqlite");
const VAULT = join(WORK, "vault");
const PROJECT = "test-project";
const ENV = {
  ...process.env,
  MEMORY_DB: DB,
  MEMORY_PROJECT: PROJECT,
  OBSIDIAN_VAULT: VAULT,
};
const PROJECT_DIR = join(VAULT, "01 – Work", "Projects", PROJECT);

after(() => {
  rmSync(WORK, { recursive: true, force: true });
});

function runOk(args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], {
    env: ENV,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runFail(args) {
  try {
    execFileSync(process.execPath, [SCRIPT, ...args], {
      env: ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return { status: error.status, stdout: String(error.stdout), stderr: String(error.stderr) };
  }
  throw new Error(`ожидалось падение команды: ${args.join(" ")}`);
}

test("init создаёт схему и идемпотентен", () => {
  const first = runOk(["init"]);
  assert.match(first, /схема: v1/);
  assert.ok(existsSync(DB));

  const second = runOk(["init"]);
  assert.match(second, /схема: v1/);
});

test("справка доступна как help и как --help", () => {
  assert.match(runOk(["help"]), /Команды:/);
  assert.match(runOk(["--help"]), /Команды:/);
});

test("add-decision выдаёт последовательные id и пишет в FTS", () => {
  const id1 = runOk(["add-decision", "--title", "Фильтр каталога серверный", "--why", "Требование DoD: без клиентского JS", "--stage", "6", "--tags", "ui,filter"]).trim();
  assert.match(id1, /^\d{4}-\d{2}-\d{2}-01$/);

  const id2 = runOk(["add-decision", "--title", "Память проекта", "--why", "SQLite как источник, Obsidian как проекция", "--stage", "10"]).trim();
  assert.match(id2, /^\d{4}-\d{2}-\d{2}-02$/);

  const found = runOk(["search", "фильтр"]);
  assert.match(found, /\[decision\]/);
  assert.match(found, new RegExp(id1));

  const byWhy = runOk(["search", "клиентского"]);
  assert.match(byWhy, new RegExp(id1));

  assert.match(runOk(["search", "несусветное"]), /ничего не найдено/);
});

test("search понимает русские словоформы по префиксу", () => {
  const found = runOk(["search", "каталог"]);
  assert.match(found, /Фильтр каталога/);
});

test("task валидирует статус и обновляется по id", () => {
  const failed = runFail(["task", "--stage", "6", "--status", "wat", "--title", "Плохая"]);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /недопустимый статус/);

  const created = runOk(["task", "--stage", "6", "--status", "blocked", "--title", "Ждём макет"]).trim();
  const id = created.split("\t")[0];
  assert.match(id, /^\d{4}-\d{2}-\d{2}-01$/);

  const updated = runOk(["task", "--id", id, "--status", "done"]);
  assert.match(updated, /done/);

  const list = runOk(["tasks"]);
  assert.match(list, /задач нет/);
});

test("attach привязывает артефакт к решению", () => {
  const decisionId = runOk(["search", "фильтр", "--json"]);
  const parsed = JSON.parse(decisionId);
  const id = parsed[0].ref_id;

  const attached = runOk(["attach", "--decision", id, "--path", "docs/adr/0001-filter.md", "--kind", "adr"]);
  assert.match(attached, /a-\d{4}-\d{2}-\d{2}-01-01/);
});

test("export создаёт Sessions/ и Decisions/ и идемпотентен", () => {
  const session = runOk(["session-start", "--summary", "Проверка памяти"]).trim();
  runOk(["add-decision", "--title", "Экспорт в Obsidian", "--why", "Односторонняя проекция", "--session", session]);
  runOk(["session-close", "--summary", "Проверка завершена", "--files", "scripts/memory.mjs,README.md"]);

  const first = runOk(["export"]);
  assert.match(first, /записано \d+/);
  assert.ok(existsSync(join(PROJECT_DIR, "Sessions", `${session}.md`)));
  assert.ok(existsSync(join(PROJECT_DIR, "Decisions")));

  const second = runOk(["export"]);
  assert.match(second, /записано 0, без изменений \d+/);

  const note = readFileSync(join(PROJECT_DIR, "Sessions", `${session}.md`), "utf8");
  assert.match(note, /generated: true/);
  assert.match(note, /\*\*Сводка\.\*\* Проверка завершена/);
  assert.match(note, /\[\[Decisions\//);
});

test("export не перезаписывает ручной файл", () => {
  const session = runOk(["session-start", "--summary", "Ручная правка"]).trim();
  runOk(["session-close", "--summary", "Готово"]);
  runOk(["export"]);

  const file = join(PROJECT_DIR, "Sessions", `${session}.md`);
  const handwritten = readFileSync(file, "utf8").replace("generated: true\n", "");
  writeFileSync(file, handwritten, "utf8");

  const result = runOk(["export"]);
  assert.match(result, /пропущено [1-9]/);
  assert.equal(readFileSync(file, "utf8").includes("generated: true"), false);
});

test("verify проходит после экспорта и ловит пропавший экспорт", () => {
  assert.match(runOk(["verify"]), /ok/);

  rmSync(join(PROJECT_DIR, "Sessions"), { recursive: true, force: true });
  const failed = runFail(["verify"]);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /нет экспорта/);
});
