# Runbook

## Локальная разработка

```bash
npm ci
npm run dev
npm run build
npx tsc --noEmit
```

## Docker

Сборка и запуск (подробности — `infra/notes.md`):

```bash
docker build -t portfolio:stage2 .
docker run -d --name portfolio-test -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 portfolio:stage2
curl.exe -i http://localhost:3000/api/health
docker stop portfolio-test && docker rm portfolio-test
```

## CI

Каждый PR в `main` и каждый push в `main` запускают `.github/workflows/ci.yml`:

- **Code Quality & Tests** — `npm ci` → `npm run lint` → `npx next typegen` → `npx tsc --noEmit` → `npm run build` → Playwright (`npm run test:e2e`).
- **Docker Build** — `docker build --build-arg GIT_SHA=<sha>`.

`next typegen` обязателен: `next-env.d.ts` и типы маршрутов в Git не хранятся и появляются только после генерации; без него `tsc` на чистом checkout падает.

Локальный прогон тех же проверок:

```bash
npm ci
npm run lint
npx next typegen && npx tsc --noEmit
npm run build
npm run test:e2e
```

**Защита `main`.** Ruleset `main protection` (id 26818152): запрет удаления ветки, запрет force-push, изменения только через PR, обязательные проверки `Code Quality & Tests` и `Docker Build`, обязательное разрешение обсуждений. Репозиторий публичный: на GitHub Free защита ветки доступна только для публичных репозиториев. Проверено реальными действиями — прямой push отклоняется (`GH013 ... Changes must be made through a pull request`), PR с красными проверками не мержится, зелёный PR мержится.

Правило действует и для администратора репозитория (`current_user_can_bypass: never`).

## Timeweb Cloud

Заполняется на этапе 4.

## Откат и инциденты

Заполняется на этапе 11.
