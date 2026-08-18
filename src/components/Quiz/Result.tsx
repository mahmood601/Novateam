import { createMemo, createResource, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  getSubjectStats,
  getWeakQuestions,
} from "../../services/local/indexeddb";
import { resetQuizState } from "./quizStore";

export default function Result(props: {
  subject: string;
  section: string;
  answers: any[];
}) {
  const navigate = useNavigate();

  const stats = createMemo(() => {
    const correct = props.answers.filter((a) => a.answer).length;
    const total = props.answers.length;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, wrong: total - correct, rate };
  });

  const [allTimeStats] = createResource(() => getSubjectStats(props.subject));
  const [weakQuestions] = createResource(() =>
    getWeakQuestions(props.subject, 5),
  );

  const rateColor = () => {
    const r = stats().rate;
    if (r >= 80) return "text-green-500";
    if (r >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div
      class="min-h-screen overflow-y-auto bg-gray-50 p-5 dark:bg-slate-900"
      dir="rtl"
    >
      <div class="mx-auto max-w-md space-y-4">
        {/* ─── النتيجة الرئيسية ─── */}
        <div class="rounded-3xl bg-white p-6 text-center shadow-sm dark:bg-slate-800">
          <h2 class="mb-4 text-xl font-bold">نتيجة الجلسة</h2>

          {/* دائرة النسبة */}
          <div class="relative mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
            <span class={`text-3xl font-black ${rateColor()}`}>
              {stats().rate}%
            </span>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-2xl bg-gray-50 p-3 dark:bg-slate-700">
              <p class="text-2xl font-bold">{stats().total}</p>
              <p class="text-xs text-slate-400">إجمالي</p>
            </div>
            <div class="rounded-2xl bg-green-50 p-3 dark:bg-green-900/20">
              <p class="text-2xl font-bold text-green-500">{stats().correct}</p>
              <p class="text-xs text-slate-400">صحيح</p>
            </div>
            <div class="rounded-2xl bg-red-50 p-3 dark:bg-red-900/20">
              <p class="text-2xl font-bold text-red-500">{stats().wrong}</p>
              <p class="text-xs text-slate-400">خطأ</p>
            </div>
          </div>
        </div>

        {/* ─── الإحصائيات الكلية للمادة ─── */}
        <Show when={allTimeStats()}>
          <div class="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-800">
            <h3 class="mb-3 flex items-center gap-2 font-bold">
              <span>📊</span> إجمالي المادة
            </h3>
            <div class="flex items-center gap-3">
              <div class="h-3 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                <div
                  class="bg-main h-full rounded-full transition-all"
                  style={{ width: `${allTimeStats()!.rate}%` }}
                />
              </div>
              <span class="text-sm font-bold">{allTimeStats()!.rate}%</span>
            </div>
            <p class="mt-2 text-xs text-slate-400">
              {allTimeStats()!.correct} صح من {allTimeStats()!.total} سؤال مجاب
            </p>
          </div>
        </Show>

        {/* ─── الأسئلة الصعبة ─── */}
        <Show when={weakQuestions() && weakQuestions()!.length > 0}>
          <div class="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-800">
            <h3 class="mb-3 flex items-center gap-2 font-bold">
              <span>🎯</span> تحتاج مراجعة
            </h3>
            <div class="space-y-2">
              <For each={weakQuestions()!}>
                {(q) => (
                  <div class="rounded-xl bg-red-50 p-3 text-sm dark:bg-red-900/10">
                    <p class="line-clamp-2 text-slate-700 dark:text-slate-300">
                      {q.question}
                    </p>
                  </div>
                )}
              </For>
            </div>
            <button
              onClick={() => navigate(`/${props.subject}/weak`)}
              class="border-main text-main mt-3 w-full rounded-full border-2 py-2 text-sm font-bold"
            >
              راجع كل الأسئلة الصعبة ←
            </button>
          </div>
        </Show>

        {/* ─── الأزرار ─── */}
        <div class="space-y-2 pb-6">
          <button
            onClick={() => {
              resetQuizState();
              navigate(`/${props.subject}/${props.section}`, { replace: true });
            }}
            class="bg-main w-full rounded-full py-3 text-sm font-bold text-white"
          >
            إعادة الاختبار
          </button>
          <button
            onClick={() => history.back()}
            class="w-full rounded-full border border-slate-200 py-3 text-sm dark:border-slate-600"
          >
            العودة للمادة
          </button>
        </div>
      </div>
    </div>
  );
}
