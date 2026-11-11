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
  lib/            site.ts, env.ts; content.ts и profile.ts — этапы 5–6
public/           fonts, images, icons, og
docs/             adr, runbook, design-spec.md (этап 6)
infra/            конфигурация деплоя (этап 2)
scripts/          вспомогательные скрипты (этап 10)
skills/           инструкции для агентов (этап 10)
e2e/              Playwright (этап 3)
```

## Состояние

Этапы 1–4 закрыты: каркас, Docker, CI и защита `main`, автодеплой на Timeweb. Порядок изменён 2026-11-10: сначала домен и минимальная страница (этап 04Б), затем контент и вёрстка; отдельное staging (04В) отменено 2026-11-11 — правки идут сразу в `main`. Этап 5 — контент-модель (Zod-схема, MDX-парсер, один реальный кейс, черновики); этап 6 — страницы срезами, каждый со своим постраничным Gate; форма и 152-ФЗ — этап 7; полный релиз на домене — этап 9.

Этап 04Б закрыт 2026-11-11: домен `markpourel.ru` привязан к Timeweb (оба имени, `www` — через API), HTTPS с сертификатом Let's Encrypt, `http` и `www` редиректят на `https://markpourel.ru`, `canonical` и `og:url` от константы в `src/lib/site.ts`.

Этап 04В (отдельное staging-приложение) отменён решением владельца 2026-11-11: все правки идут сразу в `main` через PR, без второго платного приложения. Публикация — ветка → PR → CI → merge → автодеплой; откат — revert-PR. Решение и принятые риски — `docs/adr/0002-no-staging.md`. Следующий — этап 5 (контент-модель).

## Дизайн и вёрстка (этап 6)

- Дизайн делает владелец: макет (Figma или кадры 1440/360) переносится 1:1. Агент не выбирает направление, цвета, шрифты и композицию.
- Значения макета снимаются в `docs/design-spec.md` (только текст, без файлов макета). Конфликты с доступностью, схемой контента или лицензией шрифта фиксируются там же, решение — за владельцем.
- Шрифты — self-host через `next/font/local`, без `next/font/google`: сборка в Docker не должна зависеть от внешней сети.
- Исходники макета (`design/`) и платные шрифты без веб-лицензии в публичный репозиторий не коммитятся; коммитятся только производственные ассеты.
- Пока не пройден общий приём материалов (общий Gate A) и постраничный Gate для конкретной страницы, код вёрстки не пишется: страница без Gate не публикуется и не получает ссылок.

## Память агента

Локальная база `.agent/memory.sqlite` (в `.gitignore`, в образ не попадает) + `scripts/memory.mjs`: сессии, решения, задачи и артефакты с полнотекстовым поиском. Проекция в Obsidian — `Sessions/` и `Decisions/`; архитектурные решения — `docs/adr/`. Протокол для агента: `AGENTS.md` → «Память проекта», скилл `skills/session-close/`. Тесты: `npm run test:memory`.

## Проверки

CI (`.github/workflows/ci.yml`) на каждый PR и push в `main`: ESLint, `next typegen` + `tsc --noEmit`, production build, Playwright (`npm run test:e2e`) и `docker build`. Деплоя из GitHub Actions нет — деплой остаётся за Timeweb.

Перед изменением кода читать `AGENTS.md`: версия Next.js содержит расхождения с распространёнными примерами, актуальная документация — в `node_modules/next/dist/docs/`.
