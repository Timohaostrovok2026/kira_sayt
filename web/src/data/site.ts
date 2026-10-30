/**
 * Тексты сайта: типы и начальное наполнение. Актуальные значения — в базе (админка → «Тексты и контакты»).
 * На сервере: getSiteContent(), в клиентских компонентах: useSite().
 */

export interface Contacts {
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  telegram: string;
  telegramHandle: string;
  channel: string;
  channelHandle: string;
  instagram: string;
  instagramHandle: string;
  owner: string;
  geo: string;
}

export interface TrustStat {
  value: number;
  suffix: string;
  label: string;
}

export interface Step {
  title: string;
  text: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface GalleryItem {
  src: string;
  alt: string;
  tag?: string;
}

export interface Review {
  name: string;
  date: string;
  text: string;
  source: string;
}

export interface SiteContent {
  contacts: Contacts;
  stats: TrustStat[];
  steps: Step[];
  faq: FaqItem[];
  /** Фото с праздников (порядок = порядок на сайте). */
  gallery: GalleryItem[];
  reviews: Review[];
  yandexRating: string;
  yandexReviewsCount: number;
  yandexUrl: string;
  /** Юридическая строка в подвале. */
  legal: string;
}

const ev = (name: string, alt: string): GalleryItem => ({ src: `/img/events/${name}.webp`, alt });

export const SITE_SEED: SiteContent = {
  contacts: {
    phone: "+7 977 593-97-39",
    phoneRaw: "+79775939739",
    whatsapp: "https://wa.me/79775939739",
    telegram: "https://t.me/kkmochalov",
    telegramHandle: "@kkmochalov",
    channel: "https://t.me/smilebykirillmochalov",
    channelHandle: "@smilebykirillmochalov",
    instagram: "https://instagram.com/ssmilemoscow",
    instagramHandle: "@ssmilemoscow",
    owner: "Кирилл Мочалов",
    geo: "Москва и Московская область",
  },
  stats: [
    { value: 5, suffix: "+", label: "лет делаем праздники" },
    { value: 1700, suffix: "+", label: "мероприятий проведено" },
    { value: 110, suffix: "+", label: "героев и костюмов" },
    { value: 30, suffix: "+", label: "программ на любой возраст" },
  ],
  steps: [
    { title: "Соберите праздник", text: "Программа, шоу и допы в корзину. Или готовый пакет." },
    { title: "Отправьте заявку", text: "Одна кнопка. Менеджер получит всё сразу, без созвонов." },
    { title: "Закрепим дату", text: "Уточним детали в мессенджере и забронируем артистов." },
    { title: "Празднуем", text: "Приезжаем вовремя, проводим, дети в восторге." },
  ],
  faq: [
    {
      q: "Сколько стоит выезд за МКАД?",
      a: "1 500 ₽ за выезд плюс 100 ₽ за каждый километр от МКАД. Калькулятор есть прямо в корзине.",
    },
    {
      q: "Нужен ли свой звук?",
      a: "Нет, обычный звук входит в любой праздник. Усиленный (JBL PartyBox 110 и 2 микрофона) нужен, если детей много или праздник на улице, и обязателен для бумажного шоу.",
    },
    {
      q: "Какие костюмы бывают?",
      a: "Больше 110 героев: от Деда Мороза и принцесс до Человека-паука и героев игр. Костюм героя входит в стоимость программы.",
    },
    {
      q: "Кто артисты?",
      a: "Молодая команда 19–23 лет. Энергия, современный вкус и общий язык и с малышами, и с подростками.",
    },
    {
      q: "Как забронировать дату?",
      a: "Соберите праздник и отправьте заявку. Менеджер подтвердит наличие артистов и точную стоимость в течение дня.",
    },
    {
      q: "Цены на сайте окончательные?",
      a: "Это ориентир. Точную сумму подтвердим после заявки: она зависит от даты, количества детей и места.",
    },
  ],
  gallery: [
    ev("cryo-show", "Крио-шоу"),
    ev("hatter-balloons", "Шляпник и шарики"),
    ev("transformers-kids", "Бамблби и Оптимус"),
    ev("birthday-cake-girl", "Торт и именинница"),
    ev("mascots-kids-outdoor", "Барбоскины на природе"),
    ev("fire-trick", "Огненный фокус"),
    ev("shake-show", "Шейкер-шоу"),
    ev("trashbox-puppy", "Трэш-бокс"),
    ev("cat-mascot-toddler", "Котик и малыш"),
    ev("photozone", "Фотозона"),
    ev("party-kids-laugh", "Вечеринка"),
    ev("group-outdoor", "Большой праздник"),
    ev("cake-boy", "Задуваем свечи"),
    ev("barboskiny-host", "Барбоскины"),
    ev("party-table", "Стол именинницы"),
    ev("terrace-group", "Квест на террасе"),
  ],
  reviews: [
    {
      name: "Антон П.",
      date: "21 сентября",
      text: "Не в первый раз обращаюсь к Кириллу и каждый раз и дети, и мы, родители, остаемся довольными! Спасибо Кириллу и его сотруднику Дане! Кириллу за прекрасную организацию, Дане за креативность, ответственность и терпение! Прекрасный праздник вам гарантирован с этой командой!",
      source: "Яндекс Карты",
    },
    {
      name: "Дина К.",
      date: "7 апреля",
      text: "Кирилл просто невероятно харизматичный молодой человек! Умеет наладить контакт с детьми в два счета, очаровывает родителей! Праздник с ним это волшебство!",
      source: "Яндекс Карты",
    },
    {
      name: "Ангелина А.",
      date: "7 апреля",
      text: "Приглашала Кирилла в садик на день рождения. Отлично провел анимацию. Дети счастливы. Уделил время имениннику. Сам связался с садиком и определил время вызова. Анимация час. Все супер. На высшем уровне. Профи своего дела. Дальше праздники только с его командой!",
      source: "Яндекс Карты",
    },
    {
      name: "Михаил Б.",
      date: "25 февраля",
      text: "Великолепно. Компания детишек не первый раз заказывает шоу. Заказывали шоу для детей 10 лет, поучаствовали все, бабушка в восторге. Все вовремя, аккуратно, каждому участнику отдельное внимание. Открытый и приятный человек. Огромное спасибо за прекрасный праздник! P.S. Заказывайте на большие праздники заранее — плотный график.",
      source: "Яндекс Карты",
    },
  ],
  yandexRating: "5.0",
  yandexReviewsCount: 27,
  yandexUrl: "https://yandex.ru/maps/org/147696258349/reviews/",
  legal: "Мочалов Кирилл Алексеевич · ИНН 614707637482",
};

/** Сезон определяет первый экран и подборку «Хиты сезона». */
export function currentSeason(d = new Date()) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (m === 10 || (m === 11 && day <= 2)) return "halloween" as const;
  if (m >= 11 || m === 1) return "newyear" as const;
  if (m >= 4 && m <= 6) return "graduation" as const;
  return "birthday" as const;
}
export type Season = ReturnType<typeof currentSeason>;
