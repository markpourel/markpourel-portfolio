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

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";

  if (host === REDIRECT_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";

    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}
