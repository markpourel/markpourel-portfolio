import type { MetadataRoute } from "next";

/**
 * Этап 4Б: индексация временной страницы разрешена, sitemap ещё не заявляется
 * (появится на этапе 8 вместе с полным сайтом).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
