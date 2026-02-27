import { useBeforeLeave, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
} from "solid-js";
import subjects from "../../components/subjects";
import {
  addAnswersToProgress,
  getQuestionsOrAnswersWithFilter,
  Question,
} from "../../utils/indexeddb";
import { useAudio } from "../../hooks/useAudio";
import { unwrap } from "solid-js/store";
import { quizType } from "../../stores/quizType";
import QuizHeader from "./QuizHeader";
import { quizState, setQuizState } from "./quizStore";
import QuizBox from "./QuizBox";
import QuizFooter from "./QuizFooter";
import Result from "./Result";

export default function NormalMode() {
  const subject = useParams().subject;
  const sectionName = useParams().section.split("-").at(0) as "season" | "year";
  const sectionValue = useParams().section.split("-").at(1) as string;
  const { playSound } = useAudio();

  // 2. Data Fetching
  const [questions] = createResource(
    () => {
      return getQuestionsOrAnswersWithFilter(
        subject,
        "questions",
        sectionName,
        sectionValue,
      );
    },
    { deferStream: true },
  );

  const [answers] = createResource(
    async () => {
      return await getQuestionsOrAnswersWithFilter(
        subject,
        "answers",
        sectionName,
        sectionValue,
      );
    },
    { deferStream: true },
  );

  // 3. Logic: Ordered Questions (Memoized for performance)
  const orderedQs = createMemo(() => {
    const qs = questions();
    const ans = answers();

    if (!qs) return [];
    if (quizType() !== "continue" || !ans) return qs;

    const answerIds = new Set(ans.map((a) => a.$id));
    const answered = qs.filter((q) => answerIds.has(q.$id));
    const unanswered = qs.filter((q) => !answerIds.has(q.$id));

    // update signal to start from where the user stoped
    setQuizState("index", Math.max(0, answered.length - 1));
    return [...answered, ...unanswered];
  });

  useBeforeLeave((e) => {
    if (
      !quizState.showResult &&
      !confirm("هل تريد مغادرة الاختبار؟ سيتم حفظ تقدمك.")
    ) {
      e.preventDefault();
    }
    addAnswersToProgress(unwrap(quizState.userAnswers));
  });

  const handleOptionSelect = (q: Question, optIdx: number, content: string) => {
    const isCorrect = q.correctIndex.includes(optIdx);

    if (quizState.audioEnabled) playSound(isCorrect);

    setQuizState({
      selectedOption: optIdx,
      isOptionDisabled: true,
      userAnswers: [
        ...quizState.userAnswers,
        {
          $id: q.$id,
          subject,
          year: q.year,
          season: q.season,
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
            subjectName={subjects[subject].name}
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
