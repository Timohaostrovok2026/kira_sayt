import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Корзина у каждого своя — в поиске ей делать нечего; админка, статистика и API закрыты и так, но роботу незачем туда стучаться.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/stats", "/api/", "/korzina"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
