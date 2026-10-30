"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Share, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/track";

/** Событие Chrome/Яндекс.Браузера перед установкой — в стандартных типах DOM его нет. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const HIDE_KEY = "uly-pwa-hide-until";
const VISITS_KEY = "uly-pwa-visits";
const SESSION_KEY = "uly-pwa-counted";
const HIDE_MS = 30 * 24 * 60 * 60 * 1000;
const FIRST_DELAY = 20_000;
const REPEAT_DELAY = 4_000;

// Только страницы без своих липких панелей снизу: в конструкторе, программе, костюмах и корзине
// плашка закрыла бы кнопку «Оформить» / «В корзину».
const PAGES = new Set(["/", "/pakety"]);

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function hiddenNow() {
  try {
    return Number(localStorage.getItem(HIDE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function hideForMonth() {
  try {
    localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_MS));
  } catch {}
}

/** Номер визита: считаем один раз за сессию вкладки. */
function visitNumber() {
  try {
    let n = Number(localStorage.getItem(VISITS_KEY) ?? 0);
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      n += 1;
      localStorage.setItem(VISITS_KEY, String(n));
    }
    return n;
  } catch {
    return 1;
  }
}

/** iPhone/iPad, где «На экран Домой» есть в меню «Поделиться». Во встроенных браузерах соцсетей его нет. */
function isIosWithShare() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && !/FBAN|FBAV|Instagram|Line\/|VKClient|MicroMessenger/.test(ua);
}

/** Плашка «Добавьте на экран» для телефона: Android — системный диалог, iOS — короткая инструкция. */
export function InstallPrompt() {
  const path = usePathname();
  const { notice } = useCart();
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Установку считаем всегда — даже если плашку закрыли и поставили через меню браузера.
    const onInstalled = () => {
      track("pwa_installed");
      setDeferred(null);
      setClosed(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    if (isStandalone() || hiddenNow()) return () => window.removeEventListener("appinstalled", onInstalled);

    // preventDefault — чтобы вместо системной полоски показать свою плашку в нужный момент.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = setTimeout(
      () => {
        // Событие могло прийти до загрузки React — его ловит ранний скрипт в app/layout.tsx.
        const early = (window as Window & { __bip?: InstallEvent }).__bip;
        if (early) setDeferred((d) => d ?? early);
        setIos(isIosWithShare());
        setReady(true);
      },
      visitNumber() > 1 ? REPEAT_DELAY : FIRST_DELAY,
    );
    return () => {
      clearTimeout(t);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const visible = ready && !closed && !notice && PAGES.has(path) && (deferred !== null || ios);

  const dismiss = useCallback(() => {
    hideForMonth();
    setClosed(true);
  }, []);

  useEffect(() => {
    if (help) helpRef.current?.focus();
  }, [help]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (help) {
        setHelp(false);
        // Кнопка «Установить» вернётся после перерисовки — фокус на неё.
        requestAnimationFrame(() => btnRef.current?.focus());
      } else setClosed(true); // Esc прячет до следующего визита, без «на месяц»
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, help]);

  async function install() {
    if (!deferred) {
      setHelp(true);
      return;
    }
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // Отказались в системном окне — не напоминаем месяц.
      if (outcome === "dismissed") hideForMonth();
    } catch {}
    // Событие одноразовое: повторно prompt() вызвать нельзя.
    setDeferred(null);
    setClosed(true);
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+8px)] z-30 mx-auto max-w-md animate-rise lg:hidden">
      <div className="rounded-[22px] border border-white/10 bg-rasp-950/90 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
            Добавьте «Улыбайся» на экран — откроется как приложение
          </p>
          <button
            type="button"
            onClick={dismiss}
            data-track="pwa_dismiss"
            aria-label="Закрыть"
            className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {help && (
          <div
            ref={helpRef}
            role="dialog"
            aria-label="Как добавить сайт на экран «Домой»"
            tabIndex={-1}
            className="mt-3 rounded-2xl bg-white/10 p-3 text-[15px] leading-snug outline-none"
          >
            <p className="flex flex-wrap items-center gap-x-1.5">
              1. Нажмите «Поделиться»
              <Share size={18} className="text-rasp-300" aria-hidden="true" />
              <span className="text-white/70">(внизу Safari или в меню «•••»)</span>
            </p>
            <p className="mt-1.5">2. Выберите «На экран „Домой“»</p>
          </div>
        )}

        <div className="mt-3 flex">
          {help ? (
            <button type="button" onClick={dismiss} data-track="pwa_ios_done" className="btn btn-light btn-sm flex-1">
              Понятно
            </button>
          ) : (
            <button
              ref={btnRef}
              type="button"
              onClick={install}
              data-track="pwa_install"
              aria-haspopup={deferred ? undefined : "dialog"}
              className="btn btn-light btn-sm flex-1"
            >
              Установить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
