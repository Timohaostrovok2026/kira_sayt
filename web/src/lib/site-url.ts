/** Основной адрес сайта: метатеги, robots.txt, sitemap.xml. На сервере задаётся в /etc/ulybaysya.env при сборке. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
