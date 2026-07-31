import {
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import QuizBox from "./QuizBox";
import { quizDisplayMode } from "./quizDisplayMode";
import type { Question, Passage } from "../../services/local/indexeddb";

const AUTO_ADVANCE_DELAY = 700;

export default function QuizFeed(props: {
  questions: Question[];
  passages: Passage[] | undefined;
  subject: string;
  subjectName: string;
  answeredMap: Map<string, { selectedIndex: number; isCorrect: boolean }>;
  startIndex: number;
  onSelect: (q: Question, optIdx: number, content: string) => void;
  onIndexChange: (idx: number) => void;
  onFinish: () => void;
}) {
  let containerEl: HTMLDivElement | undefined;
  const slideEls: (HTMLDivElement | undefined)[] = [];
  let hasScrolledToStart = false;

  const [visibleIndex, setVisibleIndex] = createSignal(props.startIndex);

  const passageFor = (q: Question) =>
    q.passage_id
      ? (props.passages?.find((p) => p.$id === q.passage_id) ?? null)
      : null;

  const scrollToIndex = (idx: number, smooth = true) => {
    slideEls[idx]?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      inline: "start",
      block: "start",
    });
  };

  // ─── مراقبة السؤال الظاهر حاليًا على الشاشة ────────────────────────────────
  let observer: IntersectionObserver | undefined;

  const setupObserver = () => {
    observer?.disconnect();
    if (!containerEl) return;
    observer = new IntersectionObserver(
      (entries) => {
        let best: { idx: number; ratio: number } | null = null;
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          if (
            entry.isIntersecting &&
            (!best || entry.intersectionRatio > best.ratio)
          ) {
            best = { idx, ratio: entry.intersectionRatio };
          }
        }
        if (best) {
          setVisibleIndex(best.idx);
          props.onIndexChange(best.idx);
        }
      },
      { root: containerEl, threshold: [0.5, 0.6, 0.7] },
    );
    slideEls.forEach((el) => el && observer!.observe(el));
  };

  onMount(() => {
    setupObserver();
    // استعادة الموضع المحفوظ دون تمرير متحرك
    queueMicrotask(() => {
      if (!hasScrolledToStart && props.startIndex > 0) {
        scrollToIndex(props.startIndex, false);
      }
      hasScrolledToStart = true;
    });
  });

  onCleanup(() => observer?.disconnect());

  // إعادة ربط المراقب عند تغيّر عدد الأسئلة (تحميل البيانات لاحقًا)
  createEffect(
    on(
      () => props.questions.length,
      () => setupObserver(),
    ),
  );

  const handleSelect = (
    q: Question,
    optIdx: number,
    content: string,
    idx: number,
  ) => {
    props.onSelect(q, optIdx, content);
    if (idx < props.questions.length - 1) {
      setTimeout(() => {
        if (visibleIndex() === idx) scrollToIndex(idx + 1);
      }, AUTO_ADVANCE_DELAY);
    }
  };

  const isLastAnswered = () => {
    const last = props.questions.length - 1;
    const lastQ = props.questions[last];
    return last >= 0 && lastQ && props.answeredMap.has(lastQ.$id);
  };

  return (
    <div class="relative flex h-full flex-1 flex-col overflow-hidden">
      <div
        ref={containerEl}
        dir="ltr"
        classList={{
          "flex h-full w-full overscroll-contain": true,
          "flex-row-reverse snap-x snap-mandatory overflow-x-auto overflow-y-hidden":
            quizDisplayMode() === "horizontal",
          "flex-col snap-y snap-mandatory overflow-y-auto overflow-x-hidden":
            quizDisplayMode() === "vertical",
        }}
      >
        <For each={props.questions}>
          {(q, i) => {
            const answered = () => props.answeredMap.get(q.$id);
            return (
              <div
                ref={(el) => (slideEls[i()] = el)}
                data-idx={i()}
                classList={{
                  "w-full flex-shrink-0 snap-start px-5 pt-2 pb-8": true,
                  "min-h-full": quizDisplayMode() === "vertical",
                  "h-full overflow-y-auto": quizDisplayMode() === "horizontal",
                }}
              >
                <div class="w-full">
                  <QuizBox
                    question={q}
                    currentQuestion={q}
                    index={i()}
                    subject={props.subject}
                    subjectName={props.subjectName}
                    selectedOption={answered()?.selectedIndex ?? 7}
                    isDisabled={!!answered()}
                    explanation={q.explanation}
                    onSelect={(qq: Question, optIdx: number, content: string) =>
                      handleSelect(qq, optIdx, content, i())
                    }
                    passage={passageFor(q)}
                  />
                </div>
              </div>
            );
          }}
        </For>
      </div>

      {/* زر إظهار النتيجة — يظهر فقط بعد الإجابة على آخر سؤال */}
      <Show when={isLastAnswered()}>
        <div class="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <button
            onClick={props.onFinish}
            class="bg-main pointer-events-auto animate-[fadeIn_.25s_ease-in-out] rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg"
          >
            إظهار النتيجة
          </button>
        </div>
      </Show>
    </div>
  );
}
