import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/content/get";
import { SITE_URL } from "@/lib/site-url";

// Разделы и видимые программы из каталога; скрытые в админке сюда не попадают (buildCatalog их отфильтровывает).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { programs } = await getCatalog();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/sobrat`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/pakety`, changeFrequency: "weekly", priority: 0.9 },
  ];
  return [
    ...pages,
    ...programs.map((p) => ({ url: `${SITE_URL}/programmy/${p.id}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
