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

- `NEXT_PUBLIC_*` из панели **не попадает в сборку**: `og:url` на проде остался `http://localhost:3000`. Решение этапа 4Б: базовый адрес зафиксирован константой в `src/lib/site.ts` (`https://markpourel.ru`), `canonical` и `og:url` на проде равны этому адресу.
- `GIT_SHA` — статичная env, автодеплой её не обновляет; `/api/health` показывает зафиксированное значение.
- Файловая система контейнера эфемерна: при деплое контейнер пересоздаётся. Приложение stateless и на диск не пишет.
- Preview-окружения и build timeout через API не подтверждены — уточнить в панели при необходимости.

## Домен и DNS (этап 4Б)

**Домен:** `markpourel.ru` (подтверждён владельцем 2026-11-11). **DNS:** reg.ru, записи вносит владелец. **Основной адрес:** без `www`; `www.markpourel.ru` и `http` редиректят на `https://markpourel.ru`.

**Что привязано к приложению 285001 (проверено 2026-11-11):**

| FQDN | Как привязан | Сертификат |
|---|---|---|
| `markpourel.ru` | панель Timeweb, «Внешний домен» | Let's Encrypt, выпущен автоматически |
| `www.markpourel.ru` | API: `PATCH /api/v1/apps/285001/domains` с `{"domains":["markpourel.ru","www.markpourel.ru"]}` | Let's Encrypt, выпущен после привязки (~2–3 мин) |

Поле «Домены» в панели показывает оба имени; привязка `www` через панель не проходила, API принял. Любая привязка/отвязка запускает передеплой приложения.

**Записи в reg.ru (состояние на 2026-11-11):** `A @ 90.156.211.168`, `A www 90.156.211.168` (старый CNAME на `vercel-dns` и A-записи Vercel удалены), `TXT yandex-verification` и `TXT google-site-verification` сохранены, `AAAA` нет, `MX` нет. TTL 21600. Секретов и токенов здесь нет.

**Редиректы:** `http → https` и `http://www` → `https://www` делает платформа (308). `www → без www` приложение делает само: `src/proxy.ts` отдаёт 301 на `https://markpourel.ru` с сохранением пути и query — платформа этот редирект не делает.

**Правила правки DNS:**

1. До правок снизить TTL до 300 секунд и сохранить снимок всех записей (скриншот или выгрузка в файл) — вне Git.
2. MX, TXT и прочие записи не трогать: через них работают почта и подтверждение домена.
3. Менять по одной записи; после каждой правки — проверка командой.
4. Старые `A`/`AAAA`, ведущие на хостинг reg.ru, убирать только после добавления новых и только если конфликтуют. Забытая `AAAA` ломает IPv6-посетителям и мешает выпуску сертификата.

**Проверки:**

```powershell
Resolve-DnsName markpourel.ru -Type A
Resolve-DnsName markpourel.ru -Type AAAA
curl.exe -I http://markpourel.ru
curl.exe -I https://markpourel.ru
curl.exe -I https://www.markpourel.ru
curl.exe -s https://markpourel.ru | findstr /i "canonical og:url"
```

**Откат DNS.** Вернуть значения из снимка, начиная с записей, изменённых последними; дождаться истечения TTL и повторить проверки. Если сертификат не выпускается дольше 1–2 часов — сначала диагностика (записи, `AAAA`), потом изменения.

**Базовый адрес сайта.** `NEXT_PUBLIC_*` из панели в сборку не попадает, поэтому в продакшене адрес задан константой `PRODUCTION_SITE_URL = "https://markpourel.ru"` в `src/lib/site.ts` (вне продакшена берётся из env, по умолчанию `http://localhost:3000`). `canonical` объявлен в метаданных главной, `og:url` — в корневом layout; оба строятся от `metadataBase`. Смена домена = правка константы и передеплой.

**Критерий этапа (проверено 2026-11-11):** `https://markpourel.ru` отдаёт 200 с валидным сертификатом, `http` и `http://www` редиректят на `https`, `https://www` отдаёт 301 на `https://markpourel.ru`, `canonical` и `og:url` указывают на `https://markpourel.ru`.

**Токен Timeweb.** API-токен и MCP-сервер (`https://api.timeweb.cloud/api/v1/mcp/search`) дают доступ к инфраструктуре аккаунта; в Git и vault токен не попадает, локально лежит вне репозитория. MCP умеет читать приложения и запускать деплой, но не привязывает домены — это делается REST-запросом `PATCH /api/v1/apps/<id>/domains` со списком FQDN.

## Публикация изменения

**Решение 2026-11-11:** отдельного staging нет. Владелец отказался от второго платного приложения (510 ₽/мес): все правки идут сразу в `main`, без лишних действий. Причина, альтернативы и принятые риски — `docs/adr/0002-no-staging.md`.

**Процесс:**

1. Работа в ветке от `main` (`feature/…`, `docs/…`, `chore/…`).
2. Локальный прогон того же, что делает CI: `npm run lint`, `npx next typegen && npx tsc --noEmit`, `npm run build`, `npm run test:e2e`.
3. PR в `main` → CI (`Code Quality & Tests`, `Docker Build`) → merge.
4. Merge сразу публикуется автодеплоем — проверить прод.

**Проверка прода после деплоя:**

```powershell
curl.exe -I https://markpourel.ru
curl.exe -s https://markpourel.ru/api/health
curl.exe -s https://markpourel.ru/robots.txt
```

**Правило.** Merge в `main` публикует сразу, поэтому PR обязан оставлять прод рабочим: недоделанные страницы не публикуются и не получают ссылок (постраничный Gate — этап 6), черновики контента остаются вне сборки.

**Откат.** Revert-PR (проверено на #11/#12) либо ручной деплой предыдущего коммита: `POST /api/v1/apps/285001/deploy` с `commit_sha`.

**Если staging понадобится снова.** Готовый код защиты (Basic Auth в `src/proxy.ts`, `noindex`, `Disallow: /` в `robots.ts`, e2e) лежит в ветке `feature/stage-4v-staging` и в `main` не влит; включается одной переменной `STAGING_BASIC_AUTH` в env второго приложения. Ветку можно влить отдельным PR.

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
