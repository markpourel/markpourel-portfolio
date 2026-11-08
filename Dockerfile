# syntax=docker/dockerfile:1
# Одна инструкция сборки для локальной проверки, CI и Timeweb App Platform.
# Next.js собирается в standalone-режиме (next.config.ts → output: "standalone").

# --- deps: зависимости строго по lock-файлу -------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json .npmrc ./
RUN npm ci \
 && node -e "const abi = process.report?.getReport?.().header.glibcVersionRuntime ? 'gnu' : 'musl'; const pkg = '@next/swc-' + process.platform + '-' + process.arch + '-' + abi; require('node:fs').accessSync('node_modules/' + pkg); console.log('native SWC binding:', pkg)"

# --- builder: production-сборка -------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# ARG нужен, чтобы CI мог передать коммит: без него --build-arg молча игнорируется.
ARG GIT_SHA=dev

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- runner: минимальный образ, непривилегированный пользователь ----------
FROM node:22-alpine AS runner
WORKDIR /app

ARG GIT_SHA=dev

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV GIT_SHA=$GIT_SHA

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN exit 1

USER nextjs

EXPOSE 3000

# busybox wget есть в alpine, отдельный пакет не нужен.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
