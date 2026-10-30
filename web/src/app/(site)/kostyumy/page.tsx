import type { Metadata } from "next";
import { CostumesCatalog } from "@/components/kostyumy/CostumesCatalog";

export const metadata: Metadata = {
  title: "Костюмы и герои",
  description:
    "110+ героев для детского праздника: принцессы, супергерои, Лабубу, Майнкрафт, щенки-спасатели и другие. Выберите любимого — он подойдёт к любой анимационной программе.",
  alternates: { canonical: "/kostyumy" },
};

export default function KostyumyPage() {
  return <CostumesCatalog />;
}
