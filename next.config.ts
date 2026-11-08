import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Готовит минимальный сервер для контейнера (этап 2) и Timeweb.
  output: "standalone",
  // Не раскрываем фреймворк в заголовках ответа.
  poweredByHeader: false,
  // Настройки ниже — дефолты create-next-app для Next 16, не «наши» оптимизации.
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
