import type { Metadata } from "next";
import { Suspense } from "react";
import { Builder } from "@/components/sobrat/Builder";

export const metadata: Metadata = {
  title: "Соберите праздник",
  description: "Конструктор детского праздника: возраст, программа, шоу, мастер-классы и допы. Цены сразу, заявка в один клик.",
};

export default function SobratPage() {
  return (
    <>
      <h1 className="sr-only">Соберите праздник</h1>
      {/* Пока читаем параметры из URL — пустой розовый фон той же высоты, без прыжков. */}
      <Suspense fallback={<section className="sec sec--blush h-[80vh]" aria-hidden />}>
        <Builder />
      </Suspense>
    </>
  );
}
