import type { Metadata } from "next";
import { PackagesView } from "@/components/pakety/PackagesView";

export const metadata: Metadata = {
  title: "Пакеты",
  description:
    "Готовые пакеты детского праздника: анимация, шоу, квест, съёмка и шар-сюрприз. Пакет всегда дешевле, чем те же позиции по отдельности.",
};

export default function PaketyPage() {
  return <PackagesView />;
}
