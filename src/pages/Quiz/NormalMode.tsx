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
import QuizBox from "./QuizBox";
import QuizFooter from "./QuizFooter";
import Result from "./Result";
import { account } from "../../stores/account";
import { recordActivityToday } from "../../services/local/streak";

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

  const [questions] = createResource<Question[]>(
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
    console.log((await getPassagesForSubject(subject)));
    
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

  const currentPassage = createMemo(() => {
    const q = orderedQs()[quizState.index];
    if (!q?.passage_id) return null;
    return passages()?.find((p) => p.$id === q.passage_id) ?? null;
  });

  // ─── Navigation guard ─────────────────────────────────────────────────────────

  useBeforeLeave((e) => {
    if (
      !quizState.showResult &&
      !account.devMode &&
      !confirm("هل تريد مغادرة الاختبار؟ سيتم حفظ تقدمك.")
    ) {
      e.preventDefault();
    }
    sessionStorage.removeItem(SESSION_KEY); // مسح الموضع المحفوظ عند المغادرة
    addAnswersToProgress(unwrap(quizState.userAnswers));
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleOptionSelect = (q: Question, optIdx: number, content: string) => {
    const isCorrect = q.correctIndex == optIdx;

    recordActivityToday(); // ← تسجيل نشاط اليوم

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
        },
      ],
    });
  };

  const nextQuestion = () => {
    if (quizState.index >= orderedQs().length - 1) {
      setQuizState("showResult", true);
    } else {
      setQuizState({
        index: quizState.index + 1,
        selectedOption: 7,
        isOptionDisabled: false,
      });
    }
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Show
        when={!quizState.showResult}
        fallback={<Result subject={subject} answers={quizState.userAnswers} />}
      >
        <div class="dark:text-main-light bg-main-light dark:bg-main-dark flex h-screen flex-col overflow-hidden select-none">
          <QuizHeader
            subjectName={subjectInfo()?.name ?? subject}
            index={quizState.index}
            isDisabled={quizState.isOptionDisabled}
            total={orderedQs().length}
            currentQuestion={orderedQs()[quizState.index]}
            userAnswer={quizState.userAnswers[quizState.index]}
          />

          <main class="flex-1 overflow-y-auto px-5">
            <QuizBox
              question={orderedQs()[quizState.index]}
              index={quizState.index}
              subject={subject}
              selectedOption={quizState.selectedOption}
              isDisabled={quizState.isOptionDisabled}
              onSelect={handleOptionSelect}
              currentQuestion={orderedQs()[quizState.index]}
              passage={currentPassage()}
            />
          </main>

          <QuizFooter
            index={quizState.index}
            total={orderedQs().length}
            isDisabled={!quizState.isOptionDisabled}
            onNext={nextQuestion}
            onPrev={() => {
              setQuizState("index", Math.max(0, quizState.index - 1));
              setQuizState({ selectedOption: 7, isOptionDisabled: false });
            }}
            isCorrect={
              quizState.userAnswers[quizState.userAnswers.length - 1]?.answer
            }
            explanation={orderedQs()[quizState.index]?.explanation}
            showExplanation={quizState.isOptionDisabled}
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
