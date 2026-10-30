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
  async headers() {
    // Фото из комплекта сайта меняются редко: сутки берём из кэша браузера, потом тихо проверяем обновление.
    return [
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
