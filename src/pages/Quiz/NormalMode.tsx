import { useBeforeLeave, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  onMount,
  Show,
  Suspense,
} from "solid-js";

import {
  addAnswersToProgress,
  getQuestionsOrAnswersWithFilter,
  getSubjectsOfflineFirst,
  syncPassagesOfflineFirst,
  getPassagesForSubject,
  Question,
  Answer,
} from "../../services/local/indexeddb";
import { useAudio } from "../../hooks/useAudio";
import { unwrap } from "solid-js/store";
import { quizType } from "../../stores/quizType";
// unwrap مستخدم في useBeforeLeave أدناه
import QuizHeader from "./QuizHeader";
import { quizState, resetQuizState, setQuizState } from "./quizStore";
import QuizFeed from "./QuizFeed";
import Result from "./Result";
import { recordActivityToday } from "../../services/local/streak";
import { toast } from "solid-toast";

export default function NormalMode() {
  const subject = useParams().subject;

  // section param: "season_id-5" أو "year_id-2024"
  const sectionType = useParams().section.split("-").at(0) as
    | "season_id"
    | "year_id";
  const sectionId = Number(useParams().section.split("-").at(1));

  const { playSound } = useAudio();
  const [subjectInfo] = createResource(async () => {
    const yearKey = localStorage.getItem("year") ?? "";
    const subjects = await getSubjectsOfflineFirst(yearKey);
    return subjects.find((item) => item.id === subject);
  });

  const SESSION_KEY = `quiz_index_${subject}_${sectionType}_${sectionId}`;

  onMount(() => {
    // ✅ إصلاح: نستعيد الموضع المحفوظ أولاً قبل reset
    // resetQuizState كانت تمسح index=0 ثم تُعاد الكتابة صح، لكن
    // المشكلة أن createResource يبدأ بـ loading وعندما ينتهي يُعيد الـ render
    // فتبدو كأن الصفحة أعادت التحميل. الحل: نحفظ الـ saved ونُطبقه بعد reset.
    const saved = parseInt(sessionStorage.getItem(SESSION_KEY) ?? "0");

    resetQuizState();

    // استعادة الموضع المحفوظ (يتجاوز index=0 الذي يضعه resetQuizState)
    if (saved > 0) setQuizState("index", saved);

    // في وضع "continue" فقط: نقفز للسؤال غير المجاب
    if (quizType() === "continue") {
      getQuestionsOrAnswersWithFilter(
        subject,
        "answers",
        sectionType,
        sectionId,
      ).then((ans) => {
        // نتجاهل إذا كان المستخدم قد استأنف يدوياً من sessionStorage
        if (saved > 0) return;
        if (ans.length > 0) {
          const nextIndex = ans.length; // أول سؤال لم يُجب عنه
          setQuizState("index", nextIndex);
        }
      });
    }
  });

  // حفظ الموضع عند كل تغيير
  createEffect(() => {
    sessionStorage.setItem(SESSION_KEY, String(quizState.index));
  });

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const [questions, { refetch: refetchQuestions }] = createResource<
    Question[]
  >(
    () =>
      getQuestionsOrAnswersWithFilter(
        subject,
        "questions",
        sectionType,
        sectionId,
      ) as Promise<Question[]>,
    { deferStream: true },
  );

  const [answers] = createResource<Answer[]>(
    () =>
      getQuestionsOrAnswersWithFilter(
        subject,
        "answers",
        sectionType,
        sectionId,
      ) as Promise<Answer[]>,
    { deferStream: true },
  );

  // ─── Passages ─────────────────────────────────────────────────────────────
  const [passages] = createResource(async () => {
    await syncPassagesOfflineFirst(subject);
    return (await getPassagesForSubject(subject)).reverse();
  });

  // ─── Ordered Questions ────────────────────────────────────────────────────────

  const orderedQs = createMemo(() => {
    const qs = questions();
    const ans = answers();

    if (!qs) return [];

    const groupByPassage = (items: Question[]) => {
      const passageGroups = new Map<string, Question[]>();
      const passageOrder: string[] = [];
      const noPassage: Question[] = [];

      for (const q of items) {
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
    };

    const groupedQs = groupByPassage(qs);
    if (quizType() !== "continue" || !ans) return groupedQs;

    const answerIds = new Set(ans.map((a) => a.$id));
    const firstUnansweredIndex = groupedQs.findIndex(
      (q) => !answerIds.has(q.$id),
    );
    const resumeIndex =
      firstUnansweredIndex >= 0
        ? firstUnansweredIndex
        : Math.max(0, groupedQs.length - 1);

    setQuizState("index", resumeIndex);

    return groupedQs;
  });

  // الفقرة (Passage) الخاصة بالسؤال الظاهر حاليًا — تُستخدم كسياق لمساعد AI بالهيدر
  const currentPassage = createMemo(() => {
    const q = orderedQs()[quizState.index];
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

  useBeforeLeave((e) => {
    // if (
    //   !quizState.showResult &&
    //   !confirm("هل تريد مغادرة الاختبار؟ سيتم حفظ تقدمك.")
    // ) {
    //   e.preventDefault();
    // }
    sessionStorage.removeItem(SESSION_KEY); // مسح الموضع المحفوظ عند المغادرة
    addAnswersToProgress(unwrap(quizState.userAnswers));
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleOptionSelect = (q: Question, optIdx: number, content: string) => {
    const isCorrect = q.correctIndex == optIdx;

    recordActivityToday();

    if (quizState.audioEnabled) playSound(isCorrect);

    setQuizState({
      selectedOption: optIdx,
      isOptionDisabled: true,
      userAnswers: [
        ...quizState.userAnswers,
        {
          $id: q.$id,
          subject,
          season_id: q.season_id,
          year_id: q.year_id,
          state: true,
          answer: isCorrect,
          answerContent: content,
          selectedIndex: optIdx,
          answeredAt: Date.now(),
          attempts: 1,
        },
      ],
    });
  };

  
  // ✅ يُستدعى بعد تعديل/حذف سؤال من لوحة الأدمن داخل الكويز
  const handleQuestionChanged = () => {
    refetchQuestions();
    // نُعيد فتح خيارات الإجابة لأن محتوى السؤال (وربما موضعه) تغيّر
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
        fallback={<Result subject={subject} section={useParams().section} answers={quizState.userAnswers} />}
      >
        <div class="dark:text-main-light bg-main-light dark:bg-main-dark flex h-screen flex-col overflow-hidden select-none">
          <QuizHeader
             subjectName={subjectInfo()?.name ?? subject}
            index={quizState.index}
            isDisabled={quizState.isOptionDisabled}
            total={orderedQs().length}
            currentQuestion={orderedQs()[quizState.index]}
            passage={currentPassage()?.content}
            userAnswer={quizState.userAnswers[quizState.index]}
            subjectId={subject}
            onQuestionChanged={handleQuestionChanged}
            onTimeWarning={() => toast("⏰ دقيقة أخيرة!", { duration: 3000 })}
            onTimeUp={() => {
              // تسليم تلقائي
              addAnswersToProgress(unwrap(quizState.userAnswers));
              setQuizState("showResult", true);
            }}
          />

          <QuizFeed
            questions={orderedQs()}
            passages={passages()}
            subject={subject}
            subjectName={subjectInfo()?.name ?? subject}
            answeredMap={answeredMap()}
            startIndex={quizState.index}
            onSelect={handleOptionSelect}
            onIndexChange={(idx) => setQuizState("index", idx)}
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
