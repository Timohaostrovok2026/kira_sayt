import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";

/**
 * Заголовок, слова которого проявляются по очереди (CSS .split-word, задержка по --i).
 * Экранный диктор читает целую фразу из sr-only копии, а нарезку на слова пропускает —
 * иначе VoiceOver останавливается на каждом слове.
 */
export function splitWords(node: ReactNode): ReactNode {
  return (
    <>
      <span className="sr-only">{node}</span>
      <span aria-hidden="true">{split(node, { i: 0 })}</span>
    </>
  );
}

/** Вложенные элементы (<span className="text-rasp-300">…</span>) сохраняются. Неразрывный пробел не режем. */
function split(node: ReactNode, counter: { i: number }): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return String(child)
        .split(/([ \t\n]+)/)
        .map((part, k) =>
          !part || /^[ \t\n]+$/.test(part) ? (
            part
          ) : (
            <span key={k} className="split-word" style={{ "--i": counter.i++ } as CSSProperties}>
              {part}
            </span>
          ),
        );
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children != null) {
      return cloneElement(child, undefined, split(child.props.children, counter));
    }
    return child;
  });
}
