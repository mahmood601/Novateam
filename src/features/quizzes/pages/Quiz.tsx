import { useBeforeLeave, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
  Suspense,
} from "solid-js";

import {
  addAnswersToProgress,
  getSubjectsOfflineFirst,
  syncPassagesOfflineFirst,
  getPassagesForSubject,
  Question,
  type Passage,
} from "../services/local/indexeddb";
import { syncAndGetSections } from "../services/local/indexeddb/sections";
import type { CachedSection } from "../types/cached-section";
import {
  getQuestionsWithFilters,
  getAnswersWithFilters,
  getQuestionById,
  deleteAnswerById,
  deleteAnswersByIds,
  filtersFromLegacySection,
  filtersKey,
  activeFilterCount,
  type QuizFilters,
  type QuizFilterResult,
} from "../services/local/indexeddb/quizFilters";
import { useAudio } from "../../shared/hooks/useAudio";
import { unwrap } from "solid-js/store";
import QuizFilterSheet from "../components/QuizFilterSheet";
import QuizToolsSheet from "../components/QuizToolsSheet";
import { quizState, setQuizState } from "../utils/quizStore";
import QuizFeed from "../components/QuizFeed";
import Result from "../components/Result";
import { recordActivityToday } from "../services/local/streak";
import { toast } from "solid-toast";
import QuizFooter from "../components/QuizFooter";
import LeftArrow from "@/features/shared/components/Icons/LeftArrow";

