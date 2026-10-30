"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPhone, phoneValid, todayIso } from "./lead";

const INPUT =
  "block w-full min-h-14 rounded-2xl bg-white px-4 text-[17px] text-ink ring-1 ring-line outline-none transition-shadow placeholder:text-ink-soft/60 focus:ring-2 focus:ring-rasp-400";

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-1 text-[15px] font-bold">
        {label}
        {hint && <span className="ml-1.5 font-normal text-ink-soft">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="px-1 text-[14px] font-semibold text-rasp-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Поля заявки. Значения живут в корзине (useCart().state.form), поэтому переживают перезагрузку. */
export function LeadForm({ showErrors, phoneRef }: { showErrors: boolean; phoneRef: React.Ref<HTMLInputElement> }) {
  const { state, setForm } = useCart();
  const f = state.form;
  const [minDate] = useState(todayIso);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneErr =
    (showErrors || phoneTouched) && !phoneValid(f.phone)
      ? f.phone
        ? "Проверьте номер: нужно 10 цифр после +7"
        : "Оставьте телефон — без него не сможем ответить"
      : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="lead-name" label="Имя">
        <input
          id="lead-name"
          name="name"
          type="text"
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          placeholder="Как к вам обращаться"
          value={f.name}
          onChange={(e) => setForm({ name: e.target.value })}
          className={INPUT}
        />
      </Field>

      <Field id="lead-phone" label="Телефон" hint="обязательно" error={phoneErr}>
        <input
          ref={phoneRef}
          id="lead-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          required
          placeholder="+7 (___) ___-__-__"
          aria-invalid={!!phoneErr}
          aria-describedby={phoneErr ? "lead-phone-err" : undefined}
          value={f.phone}
          onChange={(e) => setForm({ phone: formatPhone(e.target.value) })}
          onBlur={() => f.phone && setPhoneTouched(true)}
          className={`${INPUT} tabular-nums ${phoneErr ? "ring-2 ring-rasp-500" : ""}`}
        />
      </Field>

      <Field id="lead-date" label="Дата праздника">
        <input
          id="lead-date"
          name="date"
          type="date"
          min={minDate}
          value={f.date}
          onChange={(e) => setForm({ date: e.target.value })}
          className={`${INPUT} appearance-none py-0 leading-[3.5rem] [&::-webkit-date-and-time-value]:text-left`}
        />
      </Field>

      <Field id="lead-age" label="Возраст ребёнка">
        <input
          id="lead-age"
          name="age"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          maxLength={20}
          placeholder="Например, 6"
          value={f.childAge}
          onChange={(e) => setForm({ childAge: e.target.value })}
          className={INPUT}
        />
      </Field>

      <Field id="lead-place" label="Город и место">
        <input
          id="lead-place"
          name="place"
          type="text"
          autoComplete="address-level2"
          enterKeyHint="next"
          placeholder="Москва, дома / кафе / студия"
          value={f.place}
          onChange={(e) => setForm({ place: e.target.value })}
          className={INPUT}
        />
      </Field>

      <div className="sm:col-span-2">
        <Field id="lead-note" label="Пожелания">
          <textarea
            id="lead-note"
            name="note"
            rows={3}
            autoComplete="off"
            placeholder="Сколько детей, любимые герои, во сколько начало…"
            value={f.note}
            onChange={(e) => setForm({ note: e.target.value })}
            className={`${INPUT} min-h-28 resize-y py-3.5 leading-snug`}
          />
        </Field>
      </div>
    </div>
  );
}
