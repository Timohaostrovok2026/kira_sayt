import type { ReactNode } from "react";

export const fmtNum = (n: number) => Math.round(n).toLocaleString("ru-RU");

export function pct(x: number, digits = 0) {
  const v = x * 100;
  return `${v.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}

export function Panel({
  title,
  hint,
  children,
  className = "",
  id,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const hid = id ? `${id}-title` : undefined;
  return (
    <section className={`card p-4 sm:p-5 ${className}`} aria-labelledby={hid} id={id}>
      <h2 id={hid} className="h-card text-[17px]">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Empty({ children = "Пока нет данных за этот период" }: { children?: ReactNode }) {
  return <p className="rounded-2xl bg-paper px-4 py-6 text-center text-[14px] text-ink-soft">{children}</p>;
}
