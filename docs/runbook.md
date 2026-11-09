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

**Приложение:** App Platform, id `285001`, имя `markpourel-portfolio`, тип backend, сборка по Dockerfile.

| Параметр | Значение |
|---|---|
| Репозиторий / ветка | `markpourel/markpourel-portfolio`, `main`, Dockerfile в корне |
| Регион / тариф | ru-1 (зона `spb-3`), preset 1003 — 1 CPU / 1 ГБ / 15 ГБ |
| Публичный URL | https://markpourel-markpourel-portfolio-f875.twc1.net (технический домен), IP `90.156.211.168` |
| Порт | 3000 (из `EXPOSE`; платформа находит его сама) |
| Env | `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=::`, `GIT_SHA`, `NEXT_PUBLIC_SITE_URL` |
| Health | `HEALTHCHECK` из Dockerfile; поле «Путь проверки состояния» в панели — **пустое** |

**Почему `HOSTNAME=::`.** Платформа шлёт health-запрос на `localhost`, а внутри контейнера `localhost` резолвится в `::1`. Сервер на `0.0.0.0` отвечает только по IPv4, поэтому биндинг dual-stack (`::`) обязателен.

**Почему путь health в панели пустой.** Если указать `/api/health`, платформа подменяет проверку своей и деплой падает (`Health status: starting` → failure через 180 с), хотя приложение отвечает 200. С пустым полем используется `HEALTHCHECK` из Dockerfile — деплой проходит за ~5 с (проверено дважды).

**Автодеплой.** Включён и проверен: PR #11 (текст обновился без ручных действий), откат PR #12 (текст вернулся). Сборка с кэшем — 2–60 с, первый билд ~90 с; деплой ~30–60 с.

**Логи.** Панель → вкладки «Деплой» и «Логи». API: `GET /api/v1/apps/285001/deploys`, `GET /api/v1/apps/285001/deploy/<id>/logs`, `GET /api/v1/apps/285001/logs`.

**Откат.** Revert-PR (проверено) либо ручной деплой предыдущего коммита: `POST /api/v1/apps/285001/deploy` с `commit_sha`.

**Ограничения платформы (проверено):**

- `NEXT_PUBLIC_*` из панели **не попадает в сборку**: `og:url` на проде остался `http://localhost:3000`. После подключения домена нужен способ передать адрес на сборку или брать абсолютные URL из `headers()` на сервере.
- `GIT_SHA` — статичная env, автодеплой её не обновляет; `/api/health` показывает зафиксированное значение.
- Файловая система контейнера эфемерна: при деплое контейнер пересоздаётся. Приложение stateless и на диск не пишет.
- Preview-окружения и build timeout через API не подтверждены — уточнить в панели при необходимости.

## Память агента (этап 10)

Рабочая память — `.agent/memory.sqlite` локально (в `.gitignore`, в образ не попадает). Интерфейс — `node scripts/memory.mjs` (Node ≥ 22.5; на Node 22 — с флагом `--experimental-sqlite`; локально проверено на Node 24).

| Действие | Команда |
|---|---|
| создать/починить базу | `node scripts/memory.mjs init --vault C:\Obsidian\markpourel` |
| что уже решали | `node scripts/memory.mjs search "<тема>"` |
| проекция в Obsidian | `node scripts/memory.mjs export` |
| проверка целостности | `node scripts/memory.mjs verify` |
| тесты | `npm run test:memory` |

**Восстановление.** Отдельного бэкапа базы нет: долговременная копия — проекция в vault (`Sessions/`, `Decisions/`). Потеря `.agent/` означает потерю структуры (поиск по решениям и задачам) при сохранённой истории в заметках. После переезда на машину: `init`, дальше решения вносятся заново по `Decisions/` — импорт пока не автоматизирован.

**Правила.** Файлы с `generated: true` в `Sessions/` и `Decisions/` руками не правятся: экспорт перезапишет; менять нужно запись в базе. Секреты в память не пишутся. Схема и инварианты — `docs/adr/0001-project-memory.md`.

## Откат и инциденты

Заполняется на этапе 11.
