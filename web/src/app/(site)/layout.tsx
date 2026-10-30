import Script from "next/script";
import { CartProvider } from "@/lib/cart";
import { CatalogProvider } from "@/lib/catalog-context";
import { getCatalogData, getSiteContent } from "@/lib/content/get";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { AddedToast } from "@/components/AddedToast";
import { Tracker } from "@/components/Tracker";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Motion } from "@/components/Motion";

const YM_ID = process.env.NEXT_PUBLIC_YM_ID;

/** Публичный сайт: шапка, корзина, нижнее меню и аналитика. Страницы /stats и /admin живут отдельно. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  // Каталог и тексты из базы (кэш с тегом "catalog", сбрасывается при сохранении в админке).
  const [data, site] = await Promise.all([getCatalogData(), getSiteContent()]);
  return (
    <CatalogProvider data={data} site={site}>
      <CartProvider>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer contacts={site.contacts} legal={site.legal} />
        <BottomNav />
        <AddedToast />
        <InstallPrompt />
        <Motion />
        <Tracker />
        {YM_ID && (
          <Script id="ym" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(YM_ID)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
          </Script>
        )}
      </CartProvider>
    </CatalogProvider>
  );
}
