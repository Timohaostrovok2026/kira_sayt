"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPhone, phoneValid, todayIso } from "./lead";

/** Поля заявки (черновик Кирилла v11). Значения живут в корзине (useCart().state.form), поэтому переживают перезагрузку. */
export function LeadForm({ showErrors, phoneRef }: { showErrors: boolean; phoneRef: React.Ref<HTMLInputElement> }) {
  const { state, setForm } = useCart();
  const f = state.form;
  const [minDate] = useState(todayIso);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneErr = (showErrors || phoneTouched) && !phoneValid(f.phone) ? "Проверьте номер: нужно 10 цифр после +7" : undefined;

  return (
    <div className="grid gap-3">
      <div className="two">
        <div className="f">
          <label htmlFor="lead-age">Возраст ребёнка</label>
          <input
            id="lead-age"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            placeholder="7 лет"
            value={f.childAge}
            onChange={(e) => setForm({ childAge: e.target.value })}
          />
        </div>
        <div className="f">
          <label htmlFor="lead-date">Дата праздника</label>
          <input id="lead-date" type="date" min={minDate} value={f.date} onChange={(e) => setForm({ date: e.target.value })} />
        </div>
      </div>
      <div className="f">
        <label htmlFor="lead-place">Город и место</label>
        <input
          id="lead-place"
          type="text"
          autoComplete="address-level2"
          placeholder="Москва, дом или площадка"
          value={f.place}
          onChange={(e) => setForm({ place: e.target.value })}
        />
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor="lead-name">Ваше имя</label>
          <input id="lead-name" type="text" autoComplete="given-name" autoCapitalize="words" value={f.name} onChange={(e) => setForm({ name: e.target.value })} />
        </div>
        <div className="f">
          <label htmlFor="lead-phone">
            Телефон <em>обязательно</em>
          </label>
          <input
            ref={phoneRef}
            id="lead-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="+7 (___) ___-__-__"
            aria-invalid={!!phoneErr}
            aria-describedby={phoneErr ? "lead-phone-err" : undefined}
            value={f.phone}
            onChange={(e) => setForm({ phone: formatPhone(e.target.value) })}
            onBlur={() => f.phone && setPhoneTouched(true)}
            className={`num${phoneErr ? " bad" : ""}`}
          />
          {phoneErr && (
            <p id="lead-phone-err" role="alert" className="ferr">
              {phoneErr}
            </p>
          )}
        </div>
      </div>
      <div className="f">
        <label htmlFor="lead-note">Пожелания</label>
        <textarea
          id="lead-note"
          autoComplete="off"
          placeholder="Сколько детей, любимые герои, что важно"
          value={f.note}
          onChange={(e) => setForm({ note: e.target.value })}
        />
      </div>
    </div>
  );
}
