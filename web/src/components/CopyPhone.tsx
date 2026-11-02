"use client";

import { useState } from "react";

/** «Скопировать номер» в подвале: на ноутбуке tel: не звонит, номер удобнее вставить. */
export function CopyPhone({ phone }: { phone: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      data-track="footer_copy_phone"
      onClick={() => {
        navigator.clipboard?.writeText(phone).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }, () => {});
      }}
    >
      {done ? "Номер скопирован" : "Скопировать номер"}
    </button>
  );
}
