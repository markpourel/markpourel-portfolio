import { isProduction, siteUrl as envSiteUrl } from "@/lib/env";

/**
 * Базовый адрес сайта в продакшене.
 *
 * NEXT_PUBLIC_* из панели Timeweb не попадает в сборку (проверено на этапе 4:
 * og:url на проде остался http://localhost:3000), поэтому адрес фиксируется
 * константой в коде. Значение не секрет и меняется только вместе с доменом.
 *
 * Этап 4Б: https://markpourel.ru — основной адрес без www.
 */
const PRODUCTION_SITE_URL = "https://markpourel.ru";

/**
 * Вне продакшена адрес берётся из env (по умолчанию http://localhost:3000),
 * чтобы локальная разработка не ссылалась на боевой домен.
 */
export const siteUrl = isProduction ? PRODUCTION_SITE_URL : envSiteUrl;

export const siteConfig = {
  name: "Mark Pourel",
  title: "Mark Pourel — цифровой дизайнер",
  description:
    "Портфолио цифрового дизайнера: интерфейсы, интерактивные проекты и визуальные системы.",
  url: siteUrl,

  author: {
    name: "Mark Pourel",
    role: "Цифровой дизайнер",
  },

  social: {
    telegram: "https://t.me/markpourel",
    behance: "",
    instagram: "",
  },
} as const;
