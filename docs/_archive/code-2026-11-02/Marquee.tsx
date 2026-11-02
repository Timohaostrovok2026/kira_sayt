/**
 * Бегущая строка «Улыбайся by Kirill Mochalov» — подпись бренда из черновика Кирилла (вариант Б, DESIGN.md §5).
 * Одна на сайте, внизу первого экрана. Две одинаковые половины: сдвиг на −50% замыкает круг без шва.
 */
// 10 повторов: половина ленты (~3300 px) шире самых широких экранов — без пустого хвоста.
const ITEMS = Array.from({ length: 10 });

function Half() {
  return (
    <span className="flex shrink-0 items-center">
      {ITEMS.map((_, i) => (
        <span key={i} className="flex items-center gap-3 px-5">
          <span className="font-accent text-[22px] leading-none md:text-[26px]">Улыбайся</span>
          <span className="eyebrow">by Kirill Mochalov</span>
          <span aria-hidden="true" className="ml-5 text-[14px]">✦</span>
        </span>
      ))}
    </span>
  );
}

export function Marquee() {
  return (
    <div aria-hidden="true" className="relative -mx-2 rotate-[-2deg] md:rotate-[-1deg] bg-lime py-2.5 text-ink shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)]">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <Half />
        <Half />
      </div>
    </div>
  );
}
