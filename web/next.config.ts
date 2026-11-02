import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Чтобы в режиме разработки сайт открывался с телефона в той же Wi-Fi сети.
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Сжатые копии крупных фото храним месяц: иначе сервер пережимает их заново каждые 4 часа и первый заход медленный.
    minimumCacheTTL: 2678400,
  },
  // Не подсказываем атакующему, на чём сделан сайт.
  poweredByHeader: false,
  async headers() {
    return [
      // Защитные заголовки на всё: чужой сайт не встроит наши страницы во фрейм (подмена кликов в админке),
      // браузер не угадывает тип файла, адрес страницы не утекает чужим сайтам, только HTTPS.
      // Когда подключим Вебвизор Метрики — разрешить фрейм для metrika.yandex.ru (он показывает сайт во фрейме).
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
      // Фото из комплекта сайта меняются редко: сутки берём из кэша браузера, потом тихо проверяем обновление.
      {
        source: "/img/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
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
