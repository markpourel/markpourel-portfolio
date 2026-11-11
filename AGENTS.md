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

## Песочница `lab/`

Отдельное Next.js-приложение для проверки библиотек и экспериментов — **не**
workspace корня: свои `package.json` и `package-lock.json`, порт 3100.

```bash
cd lab
npm ci
npm run dev      # http://localhost:3100
```

- На сайт ничего не влияет: `/lab` вырезан в `.dockerignore`, `lab/` исключён из
  корневых `tsconfig`, ESLint и Playwright, CI проверяет песочницу отдельным job
  только когда PR задел `lab/`. Dependabot `lab/` не смотрит.
- В Git идёт только код `lab/`; `lab/node_modules`, `lab/.next` и `lab/.local`
  (лицензионные шрифты и тяжёлые ассеты) — в `.gitignore`.
- Перенос из `lab/` на сайт — только отдельным PR: код после постраничного Gate,
  библиотека в корневой `package.json` только после выбора (точная версия,
  зелёные `npm run build` и Docker-сборка, проверенная лицензия и размер бандла),
  ассеты и шрифты — только с подтверждённой веб-лицензией. Правила целиком —
  `lab/README.md`.
- Порядок локальной проверки страницы целиком (dev → песочница → Docker-образ
  перед PR) — `docs/runbook.md` § «Локальная проверка».

## Правила

- Изменения — только через PR в `main`; прямой push запрещён ruleset-ом. Merge в `main` сразу публикуется автодеплоем, поэтому каждый PR оставляет прод рабочим.
- Секреты — только в env Timeweb и GitHub Secrets; в Git, vault и образе их нет.
- Дизайн — зона владельца: макет переносится 1:1, значения берутся из `docs/design-spec.md`; идеи по улучшению — отдельным списком в отчёт.
- Контент — только из `content.ts`, `profile.ts`, `siteConfig`; выдуманных данных нет.
- API Next 16 не писать по памяти: сверять `node_modules/next/dist/docs/`.
- Эксперименты и нерешительные библиотеки — сначала в `lab/`, в `src/` и корневой
  `package.json` они попадают только отдельным PR по правилам выше.

## Скорость и стоимость сессии

Стоимость хода растёт как число шагов × размер контекста, поэтому бюджет шагов важнее
бюджета файлов. Правила ниже — следствие аудита сессии от 2026-11-11 (один экран
стоил 173 шага вместо ~25).

- **Бюджет.** Один экран — до 25 шагов агента вместе со сверкой. Сверка — не больше
  2 итераций; расхождение ≤1 px считается результатом, а не дефектом.
- **Значения — из JSON макета.** `node scripts/figma-spec.mjs <export-dir>` печатает
  кадры, координаты, типографику и ассеты одной сводкой. PNG нужен только для сверки,
  не для поиска координат.
- **Сверка — одной командой.** `node scripts/visual-diff.mjs --url … --ref … --width …
  --height …` печатает строку MAE/долю >16/худший блок и пишет карту разницы в файл.
- **Тяжёлые выводы — в файл.** В чат — не больше 10 строк (`Select-Object -First`,
  `Tee-Object`, агрегаты). Никаких дампов HTML, JSON и ASCII-арта.
- **Длинный цикл — субагенту.** Разбор экспорта, скриншот→diff→правка и прочие
  итерации без решений выполняет ребёнок; в основной тред возвращается итог.
- **Префлайт за 3 шага.** Умеет ли модель читать картинки; работают ли CSS-модули
  (в этом проекте нет — правило Turbopack в `next.config.ts`); доступны ли деплой,
  DNS и credentials. Дешевле, чем выяснять это на середине.
- **2 вопроса до кода.** Допуск по пикселям (±1 px или пиксель-в-пиксель) и входит ли
  деплой/DNS в задачу.

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
