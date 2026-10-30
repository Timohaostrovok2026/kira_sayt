export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className}`} aria-label="Улыбайся">
      <span className="font-display text-[22px] font-bold tracking-[-0.03em]">Улыбайся</span>
      <svg viewBox="0 0 120 14" className="-mt-0.5 ml-[38%] h-[9px] w-[54%]" aria-hidden="true">
        <path d="M3 3 Q60 22 117 3" fill="none" stroke="var(--color-rasp-400)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
