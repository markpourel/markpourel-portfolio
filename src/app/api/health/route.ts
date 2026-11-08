import { connection } from "next/server";

/**
 * Живость приложения для Docker HEALTHCHECK, Timeweb и Uptime Kuma.
 * Не зависит от БД, Telegram и внешних сервисов.
 *
 * cacheComponents в Next 16 убирает `export const dynamic = "force-dynamic"`,
 * поэтому request-time рендер включается через `connection()`: без него
 * GET мог бы пререндериться на сборке и «заморозить» uptime и timestamp.
 */
export async function GET() {
  await connection();

  return Response.json(
    {
      status: "ok",
      uptime: Math.round(process.uptime()),
      commit: process.env.GIT_SHA?.trim() || "dev",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export async function HEAD() {
  await connection();

  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
