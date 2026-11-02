"use client";

import { useState } from "react";
import { PackageCard } from "@/components/cards";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog-context";

export function HomePackages({ ids }: { ids: string[] }) {
  const { state, has, setPackageChoices } = useCart();
  const { packageById, packages } = useCatalog();
  // Если пакет с главной скрыли или удалили — подставляем следующие по порядку.
  const shown = [...ids.filter((id) => packageById[id]), ...packages.map((k) => k.id).filter((id) => !ids.includes(id))].slice(0, ids.length);
  const [choices, setChoices] = useState<Record<string, Record<number, string>>>({});
  return (
    <div className="rail lg:!mx-0 lg:!grid lg:!grid-flow-row lg:!grid-cols-3 lg:!px-0">
      {shown.map((id, i) => {
        const k = packageById[id];
        if (!k) return null;
        // Если пакет уже в корзине (например, собран на /pakety) — показываем его выбор, а не варианты по умолчанию.
        const ch = choices[id] ?? state.packages.find((p) => p.id === id)?.choices ?? {};
        return (
          <div key={id} className="flex w-[300px] sm:w-[340px] lg:w-auto [&>article]:flex-1">
            <PackageCard
              k={k}
              featured={i === 0}
              choices={ch}
              onChoose={(slot, ref) => {
                const next = { ...ch, [slot]: ref };
                setChoices((c) => ({ ...c, [id]: next }));
                if (has("package", id)) setPackageChoices(id, next);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
