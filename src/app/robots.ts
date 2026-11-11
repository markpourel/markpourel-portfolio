import { connection } from "next/server";
import type { MetadataRoute } from "next";

/**
 * Этап 4Б: индексация временной страницы разрешена, sitemap ещё не заявляется
 * (появится на этапе 8 вместе с полным сайтом).
 *
 * Этап 4В: на staging тот же файл отдаёт `Disallow: /`. Решение принимается
 * в рантайме по `STAGING_BASIC_AUTH` — сборка образа у прода и staging одна,
 * а статически сгенерированный robots.txt «замёрз» бы на значении из сборки.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // cacheComponents убирает `export const dynamic`, поэтому request-time
  // рендер включается через `connection()`.
  await connection();

  if (process.env.STAGING_BASIC_AUTH?.trim()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
