import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { BarChart3, LogOut, Settings2 } from "lucide-react";
import { logout } from "@/app/stats/actions";
import { isAuthed, statsPassword } from "@/lib/auth";
import { loadStats } from "@/lib/stats/load";
import { mskTime, parsePeriod, PERIODS, type PeriodId } from "@/lib/stats/period";
import { plural } from "@/lib/format";
import { AutoRefresh } from "./AutoRefresh";
import { Funnel } from "./Funnel";
import { Kpis } from "./Kpis";
import { LeadsList } from "./LeadsList";
import { LiveToday } from "./LiveToday";
import { LoginForm } from "./LoginForm";
import { ScrollList, TopList } from "./TopList";
import { VisitorDonut } from "./VisitorDonut";
import { VisitsChart } from "./VisitsChart";
import { fmtNum, Panel, pct } from "./ui";

type SP = Promise<Record<string, string | string[] | undefined>>;

const PREV_LABEL = { today: "вчера", "7d": "прошлые 7 дн.", "30d": "прошлые 30 дн.", all: "" } as const;
const PERIOD_WORD = { today: "сегодня", "7d": "за 7 дней", "30d": "за 30 дней", all: "за всё время" } as const;

function Brand() {
  return (
    <Link href="/stats" className="flex items-center gap-2.5" aria-label="Улыбайся · Статистика">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rasp-500 text-white" aria-hidden>
        <BarChart3 size={20} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[17px] font-bold tracking-tight">Улыбайся</span>
        <span className="block text-[12.5px] font-semibold text-ink-soft">Статистика</span>
      </span>
    </Link>
  );
}

/** Своя верхняя панель: на /stats нет публичной шапки сайта. */
function TopBar({ children, tabs }: { children?: ReactNode; tabs?: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-5 border-b border-line bg-paper/90 px-4 backdrop-blur-xl md:-mx-8 md:px-8">
      <div className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 py-2">
        <Brand />
        {tabs && <div className="order-last w-full lg:order-none lg:ml-4 lg:w-auto">{tabs}</div>}
        <div className="ml-auto flex items-center gap-1">{children}</div>
      </div>
    </div>
  );
}

