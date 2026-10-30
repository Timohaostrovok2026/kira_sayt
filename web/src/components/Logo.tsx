export function Logo({ className = "" }: { className?: string }) {
  return (
    // Улыбка — absolute: иначе Safari считает ширину блока по SVG (по умолчанию 300 px), блок шире слова
    // и проценты уводят улыбку вправо от «Улыбайся». Так проценты — строго от ширины слова.
    <span className={`relative inline-block pb-[7px] leading-none ${className}`} aria-label="Улыбайся">
      <span className="block font-display text-[22px] font-bold tracking-[-0.03em]">Улыбайся</span>
      <svg viewBox="0 0 120 14" className="absolute bottom-0 left-[38%] h-[9px] w-[54%]" aria-hidden="true">
        <path d="M3 3 Q60 22 117 3" fill="none" stroke="var(--color-rasp-400)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
