import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Основной адрес сайта — без www (этап 4Б). Платформа Timeweb привязывает
 * оба имени к приложению и выпускает на каждое свой сертификат, но сама
 * www на основной адрес не перенаправляет, поэтому редирект делаем здесь.
 *
 * 301 (а не 308) — чтобы совпадало с требованием этапа: второй вариант
 * адреса отдаёт постоянный редирект на основной.
 */
const CANONICAL_HOST = "markpourel.ru";
const REDIRECT_HOST = `www.${CANONICAL_HOST}`;

/**
 * Пути, открытые без пароля на staging (этап 4В).
 *
 * `/api/health` опрашивает HEALTHCHECK из Dockerfile: если проверка упрётся
 * в 401, платформа сочтёт деплой staging неудачным.
 * `/robots.txt` отдаётся без пароля, чтобы поисковик увидел `Disallow: /`
 * ещё до авторизации: иначе запрет индексации просто не будет прочитан.
 */
const OPEN_PATHS = new Set(["/api/health", "/robots.txt"]);

/** Заголовок ставится на все ответы staging — и на страницы, и на 401. */
const NOINDEX_HEADER = { "X-Robots-Tag": "noindex, nofollow" } as const;

/**
 * `STAGING_BASIC_AUTH` = `"логин:пароль"` в env staging-приложения — один
 * флаг и на пароль, и на `noindex`: на проде нечего забыть выключить.
 * Если переменной нет, приложение работает как обычное.
 *
 * Значение читается в рантайме: сборка образа у прода и staging одна и та же.
 */
function readStagingCredentials(): Buffer | "misconfigured" | null {
  const raw = process.env.STAGING_BASIC_AUTH?.trim();

  if (!raw) {
    return null;
  }

  if (!raw.includes(":")) {
    console.error(
      'STAGING_BASIC_AUTH должен быть в формате "логин:пароль"; доступ закрыт',
    );

    return "misconfigured";
  }

  return Buffer.from(raw, "utf8");
}

function readBasicCredentials(header: string | null): Buffer | null {
  if (!header) {
    return null;
  }

  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header.trim());

  if (!match) {
    return null;
  }

  return Buffer.from(match[1], "base64");
}

/** Сравнение без утечки по времени: длины уже совпадают. */
function credentialsMatch(provided: Buffer, expected: Buffer): boolean {
  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

function withNoindex(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(NOINDEX_HEADER)) {
    response.headers.set(name, value);
  }

  return response;
}

function unauthorized(): NextResponse {
  return withNoindex(
    new NextResponse("Требуется авторизация", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Staging", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    }),
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";

  if (host === REDIRECT_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";

    return NextResponse.redirect(url, 301);
  }

  const expected = readStagingCredentials();

  if (!expected) {
    return NextResponse.next();
  }

  if (expected === "misconfigured") {
    return unauthorized();
  }

  // Health без пароля нужен платформе, robots.txt — чтобы читался запрет.
  if (OPEN_PATHS.has(request.nextUrl.pathname)) {
    return withNoindex(NextResponse.next());
  }

  const provided = readBasicCredentials(request.headers.get("authorization"));

  if (!provided || !credentialsMatch(provided, expected)) {
    return unauthorized();
  }

  return withNoindex(NextResponse.next());
}
