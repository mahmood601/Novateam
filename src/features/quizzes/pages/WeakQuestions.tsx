/**
 * WeakQuestions.tsx
 * ─────────────────
 * صفحة الأسئلة الصعبة — تعرض الأسئلة التي أخطأ فيها المستخدم أكثر
 * مرتبة من الأصعب للأسهل مع عدد مرات الخطأ
 */

import { createResource, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import {
  getWeakQuestions,
  getSubjectStats,
  type Question,
} from "../services/local/indexeddb";
import { db } from "../services/local/indexeddb";
import LeftArrow from "../../shared/components/Icons/LeftArrow";
import Loading from "../../shared/components/Loading";

export default function WeakQuestionsPage() {
  const { subject } = useParams();
  const navigate = useNavigate();

  const [weakQuestions] = createResource(() => getWeakQuestions(subject, 50));
  const [stats] = createResource(() => getSubjectStats(subject));

  return (
    <div class="bg-main-light dark:bg-main-dark min-h-screen" dir="rtl">
      {/* Header */}
      <div class="sticky top-0 z-10  backdrop-blur-xl bg-surface-light/80 dark:bg-base-dark/80 border-b border-line-light dark:border-line-dark px-4 py-3">
        <div class="flex flex-row-reverse items-center justify-between">
          <button onClick={() => history.back()} class="p-1">
            <LeftArrow />
          </button>
          <h1 class="text-lg font-bold">الأسئلة الصعبة</h1>
          <Show when={stats()}>
            <span class="text-xs text-ink-muted-light">
              {stats()!.rate}% إجمالي
            </span>
          </Show>
        </div>
      </div>

      {/* Content */}
      <div class="p-4 space-y-3 pb-10">
        <Show
          when={!weakQuestions.loading}
          fallback={<Loading />}
        >
          <Show
            when={(weakQuestions()?.length ?? 0) > 0}
            fallback={
              <div class="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <span class="text-5xl">🎉</span>
                <p class="font-bold text-lg">ممتاز!</p>
                <p class="text-sm text-ink-muted-light">
                  لا توجد أسئلة صعبة بعد — استمر في المذاكرة
                </p>
                <button
                  onClick={() => navigate(`/${subject}`)}
                  class="bg-main rounded-full px-6 py-2 text-sm text-white mt-2"
                >
                  ابدأ اختباراً جديداً
                </button>
              </div>
            }
          >
            {/* العنوان */}
            <div class="rounded-2xl bg-red-50 dark:bg-red-900/10 p-4 text-center">
              <p class="font-bold text-red-600 dark:text-red-400">
                🎯 {weakQuestions()!.length} سؤال يحتاج مراجعة
              </p>
              <p class="text-xs text-ink-muted-light mt-1">
                مرتبة من الأصعب للأسهل
              </p>
            </div>

            <For each={weakQuestions()!}>
              {(question) => <WeakQuestionCard question={question} />}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  );
}

// ─── WeakQuestionCard ─────────────────────────────────────────────────────────

function WeakQuestionCard(props: { question: Question }) {
  const [expanded, setExpanded] = createSignal(false);
  const [attempts, setAttempts] = createSignal(0);

  // جلب عدد مرات الخطأ
  db.answers.get(props.question.$id).then((a) => {
    if (a) setAttempts(a.attempts ?? 1);
  });

  return (
    <div
      class="rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Header */}
      <div class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <p class="font-semibold text-sm leading-relaxed line-clamp-2">
              {props.question.question}
            </p>
          </div>

          {/* عدد مرات الخطأ */}
          <div class="flex-shrink-0 flex flex-col items-center gap-1">
            <span class="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-500">
              ✗ {attempts()}
            </span>
            <span class="text-[10px] text-ink-muted-light">خطأ</span>
          </div>
        </div>

        {/* تلميح للتوسيع */}
        <p class="text-[10px] text-slate-300 dark:text-slate-600 mt-2 text-center">
          {expanded() ? "اضغط للإخفاء ▲" : "اضغط لرؤية الإجابة ▼"}
        </p>
      </div>

      {/* الخيارات والإجابة */}
      <Show when={expanded()}>
        <div class="border-t border-line-light dark:border-line-dark p-4 space-y-2">
          <For each={props.question.options}>
            {(option, idx) => (
              <Show when={option}>
                <div
                  class={`rounded-xl px-4 py-2 text-sm ${
                    props.question.correctIndex?.toString().includes(idx().toString())
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold"
                      : "bg-base-light dark:bg-chip-dark/50"
                  }`}
                >
                  {idx() + 1}. {option}
                  <Show when={props.question.correctIndex?.toString().includes(idx().toString())}>
                    <span class="mr-2">✓</span>
                  </Show>
                </div>
              </Show>
            )}
          </For>

          {/* الشرح */}
          <Show when={props.question.explanation}>
            <div class="rounded-xl bg-amber-50 dark:bg-amber-900/10 p-3 text-xs text-amber-700 dark:text-amber-400 mt-2">
              💡 {props.question.explanation}
            </div>
          </Show>

          {/* صورة */}
          <Show when={props.question.image_url}>
            <img
              src={props.question.image_url!}
              alt="صورة السؤال"
              class="w-full rounded-xl object-contain max-h-48 bg-chip-light"
            />
          </Show>
        </div>
      </Show>
    </div>
  );
}
