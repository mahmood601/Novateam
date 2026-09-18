import { createResource, createSignal, For, Show, Suspense } from "solid-js";
import {
  getAnswers,
  getFavorites,
  getSubjectsOfflineFirst,
} from "../../quizzes/services/local/indexeddb";
import {
  calcStreak,
  countActiveDays,
} from "../../quizzes/services/local/streak";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubjectStat = {
  id: string;
  name: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildStats() {
  const subjects = await getSubjectsOfflineFirst(localStorage.getItem("year")!);
  const subjectIds = subjects.map((subject) => subject.id);

  const allAnswers = await Promise.all(subjectIds.map((id) => getAnswers(id)));
  const allFavorites = await getFavorites();

  const subjectStats: SubjectStat[] = subjectIds
    .map((id, i) => {
      const answers = allAnswers[i];
      const correct = answers.filter((a) => a.answer).length;
      const total = answers.length;
      return {
        id,
        name: subjects[i]?.name ?? id,
        total,
        correct,
        wrong: total - correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalAnswered = subjectStats.reduce((s, x) => s + x.total, 0);
  const totalCorrect = subjectStats.reduce((s, x) => s + x.correct, 0);
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // streak: أيام متتالية حقيقية من activity_days
  const streak = calcStreak();
  const activeDays = countActiveDays();

  return {
    subjectStats,
    totalAnswered,
    totalCorrect,
    overallAccuracy,
    favoritesCount: allFavorites.length,
    streak,
    activeDays,
  };
}

// ─── Ring Chart ───────────────────────────────────────────────────────────────

function RingChart(props: { value: number; size?: number }) {
  const size = props.size ?? 120;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (props.value / 100) * circ;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        stroke-width="10"
        class="text-darker-light-2 dark:text-lighter-dark-2"
        opacity="0.4"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-main)"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray={`${filled} ${circ}`}
        style={{
          transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </svg>
  );
}

// ─── Mini Bar ─────────────────────────────────────────────────────────────────

function MiniBar(props: { correct: number; wrong: number }) {
  const total = () => props.correct + props.wrong;
  const correctPct = () => (total() > 0 ? (props.correct / total()) * 100 : 0);

  return (
    <div class="bg-darker-light-2 dark:bg-lighter-dark-2 h-2 w-full overflow-hidden rounded-full">
      <div
        class="bg-true h-full rounded-full transition-all duration-700"
        style={{ width: `${correctPct()}%` }}
      />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard(props: {
  label: string;
  value: string | number;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div
      class="dark:bg-lighter-dark-1 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-sm"
      classList={{ "ring-2 ring-main/30": props.accent }}
    >
      <span class="text-2xl">{props.icon}</span>
      <span
        class="text-2xl font-bold"
        classList={{ "text-main": !!props.accent }}
      >
        {props.value}
      </span>
      <span class="text-center text-xs text-gray-400">{props.label}</span>
    </div>
  );
}

// ─── Subject Row ──────────────────────────────────────────────────────────────

function SubjectRow(props: { stat: SubjectStat; rank: number }) {
  const [open, setOpen] = createSignal(false);

  const accentColor = () => {
    if (props.stat.accuracy >= 80) return "text-true";
    if (props.stat.accuracy >= 50) return "text-secondary";
    return "text-warn";
  };

  return (
    <div
      class="dark:bg-lighter-dark-1 cursor-pointer rounded-2xl bg-white shadow-sm transition-all duration-200 select-none"
      classList={{ "ring-2 ring-main/20": open() }}
      onClick={() => setOpen(!open())}
    >
      <div class="flex items-center gap-3 p-4">
        {/* rank */}
        <span class="text-main w-6 shrink-0 text-center text-sm font-bold opacity-50">
          {props.rank}
        </span>

        {/* name + bar */}
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold dark:text-white" dir="rtl">
            {props.stat.name}
          </p>
          <div class="mt-1.5">
            <MiniBar correct={props.stat.correct} wrong={props.stat.wrong} />
          </div>
        </div>

        {/* accuracy */}
        <span class={`shrink-0 text-sm font-bold ${accentColor()}`}>
          {props.stat.accuracy}%
        </span>

        {/* chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          class="shrink-0 text-gray-300 transition-transform duration-200"
          style={{
            transform: open() ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path
            fill="currentColor"
            d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"
          />
        </svg>
      </div>

      {/* expanded detail */}
      <Show when={open()}>
        <div class="dark:border-lighter-dark-2 border-t border-gray-100 px-5 pt-3 pb-4">
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-lg font-bold dark:text-white">
                {props.stat.total}
              </p>
              <p class="text-xs text-gray-400">إجمالي</p>
            </div>
            <div>
              <p class="text-true text-lg font-bold">{props.stat.correct}</p>
              <p class="text-xs text-gray-400">صحيح</p>
            </div>
            <div>
              <p class="text-warn text-lg font-bold">{props.stat.wrong}</p>
              <p class="text-xs text-gray-400">خطأ</p>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div class="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div class="text-6xl opacity-30">📊</div>
      <p class="text-lg font-bold text-gray-400">لا توجد إحصائيات بعد</p>
      <p class="text-sm text-gray-300">ابدأ اختباراً لترى تقدمك هنا</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [data] = createResource(buildStats);

  return (
    <div
      class="dark:bg-main-dark bg-darker-light-1 flex h-dvh flex-col overflow-hidden px-5 pt-14"
      dir="rtl"
    >
      {/* Header */}
      <div class="flex-1 py-5 tracking-wide">
        <h1 class="text-2xl font-bold dark:text-white">إحصائياتك</h1>
        <p class="mt-1 text-sm text-gray-400">تتبع مستوى تقدمك في كل مادة</p>
      </div>

      <Suspense
        fallback={
          <div class="flex items-center justify-center py-20 overflow-auto">
            <div class="text-main h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent" />
          </div>
        }
      >
        <div class="mb-24 flex w-full flex-col gap-2 overflow-y-auto">
          {" "}
          <Show when={data()} keyed>
            {(stats) => (
              <Show when={stats.totalAnswered > 0} fallback={<EmptyState />}>
                {/* Overall ring */}
                <div class="dark:bg-lighter-dark-1 mb-4 shrink-0 flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm">
                  <div class="flex-1" dir="rtl">
                    <p class="text-sm text-gray-400">الدقة الإجمالية</p>
                    <p class="text-main text-4xl font-bold">
                      {stats.overallAccuracy}%
                    </p>
                    <p class="mt-1 text-xs text-gray-400">
                      {stats.totalCorrect} صح من {stats.totalAnswered} سؤال
                    </p>
                  </div>
                  <div class="relative flex items-center justify-center">
                    <RingChart value={stats.overallAccuracy} size={110} />
                    <span class="absolute text-sm font-bold dark:text-white">
                      {stats.overallAccuracy}%
                    </span>
                  </div>
                </div>

                {/* Summary grid */}
                <div class="mb-6 grid grid-cols-2 gap-3 shrink-0">
                  <StatCard
                    label="أسئلة مجابة"
                    value={stats.totalAnswered}
                    icon="✏️"
                    accent
                  />
                  <StatCard
                    label="محفوظة"
                    value={stats.favoritesCount}
                    icon="❤️"
                  />
                  <StatCard
                    label="أيام نشاط"
                    value={stats.activeDays}
                    icon="📅"
                  />
                  <StatCard
                    label={
                      stats.streak > 1
                        ? `${stats.streak} أيام متتالية 🔥`
                        : "سلسلة الأيام"
                    }
                    value={stats.streak}
                    icon="🔥"
                    accent={stats.streak >= 3}
                  />
                </div>

                {/* Subject list */}
                <div class="mb-3 flex items-center justify-between">
                  <p class="text-sm font-bold text-gray-400">تفصيل المواد</p>
                  <p class="text-xs text-gray-300">
                    {stats.subjectStats.length} مادة
                  </p>
                </div>

                <div class="flex flex-col gap-3">
                  <For each={stats.subjectStats}>
                    {(s, i) => <SubjectRow stat={s} rank={i() + 1} />}
                  </For>
                </div>

                {/* Best subject callout */}
                <Show
                  when={
                    stats.subjectStats.length > 0 &&
                    stats.subjectStats.reduce((best, s) =>
                      s.accuracy > best.accuracy ? s : best,
                    )
                  }
                  keyed
                >
                  {(best) => (
                    <div class="bg-true/10 mt-6 rounded-3xl p-5 text-center">
                      <p class="text-xs text-gray-400">أفضل مادة</p>
                      <p class="text-true mt-1 font-bold" dir="rtl">
                        {best.name}
                      </p>
                      <p class="text-true text-2xl font-bold">
                        {best.accuracy}%
                      </p>
                    </div>
                  )}
                </Show>
              </Show>
            )}
          </Show>
        </div>
      </Suspense>
    </div>
  );
}
