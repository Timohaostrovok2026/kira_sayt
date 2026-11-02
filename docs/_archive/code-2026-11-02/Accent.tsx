/** Акцентное слово заголовка: Nauryz, цвет по фону (DESIGN.md §3). Одно на заголовок. */
export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="accent">{children}</span>;
}
