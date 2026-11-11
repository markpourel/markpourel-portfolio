# Docker: заметки по сборке и запуску

Единая инструкция — `Dockerfile` в корне репозитория. Он же используется
Timeweb Cloud App Platform (сборка по своему Dockerfile, не по пресету Next.js).

## Стадии

| Стадия | База | Что делает |
|---|---|---|
| `deps` | `node:22-alpine` | `npm ci` строго по `package-lock.json` |
| `builder` | `node:22-alpine` | `npm run build` → `.next/standalone`, `.next/static` |
| `runner` | `node:22-alpine` | только рантайм: `public`, `standalone`, `static`; пользователь `nextjs` (uid 1001) |

В финальный образ не попадают: исходники, Git-история, devDependencies,
`.env*`, SQLite, память агента, `docs` и заметки (см. `.dockerignore`).

## Порт и переменные

| Переменная | Значение | Где задаётся |
|---|---|---|
| `NODE_ENV` | `production` | Dockerfile |
| `PORT` | `3000` | Dockerfile, можно переопределить в среде |
| `HOSTNAME` | `0.0.0.0` | Dockerfile (иначе сервер слушает только localhost контейнера) |
| `NEXT_PUBLIC_SITE_URL` | адрес сайта | среда/панель; **вшивается в клиент при сборке** |
| `GIT_SHA` | `dev` или SHA коммита | среда; появляется в `/api/health` |

`NEXT_PUBLIC_*` фиксируется на этапе `npm run build`. Базовый адрес сайта
фиксируется константой в `src/lib/site.ts` (этап 4Б): переменная из панели
в сборку не попадает, поэтому canonical и OG берут адрес из кода.

## Health

`GET /api/health` → `200` и JSON `{ status, uptime, commit, timestamp }`,
`HEAD` → `200` без тела. Ответ `no-store`. Docker HEALTHCHECK и Uptime Kuma
ходят именно сюда. Endpoint не зависит от БД и внешних сервисов.

## Локальные команды

```bash
docker build -t portfolio:stage2 .
docker run -d --name portfolio-test -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  -e GIT_SHA=local portfolio:stage2
curl.exe -i http://localhost:3000/api/health
curl.exe -s -o NUL -w "%{http_code}" -I http://localhost:3000/api/health
docker inspect --format "{{.State.Health.Status}} {{.Config.User}}" portfolio-test
docker logs portfolio-test
docker stop portfolio-test && docker rm portfolio-test
```

## Особенности alpine

- `wget` — busybox, отдельный пакет для HEALTHCHECK не нужен.
- Нативные модули проверены на `linux/amd64` + musl: `npm ci` и `next build`
  в контейнере проходят; копировать `node_modules` с хоста нельзя.
- `node:22-alpine` — плавающий тег; версия Node зафиксирована только мажором.
  Если понадобится воспроизводимость байт-в-байт, заменить на `22.x.y-alpine`.

## Timeweb Cloud App Platform

- Источник — приватный GitHub-репозиторий, ветка `main`, путь `./Dockerfile`.
- Порт приложения — `3000`.
- Env: `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`,
  `NEXT_PUBLIC_SITE_URL=<временный URL>`, `GIT_SHA=dev`.
- Контейнер stateless: заявки уходят наружу (этап 7), на диск ничего не пишется.
- При OOM на сборке: сначала диагностика (какая стадия, сколько RAM),
  потом тариф или `NODE_OPTIONS`; Dockerfile вслепую не переписывать.

## Резервный VPS

`infra/compose.vps.yml` — образ из `PORTFOLIO_IMAGE`, `restart: unless-stopped`,
`expose: 3000`, внешняя сеть `web` (Caddy). Ничего не разворачивать до этапа 11;
имя сети и схему проксирования подтвердить на сервере.
