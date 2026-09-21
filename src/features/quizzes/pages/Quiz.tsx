import { useBeforeLeave, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
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
} from "../services/local/indexeddb";
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
} from "../services/local/indexeddb/quizFilters";
import { useAudio } from "../../shared/hooks/useAudio";
import { unwrap } from "solid-js/store";
import QuizHeader from "../components/QuizHeader";
import QuizFilterSheet from "../components/QuizFilterSheet";
import QuizToolsSheet from "../components/QuizToolsSheet";
import { quizState, setQuizState } from "../utils/quizStore";
import QuizFeed from "../components/QuizFeed";
import Result from "../components/Result";
import { recordActivityToday } from "../services/local/streak";
import { toast } from "solid-toast";

export default function Quiz() {
  const subject = useParams().subject ?? "";
  // section غير موجود عند الدخول عبر الرابط الجديد (/:subject/quiz) —
  // موجود بس عند الدخول عبر رابط قديم محفوظ (season_id-N / year_id-N).
  const section = useParams().section ?? "";

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
  const [subjectInfo] = createResource(async () => {
    const yearKey = localStorage.getItem("year") ?? "";
    const subjects = await getSubjectsOfflineFirst(yearKey);
    return subjects.find((item) => item.id === subject);
  });

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

  const [filterResult, { refetch: refetchQuestions, mutate: mutateFilterResult }] = createResource(
    () => [subject, filters()] as const,
    ([subj, f]) => getQuestionsWithFilters(subj, f),
    { deferStream: true },
  );
  const questions = () => filterResult()?.questions;
  const weakAttemptsMap = createMemo(
    () => filterResult()?.weakAttemptsMap ?? new Map<string, number>(),
  );

  // ─── Passages ─────────────────────────────────────────────────────────────
  const [passages] = createResource(async () => {
    await syncPassagesOfflineFirst(subject);
    return (await getPassagesForSubject(subject)).reverse();
  });

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
      ...passageOrder.flatMap((passageId) => passageGroups.get(passageId) ?? []),
      ...noPassage,
    ];
  });

  const currentQuestion = () => orderedQs()[quizState.index];

  // الفقرة (Passage) الخاصة بالسؤال الظاهر حاليًا — تُستخدم كسياق لمساعد AI بالهيدر
  const currentPassage = createMemo(() => {
    const q = currentQuestion();
    if (!q?.passage_id) return null;
    return passages()?.find((p) => p.$id === q.passage_id) ?? null;
  });

  // خريطة الأسئلة المُجابة — تُستخدم لعرض كل سؤال بحالته في وضع التمرير
  const answeredMap = createMemo(() => {
    const map = new Map<string, { selectedIndex: number; isCorrect: boolean }>();
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
    const record = buildAnswerRecord(q, q.correctIndex, q.options?.[q.correctIndex] ?? "");
    setQuizState("userAnswers", (prev) => [...prev.filter((a) => a.$id !== q.$id), record]);
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
    setQuizState({ userAnswers: records, selectedOption: 7, isOptionDisabled: false });
    await addAnswersToProgress(records);
    toast(`✅ تم حل ${all.length.toLocaleString("ar")} سؤال`, { duration: 2500 });
  };

  // إلغاء حل الكل — يمسح إجابات الأسئلة الظاهرة حالياً من قاعدة
  // البيانات المحلية فعلياً (مو بس من الشاشة)، عشان ما ترجع تطلع
  // "محلولة" لما تدخل الكويز مرة ثانية.
  const handleClearAll = async () => {
    const ids = orderedQs().map((q) => q.$id);
    setQuizState({ userAnswers: [], selectedOption: 7, isOptionDisabled: false });
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

  const finishQuiz = () => {
    addAnswersToProgress(unwrap(quizState.userAnswers));
    setQuizState("showResult", true);
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Show
        when={!quizState.showResult}
        fallback={<Result subject={subject} section={section || "quiz"} answers={quizState.userAnswers} />}
      >
        <div class="dark:text-main-light bg-main-light dark:bg-main-dark flex h-screen flex-col overflow-hidden select-none">
          <QuizHeader
             subjectName={subjectInfo()?.name ?? subject}
            index={quizState.index}
            isDisabled={quizState.isOptionDisabled}
            total={orderedQs().length}
            currentQuestion={currentQuestion()}
            passage={currentPassage()?.content}
            userAnswer={quizState.userAnswers[quizState.index]}
            subjectId={subject}
            onQuestionChanged={handleQuestionChanged}
            onTimeWarning={() => toast("⏰ دقيقة أخيرة!", { duration: 3000 })}
            onTimeUp={() => {
              addAnswersToProgress(unwrap(quizState.userAnswers));
              setQuizState("showResult", true);
            }}
          />

          {/* شريط الفلترة + أدوات الحل داخل الكويز */}
          <div class="dark:bg-lighter-dark-1 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5 dark:border-lighter-dark-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                class="relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                classList={{
                  "bg-main text-white": activeFilterCount(filters()) > 0,
                  "bg-gray-100 text-gray-500 dark:bg-lighter-dark-2 dark:text-gray-300":
                    activeFilterCount(filters()) === 0,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
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
                class="dark:bg-lighter-dark-2 flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-300"
              >
                🛠️ أدوات
              </button>
            </div>

            <p class="text-[11px] text-gray-400">
              {orderedQs().length.toLocaleString("ar")} سؤال
            </p>
          </div>

          <QuizFeed
            questions={orderedQs()}
            passages={passages()}
            subject={subject}
            subjectName={subjectInfo()?.name ?? subject}
            answeredMap={answeredMap()}
            weakAttemptsMap={weakAttemptsMap()}
            startIndex={quizState.index}
            onSelect={handleOptionSelect}
            onIndexChange={(idx) => setQuizState("index", idx)}
            onFinish={finishQuiz}
          />
        </div>

        <QuizFilterSheet
          subject={subject}
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
      </Show>
    </Suspense>
  );
}

function LoadingSpinner() {
  return (
    <div class="flex h-screen items-center justify-center">جاري التحميل...</div>
  );
}