export default function Quiz() {
  const subject = useParams().subject ?? "";
  // section غير موجود عند الدخول عبر الرابط الجديد (/:subject/quiz) —
  // موجود بس عند الدخول عبر رابط قديم محفوظ (season_id-N / year_id-N).
  const section = useParams().section ?? "";

  // Header helpers
  const [timeLeft, setTimeLeft] = createSignal(0);
  const [isPaused, setIsPaused] = createSignal(false);
  createEffect(() => {
    setTimeLeft((orderedQs().length - 1) * 60);
  });

  const { audioEnabled, setAudio } = useAudio();

  onMount(() => {
    const timer = setInterval(() => {
      if (isPaused()) return;
      if (
        quizState.index == orderedQs().length - 1 &&
        quizState.isOptionDisabled
      )
        return;
      if (timeLeft() <= 0) return;
      if (timeLeft() === 60) {
        // تنبيه آخر دقيقة
        toast("⏰ دقيقة أخيرة!", { duration: 3000 });
      }
      setTimeLeft((t) => t - 1);
      if (timeLeft() - 1 <= 0) {
        addAnswersToProgress(unwrap(quizState.userAnswers));
        setQuizState("showResult", true);
      }
    }, 1000);
    onCleanup(() => clearInterval(timer));
  });

  const formatTime = () => {
    const m = Math.floor(timeLeft() / 60);
    const s = timeLeft() % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // الفلاتر: تُبنى مبدئياً من رابط الدخول القديم إذا وُجد (متوافقة
  // رجعياً)، وإلا فاضية = كل الفصول + كل السنين (الافتراضي الجديد).
  // بعدها إشارة (signal) حية يقدر المستخدم يعدّلها من داخل الكويز نفسه
  // (فصل/سنة تعدد اختيار + مفضلة/صعبة) بدون إعادة تنقّل.
  const [filters, setFilters] = createSignal<QuizFilters>(
    filtersFromLegacySection(section),
  );
  const [filterSheetOpen, setFilterSheetOpen] = createSignal(false);
  const [toolsSheetOpen, setToolsSheetOpen] = createSignal(false);

  const { playSound } = useAudio();
  // ── WHY every resource below has `initialValue` and is read through `.latest` ──
  // Solid's <Suspense> shows its fallback whenever a resource READ THROUGH `()`
  // is loading — on the first load AND on every refetch (e.g. changing a
  // filter). That blanked the whole quiz (header, feed, scroll position) each time.
  // `initialValue` marks a resource as "already has a value", and `.latest`
  // returns the last value WITHOUT registering with Suspense: the old content
  // stays on screen while new data loads, so nothing flashes.
  const [subjectInfo] = createResource(
    async () => {
      const yearKey = localStorage.getItem("year") ?? "";
      const subjects = await getSubjectsOfflineFirst(yearKey);
      return subjects.find((item) => item.id === subject);
    },
    { initialValue: undefined },
  );
  const subjectName = () => subjectInfo.latest?.name ?? subject;

  // مفتاح الموضع المحفوظ مبني على تركيبة الفلتر الحالية — كل تركيبة
  // عندها موضعها الخاص المحفوظ.
  const SESSION_KEY = createMemo(
    () => `quiz_index_${subject}_${filtersKey(filters())}`,
  );

  // يحمّل الإجابات المحفوظة مسبقاً (لنفس تركيبة الفلتر الحالية) ويعبّي
  // فيها الجلسة — أي سؤال أُجيب عنه قبل يبين "محلول" فوراً عند الدخول،
  // بدون أي تصفير تلقائي. التصفير الوحيد هو اليدوي من "🛠️ أدوات".
  const loadPersistedAnswers = async (resetIndexTo?: number) => {
    setQuizState({
      ...(resetIndexTo !== undefined ? { index: resetIndexTo } : {}),
      selectedOption: 7,
      isOptionDisabled: false,
      userAnswers: [], // نمسح حالة الجلسة القديمة (كويز/فلتر سابق) قبل التعبئة
    });
    const persisted = await getAnswersWithFilters(subject, filters());
    setQuizState("userAnswers", persisted as any);
  };

  onMount(() => {
    const saved = parseInt(sessionStorage.getItem(SESSION_KEY()) ?? "0");
    setQuizState("showResult", false);
    loadPersistedAnswers(saved > 0 ? saved : 0);
  });

  // عند تغيير الفلتر من داخل الكويز (بعد التحميل الأول): كل تركيبة
  // فلتر عندها موضعها المحفوظ الخاص، ونعيد تحميل الإجابات المحفوظة
  // لنفس التركيبة الجديدة (نفس منطق onMount). defer:true عشان ما
  // يشتغل مرة إضافية عند التحميل الأول.
  createEffect(
    on(
      () => filtersKey(filters()),
      () => {
        const saved = parseInt(sessionStorage.getItem(SESSION_KEY()) ?? "0");
        loadPersistedAnswers(saved > 0 ? saved : 0);
      },
      { defer: true },
    ),
  );

  // حفظ الموضع عند كل تغيير
  createEffect(() => {
    sessionStorage.setItem(SESSION_KEY(), String(quizState.index));
  });

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const [
    filterResult,
    { refetch: refetchQuestions, mutate: mutateFilterResult },
  ] = createResource<
    QuizFilterResult | undefined,
    readonly [string, QuizFilters]
  >(
    () => [subject, filters()] as const,
    ([subj, f]) => getQuestionsWithFilters(subj, f),
    { initialValue: undefined },
  );
  const questions = () => filterResult.latest?.questions;
  const weakAttemptsMap = createMemo(
    () => filterResult.latest?.weakAttemptsMap ?? new Map<string, number>(),
  );

  // ─── Passages ─────────────────────────────────────────────────────────────
  // Offline-first for real: show what is already on the device IMMEDIATELY and
  // refresh from the network in the background. Before, the screen waited for
  // a Supabase request (every 10 minutes) before showing any question.
  const [passages, { mutate: mutatePassages }] = createResource(
    async () => {
      const local = (await getPassagesForSubject(subject)).reverse();
      syncPassagesOfflineFirst(subject).then(async () => {
        const fresh = (await getPassagesForSubject(subject)).reverse();
        const same =
          fresh.length === local.length &&
          fresh.every(
            (p, i) =>
              p.$id === local[i]?.$id && p.content === local[i]?.content,
          );
        if (!same) mutatePassages(fresh);
      });
      return local;
    },
    { initialValue: [] as Passage[] },
  );
  const passageMap = createMemo(
    () => new Map(passages.latest.map((p) => [p.$id, p])),
  );

  // Season / year names for the badge on each question: ONE lookup for the
  // whole page. Before, every question loaded the same list from IndexedDB
  // on its own (3 lookups per question → thousands for a big subject).
  const [sections, { mutate: mutateSections }] = createResource(
    () => syncAndGetSections(subject, (fresh) => mutateSections(fresh)),
    { initialValue: [] as CachedSection[] },
  );
  const sectionNames = createMemo(
    () => new Map(sections.latest.map((s) => [s.id, s.name])),
  );

  // ─── Ordered Questions ────────────────────────────────────────────────────────

  const orderedQs = createMemo(() => {
    const qs = questions();
    if (!qs) return [];

    const passageGroups = new Map<string, Question[]>();
    const passageOrder: string[] = [];
    const noPassage: Question[] = [];

    for (const q of qs) {
      if (!q.passage_id) {
        noPassage.push(q);
        continue;
      }
      if (!passageGroups.has(q.passage_id)) {
        passageGroups.set(q.passage_id, []);
        passageOrder.push(q.passage_id);
      }
      passageGroups.get(q.passage_id)!.push(q);
    }

    return [
      ...passageOrder.flatMap(
        (passageId) => passageGroups.get(passageId) ?? [],
      ),
      ...noPassage,
    ];
  });

  const currentQuestion = () => orderedQs()[quizState.index];

  // الفقرة (Passage) الخاصة بالسؤال الظاهر حاليًا — تُستخدم كسياق لمساعد AI بالهيدر
  const currentPassage = createMemo(() => {
    const q = currentQuestion();
    if (!q?.passage_id) return null;
    return passageMap().get(q.passage_id) ?? null;
  });

  // خريطة الأسئلة المُجابة — تُستخدم لعرض كل سؤال بحالته في وضع التمرير
  const answeredMap = createMemo(() => {
    const map = new Map<
      string,
      { selectedIndex: number; isCorrect: boolean }
    >();
    for (const a of quizState.userAnswers) {
      map.set(a.$id, {
        selectedIndex: (a as any).selectedIndex ?? 7,
        isCorrect: a.answer,
      });
    }
    return map;
  });

  // ─── Navigation guard ─────────────────────────────────────────────────────────

  useBeforeLeave(() => {
    sessionStorage.removeItem(SESSION_KEY()); // مسح موضع التمرير المحفوظ فقط — الإجابات نفسها تبقى محفوظة
    addAnswersToProgress(unwrap(quizState.userAnswers));
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const buildAnswerRecord = (q: Question, optIdx: number, content: string) => ({
    $id: q.$id,
    subject,
    season_id: q.season_id,
    year_id: q.year_id,
    state: true,
    answer: q.correctIndex == optIdx,
    answerContent: content,
    selectedIndex: optIdx,
    answeredAt: Date.now(),
    attempts: 1,
  });

  const handleOptionSelect = (q: Question, optIdx: number, content: string) => {
    const isCorrect = q.correctIndex == optIdx;

    recordActivityToday();

    if (quizState.audioEnabled) playSound(isCorrect);

    setQuizState("userAnswers", (prev) => [
      ...prev.filter((a) => a.$id !== q.$id),
      buildAnswerRecord(q, optIdx, content),
    ]);
    setQuizState({ selectedOption: optIdx, isOptionDisabled: true });
  };

  // ─── حل / تصفير (أدوات) ─────────────────────────────────────────────────────
  // هاي كلها بتكتب فوراً لقاعدة البيانات المحلية (مو بس حالة الجلسة)
  // — لأن "الحل" و"التصفير" هون معناها تغيير الحالة المحفوظة نفسها،
  // مو بس شكلها بالشاشة الحالية.

  const handleSolveCurrent = async () => {
    const q = currentQuestion();
    if (!q) return;
    const record = buildAnswerRecord(
      q,
      q.correctIndex,
      q.options?.[q.correctIndex] ?? "",
    );
    setQuizState("userAnswers", (prev) => [
      ...prev.filter((a) => a.$id !== q.$id),
      record,
    ]);
    setQuizState({ selectedOption: q.correctIndex, isOptionDisabled: true });
    await addAnswersToProgress([record]);
  };

  const handleResetCurrent = async () => {
    const q = currentQuestion();
    if (!q) return;
    setQuizState("userAnswers", (prev) => prev.filter((a) => a.$id !== q.$id));
    setQuizState({ selectedOption: 7, isOptionDisabled: false });
    await deleteAnswerById(q.$id);
  };

  // حل كل الأسئلة الظاهرة حالياً (حسب الفلتر الفعّال) بالإجابة الصحيحة
  const handleSolveAll = async () => {
    const all = orderedQs();
    const records = all.map((q) =>
      buildAnswerRecord(q, q.correctIndex, q.options?.[q.correctIndex] ?? ""),
    );
    setQuizState({
      userAnswers: records,
      selectedOption: 7,
      isOptionDisabled: false,
    });
    await addAnswersToProgress(records);
    toast(`✅ تم حل ${all.length.toLocaleString("ar")} سؤال`, {
      duration: 2500,
    });
  };

  // إلغاء حل الكل — يمسح إجابات الأسئلة الظاهرة حالياً من قاعدة
  // البيانات المحلية فعلياً (مو بس من الشاشة)، عشان ما ترجع تطلع
  // "محلولة" لما تدخل الكويز مرة ثانية.
  const handleClearAll = async () => {
    const ids = orderedQs().map((q) => q.$id);
    setQuizState({
      userAnswers: [],
      selectedOption: 7,
      isOptionDisabled: false,
    });
    await deleteAnswersByIds(ids);
    toast("🗑️ تم إلغاء حل كل الأسئلة", { duration: 2500 });
  };

  // ✅ يُستدعى بعد تعديل/حذف سؤال من لوحة الأدمن داخل الكويز
  const handleQuestionChanged = async () => {
    const target = currentQuestion();
    if (!target) {
      refetchQuestions();
      return;
    }

    // نجيب السؤال المعدَّل بس (lookup مباشر بالـ$id، رخيص) ونستبدله
    // مكانه بالمصفوفة الحالية — بدل استبدال المصفوفة كاملة عبر
    // refetchQuestions(). هاد هو الإصلاح الفعلي لمشكلة رجوع الscroll
    // للسؤال الأول: باقي الأسئلة تحتفظ بنفس مرجع الكائن (Object
    // reference) بالضبط زي ما كانت، فـ<For> بـQuizFeed بيحدّث شريحة
    // هاد السؤال بس بدل ما يهدم كل الشرائح ويعيد بناءها (اللي هو يلي
    // كان يصفّر scrollTop للحاوية). effect إعادة الscroll بـQuizFeed
    // ضل موجود كطبقة أمان إضافية بس مش هو الحل الأساسي بعد هلق.
    const updated = await getQuestionById(target.$id);

    if (!updated) {
      // انحذف السؤال (أو صار غير متطابق مع الفلتر الحالي) — الحالة
      // الوحيدة يلي لازم فيها إعادة بناء المصفوفة كاملة فعلاً، لأن
      // عدد/ترتيب الأسئلة نفسه تغيّر.
      refetchQuestions();
      setQuizState({ selectedOption: 7, isOptionDisabled: false });
      return;
    }

    mutateFilterResult((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) =>
              q.$id === updated.$id ? updated : q,
            ),
          }
        : prev,
    );

    setQuizState({ selectedOption: 7, isOptionDisabled: false });
  };

  // إذا حُذف السؤال الأخير، نصحح الموضع كي لا يبقى خارج الحدود
  createEffect(() => {
    const len = orderedQs().length;
    if (len > 0 && quizState.index >= len) {
      setQuizState("index", len - 1);
    }
  });

  // آخر سؤال انجاب؟ → يظهر زر "إظهار النتيجة" بالفوتر
  // (كان محسوب جوّا QuizFeed، نقلناه هون لأن الزر صار بالفوتر)
  const isLastAnswered = createMemo(() => {
    const qs = orderedQs();
    const last = qs[qs.length - 1];
    return !!last && answeredMap().has(last.$id);
  });

  const finishQuiz = () => {
    addAnswersToProgress(unwrap(quizState.userAnswers));
    setQuizState("showResult", true);
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Show
        when={!quizState.showResult}
        fallback={
          <Result
            subject={subject}
            section={section || "quiz"}
            answers={quizState.userAnswers}
          />
        }
      >
        <div class="dark:text-ink-dark p-5 bg-main-light dark:bg-main-dark flex h-screen flex-col overflow-hidden select-none">
          <header>
            <div class="flex items-center justify-between">
              <button onClick={() => history.back()}>
                <LeftArrow />
              </button>
              <h1 class="text-xl font-bold">{subjectName()}</h1>
              <button>
                <svg
                  on:click={(e) => {
                    e.stopPropagation();
                    setAudio(!audioEnabled());
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                  width="26px"
                  height="26px"
                  viewBox="0 0 24 24"
                >
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3.158 13.93a3.75 3.75 0 0 1 0-3.86a1.5 1.5 0 0 1 .993-.7l1.693-.339a.45.45 0 0 0 .258-.153L8.17 6.395c1.182-1.42 1.774-2.129 2.301-1.938S11 5.572 11 7.42v9.162c0 1.847 0 2.77-.528 2.962c-.527.19-1.119-.519-2.301-1.938L6.1 15.122a.45.45 0 0 0-.257-.153L4.15 14.63a1.5 1.5 0 0 1-.993-.7Z" />
                    <Show
                      when={audioEnabled()}
                      fallback={
                        <path stroke-linecap="round" d="m15 15l6-6m0 6l-6-6" />
                      }
                    >
                      <path
                        stroke-linecap="round"
                        d="M15.536 8.464a5 5 0 0 1 .027 7.044m4.094-9.165a8 8 0 0 1 .044 11.27"
                      />
                    </Show>
                  </g>
                </svg>
              </button>
            </div>

            <div class="mt-5 flex text-sm flex-wrap items-center justify-between gap-1">
              <span>
                {quizState.index + 1} / {orderedQs().length}
              </span>

              <div class="dark:bg-lighter-dark-1 dark:border-lighter-dark-2 flex items-center justify-between bg-surface-light">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterSheetOpen(true)}
                    class="relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    classList={{
                      "bg-main text-white": activeFilterCount(filters()) > 0,
                      "bg-chip-light text-ink-soft-light dark:bg-lighter-dark-2 dark:text-ink-soft-dark":
                        activeFilterCount(filters()) === 0,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z" />
                    </svg>
                    فلترة
                    <Show when={activeFilterCount(filters()) > 0}>
                      <span class="bg-secondary flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white">
                        {activeFilterCount(filters())}
                      </span>
                    </Show>
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolsSheetOpen(true)}
                    class="dark:bg-lighter-dark-2 flex items-center gap-1.5 rounded-full bg-chip-light px-3 py-1 text-xs font-bold text-ink-soft-light dark:text-ink-soft-dark"
                  >
                    🛠️ أدوات
                  </button>
                </div>
              </div>

              <div class="text-secondary flex items-center gap-2 rounded-full py-1 ">
                <span>{formatTime()}</span>
                <button onClick={() => setIsPaused(!isPaused())}>
                  <Show
                    when={isPaused()}
                    fallback={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M16 19q-.825 0-1.412-.587T14 17V7q0-.825.588-1.412T16 5t1.413.588T18 7v10q0 .825-.587 1.413T16 19m-8 0q-.825 0-1.412-.587T6 17V7q0-.825.588-1.412T8 5t1.413.588T10 7v10q0 .825-.587 1.413T8 19"
                        />
                      </svg>
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m-1 13c0 .55-.45 1-1 1s-1-.45-1-1V9c0-.55.45-1 1-1s1 .45 1 1zm5.02-2.22l-2.4 1.92a.998.998 0 0 1-1.62-.78v-3.84c0-.84.97-1.3 1.62-.78l2.4 1.92c.5.4.5 1.16 0 1.56"
                      />
                    </svg>
                  </Show>
                </button>
              </div>
            </div>

            <div class="mt-2 h-2 w-full rounded-full bg-darker-light-2">
              <div
                class="bg-main h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((quizState.index + 1) / orderedQs().length) * 100}%`,
                }}
              />
            </div>
          </header>

          <Show
            when={filterResult.latest}
            fallback={
              <div class="flex flex-1 items-center justify-center text-sm text-ink-muted-light">
                جاري التحميل...
              </div>
            }
          >
            <QuizFeed
              questions={orderedQs()}
              passageMap={passageMap()}
              sectionNames={sectionNames()}
              subject={subject}
              subjectName={subjectName()}
              answeredMap={answeredMap()}
              weakAttemptsMap={weakAttemptsMap()}
              startIndex={quizState.index}
              onSelect={handleOptionSelect}
              onIndexChange={(idx) => setQuizState("index", idx)}
            />
          </Show>

          <QuizFilterSheet
            subject={subject}
            sections={sections.latest}
            open={filterSheetOpen()}
            filters={filters()}
            onChange={setFilters}
            onClose={() => setFilterSheetOpen(false)}
          />
          <QuizToolsSheet
            open={toolsSheetOpen()}
            hasCurrentQuestion={!!currentQuestion()}
            onSolveCurrent={handleSolveCurrent}
            onResetCurrent={handleResetCurrent}
            onSolveAll={handleSolveAll}
            onClearAll={handleClearAll}
            onClose={() => setToolsSheetOpen(false)}
          />

          <QuizFooter
            isDisabled={quizState.isOptionDisabled}
            currentQuestion={currentQuestion()}
            passage={currentPassage()?.content}
            userAnswer={quizState.userAnswers[quizState.index]}
            subjectId={subject}
            onQuestionChanged={handleQuestionChanged}
            canFinish={isLastAnswered()}
            onFinish={finishQuiz}
          />
        </div>
      </Show>
    </Suspense>
  );
}

function LoadingSpinner() {
  return (
    <div class="flex h-screen items-center justify-center">جاري التحميل...</div>
  );
}