function PeriodTabs({ pid }: { pid: PeriodId }) {
  return (
    <nav aria-label="Период" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
      {PERIODS.map((p) => (
        <Link
          key={p.id}
          href={`/stats?p=${p.id}`}
          prefetch={false}
          scroll={false}
          aria-current={p.id === pid ? "page" : undefined}
          className="chip shrink-0 aria-[current=page]:bg-rasp-500 aria-[current=page]:text-white aria-[current=page]:shadow-none"
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}

function DevBanner() {
  return (
    <p className="mb-4 rounded-2xl bg-rasp-100 px-4 py-2.5 text-[13px] text-rasp-800">
      Режим разработки: пароль по умолчанию <b>uly-dev</b>. Для сервера задайте переменную STATS_PASSWORD.
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-10 font-display text-[19px] font-bold tracking-tight">{children}</h2>;
}

/** Всё, что зависит от запроса (куки, адрес, время, база), — внутри этого компонента под <Suspense>. */
export async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const pid = parsePeriod(sp.p);
  const cfg = statsPassword();

  if (!cfg) {
    return (
      <>
        <TopBar />
        <div className="card mx-auto max-w-md p-6 text-center">
          <h1 className="h-card">Статистика выключена</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            На сервере не задан пароль. Добавьте переменную окружения STATS_PASSWORD и перезапустите сайт.
          </p>
        </div>
      </>
    );
  }

  if (!(await isAuthed())) {
    return (
      <>
        <TopBar />
        <div className="py-6 sm:py-12">
          <LoginForm period={sp.p ? pid : undefined} devPassword={cfg.devDefault ? "uly-dev" : undefined} />
        </div>
      </>
    );
  }

  // Время и база — только при настоящем запросе, не при пререндере/префетче.
  await connection();
  const s = loadStats(pid);
  const { now, live } = s;

  const actions = (
    <>
      <span
        className="mr-1 hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold shadow-[inset_0_0_0_1.5px_var(--color-line)] sm:inline-flex"
        title="Активны за последние 5 минут"
      >
        <span className={`h-2 w-2 rounded-full ${live ? "bg-rasp-500" : "bg-ink-soft/30"}`} aria-hidden />
        {fmtNum(live)} на сайте
      </span>
      <AutoRefresh updatedAt={`обновлено ${mskTime(now)}`} />
      <Link
        href="/admin"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft hover:bg-rasp-50 hover:text-ink"
      >
        <Settings2 size={15} aria-hidden />
        Админка
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft hover:bg-rasp-50 hover:text-ink"
        >
          <LogOut size={15} aria-hidden />
          <span className="hidden sm:inline">Выйти</span>
          <span className="sr-only sm:hidden">Выйти</span>
        </button>
      </form>
    </>
  );

  if (s.empty) {
    return (
      <>
        <TopBar tabs={<PeriodTabs pid={pid} />}>{actions}</TopBar>
        {cfg.devDefault && <DevBanner />}
        <div className="card mx-auto max-w-lg p-8 text-center">
          <BarChart3 className="mx-auto text-rasp-300" size={40} aria-hidden />
          <h1 className="h-card mt-3">Данных пока нет</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Как только на сайт начнут заходить люди, здесь появятся посетители, клики, корзины и заявки. Обычно первые цифры
            видны через пару минут.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-4 rounded-2xl bg-paper p-3 text-[13px] text-ink-soft">
              Для демо локально: <code className="font-semibold text-ink">node scripts/seed-stats.mjs</code>
            </p>
          )}
        </div>
      </>
    );
  }

  const { exits, builder: b } = s;

  return (
    <>
      <TopBar tabs={<PeriodTabs pid={pid} />}>{actions}</TopBar>
      {cfg.devDefault && <DevBanner />}
      <h1 className="sr-only">Статистика сайта {PERIOD_WORD[pid]}</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title={`Кто зашёл ${PERIOD_WORD[pid]}`}
          hint="Уникальные посетители. Нажмите на строку, чтобы выделить группу."
          className="lg:col-span-2"
          id="segments"
        >
          <VisitorDonut data={s.segments} />
        </Panel>
        <TopList
          title="На что нажимали"
          hint="Кнопки, выбранные позиции и контакты"
          items={s.targets}
          empty="Пока никто ничего не нажимал"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <LiveToday live={live} hours={s.todayHours} now={now} />
        <VisitsChart points={s.series} bucket={s.period.bucket} now={now} />
        <div className="md:col-span-2 lg:col-span-1">
          <Funnel data={s.funnel} />
        </div>
      </div>

      <SectionTitle>Главные цифры</SectionTitle>
      <Kpis cur={s.kpi} prev={s.prevKpi} prevLabel={PREV_LABEL[pid]} />

      <SectionTitle>Куда ходят и где уходят</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TopList title="Популярные страницы" hint="Просмотры и число визитов" items={s.pages} />
        <TopList
          title="Где уходят"
          hint="Последняя страница визита и доля просмотров, после которых ушли"
          items={exits.items}
          footer={
            exits.sessions > 0 && (
              <>
                Посмотрели одну страницу и ушли: <b className="text-ink">{pct(exits.bounce)}</b> визитов
              </>
            )
          }
        />
        <TopList title="Все кнопки" hint="Подробно: каждая кнопка с меткой" items={s.clicks} />
      </div>

      <SectionTitle>Что выбирают</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TopList title="Самые добавляемые" hint="Добавления в корзину" items={s.added} />
        <TopList title="Популярные герои" hint="Открывали карточку и добавляли" items={s.heroes} />
        <TopList title="Что ищут" hint="Поиск по костюмам" items={s.searches} empty="Поиском пока не пользовались" />
        <TopList title="Разделы костюмов" hint="Какие вкладки открывают" items={s.cats} />
        <TopList title="Конструктор: шаги" hint="Сколько визитов дошли до шага" items={b.steps} limit={5} />
        <TopList
          title="Конструктор: возраст"
          items={b.ages}
          share
          footer={
            b.opens > 0 && (
              <>
                Открывали корзину: <b className="text-ink">{fmtNum(b.opens)}</b>{" "}
                {plural(b.opens, "визит", "визита", "визитов")}
              </>
            )
          }
        />
      </div>

      <SectionTitle>Кто и откуда</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TopList title="Откуда приходят" hint="Визиты по источникам" items={s.sources} share />
        <TopList title="Устройства" hint="Доля визитов" items={s.devices} share />
        <TopList title="Контакты" hint="Нажатия на телефон и мессенджеры" items={s.contacts} />
        <ScrollList rows={s.scroll} />
      </div>

      <div className="mt-10">
        <LeadsList leads={s.leads} />
      </div>
    </>
  );
}
