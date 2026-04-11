import {
  createSignal,
  createMemo,
  For,
  Show,
  onMount,
  createResource,
} from "solid-js";
import { type Question, getSubjectsOfflineFirst } from "../services/local/indexeddb";
import { Dexie } from "dexie";

// ─── Fetch all questions from IndexedDB ───────────────────────────────────────

async function getAllQuestions(): Promise<Question[]> {
  const db = new Dexie("db");
  db.version(2).stores({
    questions: `$id, subject, season_id, year_id, [subject+season_id], [subject+year_id]`,
    answers: `$id, subject, season_id, year_id, [subject+season_id], [subject+year_id]`,
    favorites: `$id, questionId, subject, [subject+questionId]`,
    sections: `id, subject_id, type, [subject_id+type]`,
    subjects: `id`,
    years: `id`,
  });
  return (db as any).questions.toArray();
}

// ─── Highlight ────────────────────────────────────────────────────────────────

function Highlight(props: { text: string; query: string }) {
  const parts = createMemo(() => {
    if (!props.query.trim()) return [{ text: props.text, match: false }];
    const escaped = props.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return props.text.split(regex).map((part) => ({
      text: part,
      match: part.toLowerCase() === props.query.toLowerCase(),
    }));
  });

  return (
    <span dir="auto">
      <For each={parts()}>
        {(part) =>
          part.match ? (
            <mark class="bg-main/20 text-main rounded px-0.5 font-bold not-italic">
              {part.text}
            </mark>
          ) : (
            <span>{part.text}</span>
          )
        }
      </For>
    </span>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard(props: {
  question: Question;
  query: string;
  index: number;
  subjectMap: Record<string, string>;
}) {
  const [expanded, setExpanded] = createSignal(false);

  const subjectName = () =>
    props.subjectMap[props.question.subject] ?? props.question.subject;

  const matchingOptionsCount = createMemo(
    () =>
      (props.question.options ?? []).filter((opt) =>
        opt.toLowerCase().includes(props.query.toLowerCase()),
      ).length,
  );

  return (
    <div
      class="dark:bg-lighter-dark-1 overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200"
      classList={{ "ring-2 ring-main/25": expanded() }}
    >
      <button
        class="flex w-full items-start gap-3 p-4 text-right"
        onClick={() => setExpanded(!expanded())}
      >
        <span class="bg-main/10 text-main mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {props.index + 1}
        </span>

        <div class="min-w-0 flex-1 text-right">
          <div class="mb-2 flex flex-wrap justify-end gap-1.5">
            <span class="bg-main/10 text-main rounded-full px-2 py-0.5 text-[10px] font-bold">
              {subjectName()}
            </span>
            <Show when={props.question.seasonName}>
              <span class="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                {props.question.seasonName}
              </span>
            </Show>
            <Show when={props.question.yearValue}>
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-lighter-dark-2 dark:text-gray-300">
                {props.question.yearValue}
              </span>
            </Show>
          </div>

          <p class="text-sm font-bold leading-relaxed dark:text-white">
            <Highlight text={props.question.question} query={props.query} />
          </p>

          <Show when={matchingOptionsCount() > 0 && !expanded()}>
            <p class="text-secondary mt-1 text-xs">
              تطابق في {matchingOptionsCount() > 1 ? `${matchingOptionsCount()} خيارات` : "أحد الخيارات"}
            </p>
          </Show>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          class="mt-1 shrink-0 text-gray-300 transition-transform duration-200"
          style={{ transform: expanded() ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path
            fill="currentColor"
            d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"
          />
        </svg>
      </button>

      <Show when={expanded()}>
        <div class="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-lighter-dark-2">
          <ul class="space-y-2">
            <For each={props.question.options ?? []}>
              {(opt, i) => (
                <li
                  class="flex flex-row-reverse items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors"
                  classList={{
                    "border-true/40 bg-true/5":
                      i() === props.question.correctIndex,
                    "border-gray-100 dark:border-lighter-dark-2":
                      i() !== props.question.correctIndex,
                  }}
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    classList={{
                      "bg-true text-white": i() === props.question.correctIndex,
                      "bg-gray-100 text-gray-400 dark:bg-lighter-dark-2":
                        i() !== props.question.correctIndex,
                    }}
                  >
                    {i() === props.question.correctIndex ? "✔" : i() + 1}
                  </span>
                  <span
                    class="flex-1 text-right"
                    classList={{
                      "text-true font-bold":
                        i() === props.question.correctIndex,
                      "dark:text-gray-200":
                        i() !== props.question.correctIndex,
                    }}
                  >
                    <Highlight text={opt} query={props.query} />
                  </span>
                </li>
              )}
            </For>
          </ul>

          <Show when={props.question.explanation}>
            <div class="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-900/20">
              <p
                class="text-xs leading-relaxed text-amber-700 dark:text-amber-400"
                dir="auto"
              >
                💡{" "}
                <Highlight
                  text={props.question.explanation!}
                  query={props.query}
                />
              </p>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ─── Subject Chip ─────────────────────────────────────────────────────────────

function SubjectChip(props: {
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      class="rounded-full border-2 px-3 py-1 text-xs font-bold whitespace-nowrap transition-all duration-150"
      classList={{
        "border-main bg-main text-white": props.active,
        "border-gray-200 bg-white text-gray-500 dark:border-lighter-dark-2 dark:bg-lighter-dark-1 dark:text-gray-300":
          !props.active,
      }}
    >
      {props.name}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  let inputRef!: HTMLInputElement;

  const [query, setQuery] = createSignal("");
  const [activeSubject, setActiveSubject] = createSignal<string | null>(null);
  const [showAll, setShowAll] = createSignal(false);

  const [allQuestions] = createResource(getAllQuestions);
  const [subjects] = createResource(getSubjectsOfflineFirst);
  const subjectMap = createMemo(() => {
    const list = subjects();
    return list
      ? Object.fromEntries(list.map((subject) => [subject.id, subject.name]))
      : {};
  });

  onMount(() => setTimeout(() => inputRef?.focus(), 120));

  const results = createMemo(() => {
    const qs = allQuestions();
    if (!qs) return [];
    const q = query().trim().toLowerCase();
    const subj = activeSubject();

    return qs.filter((question) => {
      if (subj && question.subject !== subj) return false;
      if (!q) return !!subj;
      if (question.question?.toLowerCase().includes(q)) return true;
      if (question.options?.some((opt) => opt.toLowerCase().includes(q)))
        return true;
      if (question.explanation?.toLowerCase().includes(q)) return true;
      return false;
    });
  });

  const visibleResults = createMemo(() =>
    showAll() ? results() : results().slice(0, 20),
  );

  const isEmpty = () => !query().trim() && !activeSubject();
  const noResults = () =>
    !isEmpty() && results().length === 0 && !allQuestions.loading;

  return (
    <div class="dark:bg-main-dark min-h-screen bg-gray-50" dir="rtl">
      {/* Sticky top bar */}
      <div class="dark:bg-lighter-dark-1 sticky top-0 z-30 bg-white shadow-sm">
        <div class="flex flex-row-reverse items-center gap-3 px-4 py-3">
       

          <div class="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              placeholder="ابحث عن سؤال أو خيار..."
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setShowAll(false);
              }}
              class="dark:bg-lighter-dark-2 w-full rounded-xl bg-gray-100 py-2 pr-9 pl-8 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-main/30 dark:text-white dark:placeholder:text-gray-500"
            />
            <Show when={query()}>
              <button
                onClick={() => setQuery("")}
                class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </Show>
          </div>
        </div>

        {/* Subject filter chips */}
        <div class="flex gap-2 overflow-x-auto px-4 pb-3 pt-0">
          <SubjectChip
            name="الكل"
            active={activeSubject() === null}
            onClick={() => {
              setActiveSubject(null);
              setShowAll(false);
            }}
          />
          <For each={subjects() ?? []}>
            {(subject) => (
              <SubjectChip
                name={subject.name}
                active={activeSubject() === subject.id}
                onClick={() => {
                  setActiveSubject(
                    activeSubject() === subject.id ? null : subject.id,
                  );
                  setShowAll(false);
                }}
              />
            )}
          </For>
        </div>
      </div>

      {/* Content */}
      <div class="px-4 py-4">
        {/* Loading */}
        <Show when={allQuestions.loading}>
          <div class="flex items-center justify-center py-20">
            <div class="text-main h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
          </div>
        </Show>

        {/* Empty prompt */}
        <Show when={isEmpty() && !allQuestions.loading}>
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="text-main/30 mb-4 h-14 w-14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p class="text-base font-bold text-gray-400">ابحث في الأسئلة</p>
            <p class="mt-1 text-sm text-gray-300">
              يبحث في السؤال، الخيارات، والشرح
            </p>
            <Show when={allQuestions()}>
              <p class="mt-3 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400 dark:bg-lighter-dark-2">
                {allQuestions()!.length} سؤال محلي
              </p>
            </Show>
          </div>
        </Show>

        {/* No results */}
        <Show when={noResults()}>
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <span class="mb-3 text-5xl opacity-30">🔍</span>
            <p class="font-bold text-gray-400">لا توجد نتائج</p>
            <p class="mt-1 text-sm text-gray-300">جرّب كلمة مختلفة</p>
          </div>
        </Show>

        {/* Results */}
        <Show when={results().length > 0}>
          <div class="mb-3 flex items-center justify-between">
            <p class="text-xs text-gray-400">
              {results().length} نتيجة
              <Show when={!showAll() && results().length > 20}>
                {" "}
                — يُعرض أول 20
              </Show>
            </p>
            <Show when={query().trim()}>
              <p class="text-main truncate text-xs font-bold">
                "{query()}"
              </p>
            </Show>
          </div>

          <div class="flex flex-col gap-3">
            <For each={visibleResults()}>
              {(q, i) => (
                <ResultCard
                  question={q}
                  query={query()}
                  index={i()}
                  subjectMap={subjectMap()}
                />
              )}
            </For>
          </div>

          <Show when={!showAll() && results().length > 20}>
            <button
              onClick={() => setShowAll(true)}
              class="border-main/30 text-main mt-4 w-full rounded-2xl border-2 py-3 text-sm font-bold transition-colors hover:bg-main/5"
            >
              عرض باقي {results().length - 20} نتيجة
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
}
