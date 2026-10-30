import type { Metadata } from "next";
import { CartView } from "@/components/korzina/CartView";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Ваш праздник и заявка менеджеру в один клик.",
  robots: { index: false, follow: false },
};

export default function KorzinaPage() {
  return <CartView />;
}
