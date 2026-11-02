import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Raleway } from "next/font/google";
import localFont from "next/font/local";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Raleway — заголовки (900, капсом) и текст сайта по черновику Кирилла v11 (DESIGN.md §3).
const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin", "cyrillic"],
});

// Акцентное слово в заголовках, логотип, цифры и цены (DESIGN.md §3). Шрифт Red Keds — авторы заявляют бесплатное использование; «₽» в нём нет.
const nauryz = localFont({
  variable: "--font-nauryz",
  src: "./fonts/nauryz.woff",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Улыбайся — детские праздники в Москве: аниматоры, шоу, квесты",
    template: "%s · Улыбайся",
  },
  description:
    "Соберите детский праздник за пару минут: 100+ героев, квесты, крио- и бумажное шоу, мастер-классы. Цены на сайте, заявка в один клик. Москва и область.",
  applicationName: "Улыбайся",
  // На iPhone с экрана «Домой» открывается без адресной строки, как приложение.
  appleWebApp: { capable: true, title: "Улыбайся", statusBarStyle: "black" },
  // Иконки и картинка превью — файлами в app/ (favicon.ico, icon.png, apple-icon.png, opengraph-image.jpg).
  // Поле icons здесь не задавать: с ним Next молча выкидывает файловые иконки и во вкладке пусто.
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Улыбайся",
  },
};

export const viewport: Viewport = {
  themeColor: "#3a0522",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${raleway.variable} ${nauryz.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {children}
        {/* Android присылает «можно установить» рано, иногда до загрузки React: запоминаем событие для InstallPrompt */}
        <Script id="bip" strategy="beforeInteractive">
          {`addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__bip=e});`}
        </Script>
      </body>
    </html>
  );
}
