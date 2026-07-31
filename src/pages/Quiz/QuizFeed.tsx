import { createEffect, For, on, onCleanup, onMount, Show } from "solid-js";
import QuizBox from "./QuizBox";
import { quizDisplayMode, type QuizDisplayMode } from "./quizDisplayMode";
import type { Question, Passage } from "../../services/local/indexeddb";

const AUTO_ADVANCE_DELAY = 700;

type FeedProps = {
  questions: Question[];
  passages: Passage[] | undefined;
  subject: string;
  subjectName: string;
  answeredMap: Map<string, { selectedIndex: number; isCorrect: boolean }>;
  startIndex: number;
  onSelect: (q: Question, optIdx: number, content: string) => void;
  onIndexChange: (idx: number) => void;
};

function FeedAxis(props: FeedProps & { axis: QuizDisplayMode }) {
  let containerEl: HTMLDivElement | undefined;
  const slideEls: (HTMLDivElement | undefined)[] = [];

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
        if (best) props.onIndexChange(best.idx);
      },
      { root: containerEl, threshold: [0.5, 0.6, 0.7] },
    );
    slideEls.forEach((el) => el && observer!.observe(el));
  };

  onMount(() => {
    setupObserver();
    requestAnimationFrame(() => {
      if (props.startIndex > 0) scrollToIndex(props.startIndex, false);
    });
  });

  onCleanup(() => observer?.disconnect());

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
      setTimeout(() => scrollToIndex(idx + 1), AUTO_ADVANCE_DELAY);
    }
  };

  return (
    <div
      ref={containerEl}
      dir="ltr"
      classList={{
        "flex h-full w-full overscroll-contain": true,
        "flex-row-reverse snap-x snap-mandatory overflow-x-auto overflow-y-hidden":
          props.axis === "horizontal",
        "flex-col snap-y snap-mandatory overflow-y-auto overflow-x-hidden":
          props.axis === "vertical",
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
                "min-h-full": props.axis === "vertical",
                "h-full overflow-y-auto": props.axis === "horizontal",
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
  );
}
export default function QuizFeed(props: FeedProps & { onFinish: () => void }) {
  const isLastAnswered = () => {
    const last = props.questions.length - 1;
    const lastQ = props.questions[last];
    return last >= 0 && lastQ && props.answeredMap.has(lastQ.$id);
  };

  return (
    <div class="relative flex h-full flex-1 flex-col overflow-hidden">
      <Show
        when={quizDisplayMode() === "vertical"}
        fallback={<FeedAxis {...props} axis="horizontal" />}
      >
        <FeedAxis {...props} axis="vertical" />
      </Show>

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