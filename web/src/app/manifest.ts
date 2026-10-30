import type { MetadataRoute } from "next";

/** Манифест: сайт можно добавить на экран «Домой» и открывать как приложение, без адресной строки. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Улыбайся — детские праздники",
    short_name: "Улыбайся",
    description: "Соберите детский праздник за пару минут: герои, шоу, квесты. Цены на сайте, заявка в один клик.",
    lang: "ru",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Цвет сцены — без белой вспышки на заставке при запуске.
    background_color: "#220006",
    theme_color: "#220006",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Собрать праздник",
        short_name: "Собрать",
        url: "/sobrat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Корзина",
        url: "/korzina",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
