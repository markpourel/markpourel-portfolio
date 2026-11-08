# markpourel-portfolio

Сайт-портфолио на Next.js (App Router) с MDX-контентом. Деплой — Timeweb Cloud App Platform из собственного Dockerfile.

## Стек

- Next.js 16 (App Router, Turbopack), React 19
- TypeScript strict
- Tailwind CSS 4
- ESLint 9 (flat config)
- npm, Node 22 (`.nvmrc`), `package-lock.json` в репозитории

## Команды

```bash
npm ci            # установка по lock-файлу
npm run dev       # http://localhost:3000
npm run build     # production-сборка, .next/standalone
npm run start     # запуск собранного приложения
npm run lint      # ESLint
npx tsc --noEmit  # проверка типов
```

## Структура

```text
src/
  app/            маршруты, layout, globals.css, not-found
  components/     ui / layout / sections
  content/        контент портфолио (MDX, этап 5)
  lib/            site.ts, env.ts и общая логика
public/           fonts, images, icons, og
docs/             adr, runbook
infra/            конфигурация деплоя (этап 2)
scripts/          вспомогательные скрипты (этап 10)
skills/           инструкции для агентов (этап 10)
e2e/              Playwright (этап 3)
```

## Состояние

Этап 1: каркас, конфигурация, валидация env, `output: standalone`. Дизайн, контент, Docker, CI и деплой — следующие этапы.

Перед изменением кода читать `AGENTS.md`: версия Next.js содержит расхождения с распространёнными примерами, актуальная документация — в `node_modules/next/dist/docs/`.
