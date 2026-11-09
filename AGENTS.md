<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Проект

Сайт-портфолио на Next.js 16 (App Router) + MDX, деплой на Timeweb Cloud App Platform из своего Dockerfile. План этапов и статусы — в vault: `01 – Work/Projects/markpourel-portfolio-next/`.

## Команды

```bash
npm ci                 # установка по lock-файлу
npm run dev            # http://localhost:3000
npm run build          # production-сборка (.next/standalone)
npm run lint           # ESLint
npx next typegen && npx tsc --noEmit
npm run test:e2e       # Playwright
npm run test:memory    # тесты памяти проекта
```

## Правила

- Изменения — только через PR в `main`; прямой push запрещён ruleset-ом. Merge в `main` сразу публикуется автодеплоем, поэтому каждый PR оставляет прод рабочим.
- Секреты — только в env Timeweb и GitHub Secrets; в Git, vault и образе их нет.
- Дизайн — зона владельца: макет переносится 1:1, значения берутся из `docs/design-spec.md`; идеи по улучшению — отдельным списком в отчёт.
- Контент — только из `content.ts`, `profile.ts`, `siteConfig`; выдуманных данных нет.
- API Next 16 не писать по памяти: сверять `node_modules/next/dist/docs/`.

## Память проекта

Рабочая память — `.agent/memory.sqlite` (локально, в `.gitignore`), интерфейс — `scripts/memory.mjs`. Источник истины — база; Obsidian (`Sessions/`, `Decisions/`) — односторонняя проекция, файлы с `generated: true` руками не правятся.

```bash
node scripts/memory.mjs search "<тема>"        # в начале сессии: что уже решали
node scripts/memory.mjs add-decision --title "…" --why "…" [--stage N] [--adr docs/adr/0001-x.md]
node scripts/memory.mjs task --stage N --title "…" [--status blocked]
node scripts/memory.mjs session-close --summary "…"
node scripts/memory.mjs export && node scripts/memory.mjs verify
```

Если база не создана: `node scripts/memory.mjs init --vault C:\Obsidian\markpourel`.
