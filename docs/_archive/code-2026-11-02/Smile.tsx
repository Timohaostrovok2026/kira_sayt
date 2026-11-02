/**
 * Фирменный разделитель-«улыбка» между тёмной сценой и светлым разделом.
 * Рисуется цветом соседнего раздела (fill-* в className), сцена прогибается к центру, как улыбка.
 */
export function Smile({ edge, className = "" }: { edge: "top" | "bottom"; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      className={`pointer-events-none block h-6 w-full md:h-10 ${edge === "bottom" ? "-mb-px" : "-mt-px"} ${className}`}
    >
      <path d={edge === "bottom" ? "M0 0Q720 128 1440 0V65H0Z" : "M0-1H1440V0Q720 128 0 0Z"} />
    </svg>
  );
}
