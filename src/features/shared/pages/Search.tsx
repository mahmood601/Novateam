import {
  createSignal,
  createMemo,
  For,
  Show,
  onMount,
  createResource,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  type Question,
  type CachedSection,
  db,
  getSubjectsOfflineFirst,
  getPassageById,
  syncPassagesOfflineFirst,
} from "../../quizzes/services/local/indexeddb";
import {
  ensureLectureSearchIndex,
  searchLectures,
  getUncachedLectureCount,
  buildSnippet,
  type LectureSearchResult,
} from "../../lectures/lib/lectureSearchIndex";

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function getAllQuestions(): Promise<Question[]> {
  return await db.questions.toArray();
}

async function getAllSections(): Promise<CachedSection[]> {
  return await db.sections.toArray();
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

// ─── Result Card (questions) ───────────────────────────────────────────────────

function ResultCard(props: {
  question: Question;
  query: string;
  index: number;
  subjectMap: Record<string, string>;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const [passageOpen, setPassageOpen] = createSignal(false); // ✅ فتح/إغلاق المقالة عند الضغط على الـ tag، مستقل عن توسيع البطاقة

  const subjectName = () =>
    props.subjectMap[props.question.subject] ?? props.question.subject;

  // ✅ نجلب المقالة فقط عند الضغط على tag "مقالة"، وبعد ضمان مزامنتها أوفلاين-أولاً
  const [passage] = createResource(
    () => (passageOpen() && props.question.passage_id ? props.question.passage_id : null),
    async (passageId) => {
      await syncPassagesOfflineFirst(props.question.subject);
      return getPassageById(passageId);
    },
  );

  const matchingOptionsCount = createMemo(
    () =>
      (props.question.options ?? []).filter((opt) =>
        opt.toLowerCase().includes(props.query.toLowerCase()),
      ).length,
  );

  // أين وُجد التطابق
  const matchLocation = createMemo(() => {
    const q = props.query.trim().toLowerCase();
    if (!q) return null;
    if (props.question.question?.toLowerCase().includes(q)) return null; // في السؤال — واضح
    if (props.question.explanation?.toLowerCase().includes(q)) return "شرح";
    if (matchingOptionsCount() > 0) return "خيار";
    return null;
  });

  return (
    <div
      class="dark:bg-lighter-dark-1 overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200"
      classList={{ "ring-2 ring-main/25": expanded() }}
    >
      <div
        role="button"
        tabIndex={0}
        class="flex w-full items-start gap-3 p-4 text-right cursor-pointer"
        onClick={() => setExpanded(!expanded())}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded());
          }
        }}
      >
        <span class="bg-main/10 text-main mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {props.index + 1}
        </span>

        <div class="min-w-0 flex-1 text-right">
          {/* Badges */}
          <div class="mb-2 flex flex-wrap justify-end gap-1.5">
            <span class="bg-main/10 text-main rounded-full px-2 py-0.5 text-[10px] font-bold">
              {subjectName()}
            </span>
            <Show when={props.question.seasonName}>
              <span class="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 text-[10px] font-bold">
                {props.question.seasonName}
              </span>
            </Show>
            <Show when={props.question.yearValue}>
              <span class="dark:bg-lighter-dark-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-300">
                {props.question.yearValue}
              </span>
            </Show>
            <Show when={matchLocation()}>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                في {matchLocation()}
              </span>
            </Show>
            <Show when={props.question.passage_id}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // لا نريد توسيع/تصغير البطاقة كاملة عند الضغط على الـ tag فقط
                  setPassageOpen((v) => !v);
                }}
                class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-500 transition hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
              >
                📋 مقالة {passageOpen() ? "▲" : "▼"}
              </button>
            </Show>
          </div>

          {/* ✅ محتوى المقالة — يظهر عند الضغط على الـ tag، بشكل مستقل عن توسيع البطاقة */}
          <Show when={passageOpen() && props.question.passage_id}>
            <div
              dir="rtl"
              class="mb-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm dark:border-purple-900/40 dark:bg-purple-900/10"
            >
              <Show
                when={passage()}
                fallback={<p class="text-xs text-gray-400">جاري التحميل...</p>}
              >
                <p class="whitespace-pre-wrap text-right text-gray-700 dark:text-gray-300">
                  {passage()?.content}
                </p>
              </Show>
            </div>
          </Show>

          <p class="text-sm leading-relaxed font-bold dark:text-white">
            <Highlight text={props.question.question} query={props.query} />
          </p>

          <Show when={matchingOptionsCount() > 0 && !expanded()}>
            <p class="text-secondary mt-1 text-xs">
              تطابق في{" "}
              {matchingOptionsCount() > 1
                ? `${matchingOptionsCount()} خيارات`
                : "أحد الخيارات"}
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
          <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </div>

      <Show when={expanded()}>
        <div class="dark:border-lighter-dark-2 border-t border-gray-100 px-4 pt-3 pb-4">
          <ul class="space-y-2">
            <For each={props.question.options ?? []}>
              {(opt, i) => (
                <li
                  class="flex flex-row-reverse items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors"
                  classList={{
                    "border-true/40 bg-true/5": i() === props.question.correctIndex,
                    "border-gray-100 dark:border-lighter-dark-2": i() !== props.question.correctIndex,
                  }}
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    classList={{
                      "bg-true text-white": i() === props.question.correctIndex,
                      "bg-gray-100 text-gray-400 dark:bg-lighter-dark-2": i() !== props.question.correctIndex,
                    }}
                  >
                    {i() === props.question.correctIndex ? "✔" : i() + 1}
                  </span>
                  <span
                    class="flex-1 text-right"
                    classList={{
                      "text-true font-bold": i() === props.question.correctIndex,
                      "dark:text-gray-200": i() !== props.question.correctIndex,
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
              <p class="text-xs leading-relaxed text-amber-700 dark:text-amber-400" dir="auto">
                💡{" "}
                <Highlight text={props.question.explanation!} query={props.query} />
              </p>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ─── Result Card (lectures) ────────────────────────────────────────────────────

function LectureResultCard(props: {
  result: LectureSearchResult;
  query: string;
  index: number;
  subjectMap: Record<string, string>;
  sectionMap: Record<number, string>;
}) {
  const navigate = useNavigate();
  const subjectName = () =>
    props.subjectMap[props.result.subjectId] ?? props.result.subjectId;
  const seasonName = () =>
    props.sectionMap[props.result.seasonId] ?? `الفصل ${props.result.seasonId}`;
  const snippet = () => buildSnippet(props.result.text, props.query);

  const openInLecture = () => {
    navigate(
      `/${props.result.subjectId}/lectures/${props.result.seasonId}?q=${encodeURIComponent(props.query)}`,
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openInLecture}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openInLecture();
        }
      }}
      class="dark:bg-lighter-dark-1 cursor-pointer rounded-2xl bg-white p-4 text-right shadow-sm transition-all duration-200 hover:ring-2 hover:ring-main/20"
    >
      <div class="mb-2 flex flex-wrap justify-end gap-1.5">
        <span class="bg-main/10 text-main rounded-full px-2 py-0.5 text-[10px] font-bold">
          {subjectName()}
        </span>
        <span class="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 text-[10px] font-bold">
          {seasonName()}
        </span>
      </div>

      <Show when={props.result.headingText}>
        <p class="mb-1 text-[11px] font-bold text-gray-400">
          {props.result.headingText}
        </p>
      </Show>

      <p class="text-sm leading-relaxed dark:text-gray-200">
        <Highlight text={snippet()} query={props.query} />
      </p>
    </div>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      class="rounded-full border-2 px-3 py-1 text-xs font-bold whitespace-nowrap transition-all duration-150"
      classList={{
        "border-main bg-main text-white": props.active,
        "border-gray-200 bg-white text-gray-500 dark:border-lighter-dark-2 dark:bg-lighter-dark-1 dark:text-gray-300": !props.active,
      }}
    >
      {props.label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SortMode = "relevance" | "newest" | "oldest";
type ResultTab = "questions" | "lectures";

export default function SearchPage() {
  let inputRef!: HTMLInputElement;

  const [query, setQuery] = createSignal("");
  const [activeSubject, setActiveSubject] = createSignal<string | null>(null);
  const [activeSeason, setActiveSeason] = createSignal<number | null>(null);
  const [activeYear, setActiveYear] = createSignal<number | null>(null);
  const [sortMode, setSortMode] = createSignal<SortMode>("relevance");
  const [showFilters, setShowFilters] = createSignal(false);
  const [showAll, setShowAll] = createSignal(false);
  const [tab, setTab] = createSignal<ResultTab>("questions");

  const [allQuestions] = createResource(getAllQuestions);
  const [allSections] = createResource(getAllSections);
  const [subjects] = createResource(async () => {
    const year = localStorage.getItem("year");
    return year ? getSubjectsOfflineFirst(year) : [];
  });

  // يُبنى مرة عند فتح صفحة البحث، ويُعاد بناؤه (refetch يدوي أسفل) كل
  // مرة يدخل فيها المستخدم تبويب "المحاضرات" — رخيص لأن حجم البيانات
  // صغير أصلاً (محاضرات مفتوحة مسبقاً فقط، انظر التعليق في
  // lectureSearchIndex.ts)، ويضمن أن أي محاضرة فُتحت حديثاً بهذه
  // الجلسة تظهر بالبحث فوراً. `lectureIndexReady()` نفسه يُقرأ داخل
  // lectureResults() فقط ليسجّل كـ dependency ويُعيد حساب النتائج بعد
  // اكتمال إعادة البناء.
  const [lectureIndexReady, { refetch: refetchLectureIndex }] = createResource(
    async () => {
      await ensureLectureSearchIndex(true);
      return true;
    },
  );
  const [uncachedCount] = createResource(
    () => [tab(), activeSubject()] as const,
    ([, subj]) => getUncachedLectureCount(subj ?? undefined),
  );

  const subjectMap = createMemo(() => {
    const list = subjects();
    return list
      ? Object.fromEntries(list.map((s) => [s.id, s.name]))
      : {};
  });

  const sectionMap = createMemo(() => {
    const secs = allSections();
    if (!secs) return {} as Record<number, string>;
    return Object.fromEntries(secs.map((s) => [s.id, s.name]));
  });

  // فلاتر الفصل والسنة — تتغير حسب المادة المختارة
  const seasons = createMemo(() => {
    const secs = allSections();
    if (!secs) return [];
    return secs.filter(
      (s) =>
        s.type === "season" &&
        (!activeSubject() || s.subject_id === activeSubject()),
    );
  });

  const years = createMemo(() => {
    const secs = allSections();
    if (!secs) return [];
    return secs.filter(
      (s) =>
        s.type === "year" &&
        (!activeSubject() || s.subject_id === activeSubject()),
    );
  });

  // عدد الفلاتر النشطة
  const activeFilterCount = createMemo(
    () =>
      (activeSubject() ? 1 : 0) +
      (activeSeason() ? 1 : 0) +
      (activeYear() ? 1 : 0),
  );

  onMount(() => setTimeout(() => inputRef?.focus(), 120));

  const resetFilters = () => {
    setActiveSubject(null);
    setActiveSeason(null);
    setActiveYear(null);
    setShowAll(false);
  };

  // ─── منطق بحث الأسئلة ────────────────────────────────────────────────────

  const results = createMemo(() => {
    const qs = allQuestions();
    if (!qs) return [];

    const q = query().trim().toLowerCase();
    const subj = activeSubject();
    const season = activeSeason();
    const year = activeYear();

    // فلترة
    let filtered = qs.filter((question) => {
      if (subj && question.subject !== subj) return false;
      if (season && question.season_id !== season) return false;
      if (year && question.year_id !== year) return false;
      if (!q) return !!(subj || season || year);
      if (question.question?.toLowerCase().includes(q)) return true;
      if (question.options?.some((opt) => opt.toLowerCase().includes(q))) return true;
      if (question.explanation?.toLowerCase().includes(q)) return true;
      return false;
    });

    // ترتيب
    const mode = sortMode();
    if (mode === "newest") {
      filtered = [...filtered].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
    } else if (mode === "oldest") {
      filtered = [...filtered].sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime(),
      );
    } else if (mode === "relevance" && q) {
      // السؤال الذي يحتوي الكلمة في نصه أولاً
      filtered = [...filtered].sort((a, b) => {
        const aInQ = a.question?.toLowerCase().includes(q) ? 0 : 1;
        const bInQ = b.question?.toLowerCase().includes(q) ? 0 : 1;
        return aInQ - bInQ;
      });
    }

    return filtered;
  });

  const visibleResults = createMemo(() =>
    showAll() ? results() : results().slice(0, 20),
  );

  // ─── منطق بحث المحاضرات ──────────────────────────────────────────────────

  const lectureResults = createMemo(() => {
    lectureIndexReady(); // dependency: recompute once a (re)build finishes
    const q = query().trim();
    if (!q) return [];

    const subj = activeSubject();
    const season = activeSeason();

    let filtered = searchLectures(q, 200).filter((r) => {
      if (subj && r.subjectId !== subj) return false;
      if (season && r.seasonId !== season) return false;
      return true;
    });

    // relevance = ترتيب FlexSearch كما هو (مرتب أصلاً حسب الصلة)
    return filtered;
  });

  const visibleLectureResults = createMemo(() =>
    showAll() ? lectureResults() : lectureResults().slice(0, 20),
  );

  // ─── حالة عامة (مشتركة بين التبويبين) ────────────────────────────────────

  const activeResultsCount = () =>
    tab() === "questions" ? results().length : lectureResults().length;

  const isEmpty = () =>
    !query().trim() && !activeSubject() && !activeSeason() && !activeYear();

  const noResults = () =>
    !isEmpty() &&
    activeResultsCount() === 0 &&
    !(tab() === "questions" ? allQuestions.loading : false);

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div class="dark:bg-main-dark min-h-screen bg-gray-50" dir="rtl">

      {/* ─── Sticky Header ─── */}
      <div class="dark:bg-lighter-dark-1 sticky top-0 z-30 bg-white shadow-sm">

        {/* شريط البحث */}
        <div class="flex items-center gap-2 px-4 py-3">
          <div class="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              placeholder={
                tab() === "questions"
                  ? "ابحث في الأسئلة، الخيارات، الشرح..."
                  : "ابحث داخل نص المحاضرات..."
              }
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setShowAll(false);
              }}
              class="dark:bg-lighter-dark-2 focus:ring-main/30 w-full rounded-xl bg-gray-100 py-2 pr-9 pl-8 text-sm outline-none placeholder:text-gray-400 focus:ring-2 dark:text-white dark:placeholder:text-gray-500"
            />
            <Show when={query()}>
              <button
                onClick={() => { setQuery(""); setShowAll(false); }}
                class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </Show>
          </div>

          {/* زر الفلاتر */}
          <button
            onClick={() => setShowFilters(!showFilters())}
            class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
            classList={{
              "bg-main text-white": showFilters() || activeFilterCount() > 0,
              "bg-gray-100 text-gray-500 dark:bg-lighter-dark-2 dark:text-gray-300": !showFilters() && activeFilterCount() === 0,
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z" />
            </svg>
            <Show when={activeFilterCount() > 0}>
              <span class="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-black text-white">
                {activeFilterCount()}
              </span>
            </Show>
          </button>
        </div>

        {/* التبويبات */}
        <div class="flex gap-1 px-4 pb-2">
          <button
            onClick={() => { setTab("questions"); setShowAll(false); }}
            class="flex-1 rounded-xl py-2 text-xs font-bold transition-colors"
            classList={{
              "bg-main text-white": tab() === "questions",
              "bg-gray-100 text-gray-500 dark:bg-lighter-dark-2 dark:text-gray-300": tab() !== "questions",
            }}
          >
            الأسئلة
          </button>
          <button
            onClick={() => { setTab("lectures"); setShowAll(false); void refetchLectureIndex(); }}
            class="flex-1 rounded-xl py-2 text-xs font-bold transition-colors"
            classList={{
              "bg-main text-white": tab() === "lectures",
              "bg-gray-100 text-gray-500 dark:bg-lighter-dark-2 dark:text-gray-300": tab() !== "lectures",
            }}
          >
            المحاضرات
          </button>
        </div>

        {/* لوحة الفلاتر */}
        <Show when={showFilters()}>
          <div class="dark:border-lighter-dark-2 border-t border-gray-100 px-4 pb-3 pt-2 space-y-3">

            {/* المواد */}
            <div>
              <p class="mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">المادة</p>
              <div class="flex gap-2 overflow-x-auto pb-1">
                <FilterChip
                  label="الكل"
                  active={activeSubject() === null}
                  onClick={() => { setActiveSubject(null); setActiveSeason(null); setActiveYear(null); setShowAll(false); }}
                />
                <For each={subjects() ?? []}>
                  {(s) => (
                    <FilterChip
                      label={s.name}
                      active={activeSubject() === s.id}
                      onClick={() => {
                        setActiveSubject(activeSubject() === s.id ? null : s.id);
                        setActiveSeason(null);
                        setActiveYear(null);
                        setShowAll(false);
                      }}
                    />
                  )}
                </For>
              </div>
            </div>

            {/* الفصل والسنة */}
            <Show when={seasons().length > 0 || years().length > 0}>
              <div class="grid grid-cols-2 gap-2">
                <Show when={seasons().length > 0}>
                  <div>
                    <p class="mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">الفصل</p>
                    <div class="flex gap-1.5 overflow-x-auto pb-1">
                      <FilterChip
                        label="الكل"
                        active={activeSeason() === null}
                        onClick={() => { setActiveSeason(null); setShowAll(false); }}
                      />
                      <For each={seasons()}>
                        {(s) => (
                          <FilterChip
                            label={s.name}
                            active={activeSeason() === s.id}
                            onClick={() => {
                              setActiveSeason(activeSeason() === s.id ? null : s.id);
                              setShowAll(false);
                            }}
                          />
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* السنة — فلتر خاص بالأسئلة فقط (المحاضرات لا تُصنَّف بسنة) */}
                <Show when={years().length > 0 && tab() === "questions"}>
                  <div>
                    <p class="mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">السنة</p>
                    <div class="flex gap-1.5 overflow-x-auto pb-1">
                      <FilterChip
                        label="الكل"
                        active={activeYear() === null}
                        onClick={() => { setActiveYear(null); setShowAll(false); }}
                      />
                      <For each={years()}>
                        {(y) => (
                          <FilterChip
                            label={y.name}
                            active={activeYear() === y.id}
                            onClick={() => {
                              setActiveYear(activeYear() === y.id ? null : y.id);
                              setShowAll(false);
                            }}
                          />
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>

            {/* الترتيب — للأسئلة فقط، ترتيب المحاضرات دايماً حسب الصلة */}
            <Show when={tab() === "questions"}>
              <div>
                <p class="mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">الترتيب</p>
                <div class="flex gap-2">
                  {(
                    [
                      { value: "relevance", label: "الأكثر صلة" },
                      { value: "newest", label: "الأحدث" },
                      { value: "oldest", label: "الأقدم" },
                    ] as { value: SortMode; label: string }[]
                  ).map((opt) => (
                    <FilterChip
                      label={opt.label}
                      active={sortMode() === opt.value}
                      onClick={() => { setSortMode(opt.value); setShowAll(false); }}
                    />
                  ))}
                </div>
              </div>
            </Show>

            {/* إعادة ضبط */}
            <Show when={activeFilterCount() > 0}>
              <button
                onClick={resetFilters}
                class="text-xs text-warn underline"
              >
                ✕ إعادة ضبط الفلاتر
              </button>
            </Show>
          </div>
        </Show>
      </div>

      {/* ─── Content ─── */}
      <div class="px-4 py-4">

        {/* شارة المحاضرات غير المحملة — تبويب المحاضرات فقط */}
        <Show when={tab() === "lectures" && (uncachedCount() ?? 0) > 0}>
          <div class="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <span>🔒</span>
            <span>
              {(uncachedCount() ?? 0).toLocaleString("ar")} محاضرة غير محمّلة بعد — افتحها
              مرة واحدة ليشملها البحث لاحقاً حتى بدون إنترنت
            </span>
          </div>
        </Show>

        {/* Loading */}
        <Show when={tab() === "questions" ? allQuestions.loading : false}>
          <div class="flex items-center justify-center py-20">
            <div class="text-main h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
          </div>
        </Show>

        {/* Empty state */}
        <Show when={isEmpty() && !(tab() === "questions" && allQuestions.loading)}>
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="text-main/30 mb-4 h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p class="text-base font-bold text-gray-400">
              {tab() === "questions" ? "ابحث في الأسئلة" : "ابحث داخل المحاضرات"}
            </p>
            <p class="mt-1 text-sm text-gray-300">
              {tab() === "questions"
                ? "يبحث في السؤال، الخيارات، والشرح"
                : "يبحث في نص المحاضرات المفتوحة مسبقاً على هذا الجهاز"}
            </p>
            <Show when={tab() === "questions" && allQuestions()}>
              <p class="dark:bg-lighter-dark-2 mt-3 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400">
                {allQuestions()!.length.toLocaleString("ar")} سؤال محلي
              </p>
            </Show>
          </div>
        </Show>

        {/* No results */}
        <Show when={noResults()}>
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <span class="mb-3 text-5xl opacity-30">🔍</span>
            <p class="font-bold text-gray-400">لا توجد نتائج</p>
            <p class="mt-1 text-sm text-gray-300">جرّب كلمة مختلفة أو غيّر الفلاتر</p>
            <Show when={activeFilterCount() > 0}>
              <button
                onClick={resetFilters}
                class="border-main/30 text-main mt-4 rounded-full border px-4 py-1.5 text-xs font-bold"
              >
                إزالة الفلاتر
              </button>
            </Show>
          </div>
        </Show>

        {/* Results — الأسئلة */}
        <Show when={tab() === "questions" && results().length > 0}>
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-xs text-gray-400">
                <span class="font-bold text-gray-600 dark:text-gray-300">
                  {results().length.toLocaleString("ar")}
                </span>{" "}
                نتيجة
                <Show when={!showAll() && results().length > 20}>
                  {" "}— يُعرض أول 20
                </Show>
              </p>
              <Show when={activeFilterCount() > 0}>
                <span class="bg-main/10 text-main rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {activeFilterCount()} فلتر نشط
                </span>
              </Show>
            </div>
            <Show when={query().trim()}>
              <p class="text-main max-w-[120px] truncate text-xs font-bold">
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
              class="border-main/30 text-main hover:bg-main/5 mt-4 w-full rounded-2xl border-2 py-3 text-sm font-bold transition-colors"
            >
              عرض باقي {(results().length - 20).toLocaleString("ar")} نتيجة
            </button>
          </Show>
        </Show>

        {/* Results — المحاضرات */}
        <Show when={tab() === "lectures" && lectureResults().length > 0}>
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-xs text-gray-400">
                <span class="font-bold text-gray-600 dark:text-gray-300">
                  {lectureResults().length.toLocaleString("ar")}
                </span>{" "}
                نتيجة
                <Show when={!showAll() && lectureResults().length > 20}>
                  {" "}— يُعرض أول 20
                </Show>
              </p>
              <Show when={activeFilterCount() > 0}>
                <span class="bg-main/10 text-main rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {activeFilterCount()} فلتر نشط
                </span>
              </Show>
            </div>
            <Show when={query().trim()}>
              <p class="text-main max-w-[120px] truncate text-xs font-bold">
                "{query()}"
              </p>
            </Show>
          </div>

          <div class="flex flex-col gap-3">
            <For each={visibleLectureResults()}>
              {(r, i) => (
                <LectureResultCard
                  result={r}
                  query={query()}
                  index={i()}
                  subjectMap={subjectMap()}
                  sectionMap={sectionMap()}
                />
              )}
            </For>
          </div>

          <Show when={!showAll() && lectureResults().length > 20}>
            <button
              onClick={() => setShowAll(true)}
              class="border-main/30 text-main hover:bg-main/5 mt-4 w-full rounded-2xl border-2 py-3 text-sm font-bold transition-colors"
            >
              عرض باقي {(lectureResults().length - 20).toLocaleString("ar")} نتيجة
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
}
