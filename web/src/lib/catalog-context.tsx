"use client";

import { createContext, useContext, useMemo } from "react";
import { buildCatalog, type Catalog, type CatalogData } from "@/data/catalog";
import type { SiteContent } from "@/data/site";

const Ctx = createContext<{ cat: Catalog; site: SiteContent } | null>(null);

/** Каталог и тексты из базы для клиентских компонентов. Данные приходят с сервера в layout. */
export function CatalogProvider({ data, site, children }: { data: CatalogData; site: SiteContent; children: React.ReactNode }) {
  const value = useMemo(() => ({ cat: buildCatalog(data), site }), [data, site]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog(): Catalog {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog outside CatalogProvider");
  return c.cat;
}

export function useSite(): SiteContent {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSite outside CatalogProvider");
  return c.site;
}
