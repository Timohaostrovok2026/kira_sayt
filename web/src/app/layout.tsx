import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Onest, Unbounded } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Улыбайся — детские праздники в Москве: аниматоры, шоу, квесты",
    template: "%s · Улыбайся",
  },
  description:
    "Соберите детский праздник за пару минут: 110+ героев, квесты, крио- и бумажное шоу, мастер-классы. Цены на сайте, заявка в один клик. Москва и область.",
  applicationName: "Улыбайся",
  // На iPhone с экрана «Домой» открывается без адресной строки, как приложение.
  appleWebApp: { capable: true, title: "Улыбайся", statusBarStyle: "black" },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Улыбайся",
    images: ["/img/photos/ded-moroz.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#220006",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${onest.variable}`}>
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
