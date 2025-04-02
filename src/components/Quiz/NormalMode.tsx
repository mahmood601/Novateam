import { useBeforeLeave, useParams } from "@solidjs/router";
import {
  Accessor,
  createEffect,
  createResource,
  createSignal,
  For,
  onCleanup,
  Setter,
  Show,
  Suspense,
} from "solid-js";
import LeftArrow from "../Icons/LeftArrow";
import subjects from "../subjects";
import { addAnswersToProgress, getQuestions } from "../../helpers/indexeddb";
import { useAudio } from "../../hooks/useAudio";
import { unwrap } from "solid-js/store";

type userAnswerT = {
  questionId: string;
  subject: string;
  state: boolean;
  answer: boolean;
};

const success = "/success.mp3";
const wrong = "/wrong.mp3";
const { audioEnabled, setAudioEnabled, playSound } = useAudio(success, wrong);

const [userAnswers, setUserAnswers] = createSignal<userAnswerT[]>([]);

const resetOpts = () => {
  setChoosed(7);
  setDisabled(false);
};

export default function NormalMode() {
  const subject = useParams().subject;
  const sectionName = useParams().section.split("-").at(0) as "season" | "year";
  const sectionValue = useParams().section.split("-").at(1) as string;

  const [showResult, setShowResult] = createSignal(false);
  const [index, setIndex] = createSignal(0);

  const [questions] = createResource(
    async () => {
      return await getQuestions(subject, sectionName, sectionValue);
    },
    { deferStream: true },
  );

  onCleanup(() => {
    setUserAnswers([]);
    resetOpts();
  });

  window.onbeforeunload = (e) => {
    e.preventDefault();
  };
  createEffect(() => {
    document.documentElement.classList.add(
      localStorage.getItem("theme") || "light",
    );
  });

  return (
    <Suspense>
      <Show when={questions() && !showResult()}>
        <Show
          when={questions()?.length > 0}
          fallback={
            <div class="bg-main-light dark:bg-main-dark flex h-screen w-screen items-center justify-center text-main-dark dark:text-main-light">
              <p dir="rtl">لم يتم تنزيل أية اسئلة 😐</p>
            </div>
          }
        >
          <div class="dark:text-main-light bg-main-light dark:bg-main-dark top-0 z-50 flex h-screen flex-col">
            <QuizHeader
              subjectName={subjects[subject].name}
              questionsLength={questions()?.length}
              index={index}
            />

            <QuizBox
              qs={questions()}
              index={index}
              setIndex={setIndex}
              subject={subject}
            />

            <QuizFooter
              qs={questions()}
              index={index}
              setIndex={setIndex}
              showResult={showResult}
              setShowResult={setShowResult}
            />
          </div>{" "}
        </Show>
      </Show>
      <Show when={showResult()}>
        <Result subject={subject} />
      </Show>
    </Suspense>
  );
}

function QuizHeader(props: {
  subjectName: string;
  index: Accessor<number>;
  questionsLength: number;
}) {
  const [time, setTime] = createSignal("");
  const [timerInsec, setTimerInsec] = createSignal(0);
  setTimerInsec(props.questionsLength * 60);

  const h = () => Math.floor(timerInsec() / 3600);
  const min = () => Math.floor((timerInsec() % 3600) / 60);
  const sec = () => Math.floor(timerInsec() % 60);

  createEffect(() => {
    const timer = setTimeout(() => {
      setTimerInsec(timerInsec() - 1);
    }, 1000);

    if (
      timerInsec() <= 0 ||
      (props.index() == props.questionsLength - 1 && disabled())
    ) {
      clearTimeout(timer);
    }
    if (h() > 0) {
      setTime(`${h()}h ${min()}min ${sec()}s`);
    }
    if (h() <= 0 && min() >= 0) {
      setTime(`${min()}min ${sec()}s`);
      if (min() == 0) {
        setTime(` ${sec()}s`);
      }
    }

    onCleanup(() => {
      clearTimeout(timer);
    });
  });

  return (
    <div class="p-5">
      <div class="flex justify-between">
        <button
          class="cursor-pointer"
          onClick={() => {
            history.back();
          }}
        >
          <LeftArrow />
        </button>
        <p class="text-xl font-bold">{props.subjectName}</p>
        <svg
          on:click={(e) => {
            e.stopPropagation();
            setAudioEnabled(!audioEnabled());
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
              fallback={<path stroke-linecap="round" d="m15 15l6-6m0 6l-6-6" />}
            >
              <path
                stroke-linecap="round"
                d="M15.536 8.464a5 5 0 0 1 .027 7.044m4.094-9.165a8 8 0 0 1 .044 11.27"
              />
            </Show>
          </g>
        </svg>
      </div>
      <div class="my-5 flex items-center justify-between">
        <span class="block py-2">
          {props.index() + 1}/{props.questionsLength}
        </span>
        <span class="text-secondary bg-secondary/20 flex items-center rounded-full p-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20px"
            height="20px"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M10 3q-.425 0-.712-.288T9 2t.288-.712T10 1h4q.425 0 .713.288T15 2t-.288.713T14 3zm2 11q.425 0 .713-.288T13 13V9q0-.425-.288-.712T12 8t-.712.288T11 9v4q0 .425.288.713T12 14m0 8q-1.85 0-3.488-.712T5.65 19.35t-1.937-2.863T3 13t.713-3.488T5.65 6.65t2.863-1.937T12 4q1.55 0 2.975.5t2.675 1.45l.7-.7q.275-.275.7-.275t.7.275t.275.7t-.275.7l-.7.7Q20 8.6 20.5 10.025T21 13q0 1.85-.713 3.488T18.35 19.35t-2.863 1.938T12 22"
            />
          </svg>
          <span class="block">{time()}</span>
        </span>
      </div>
      <span class="bg-main/50 my-5 block h-3 w-full rounded-full">
        <span
          style={{
            width: `${((props.index() + 1) / props.questionsLength) * 100}%`,
          }}
          class={`bg-main block h-3 rounded-full transition-normal duration-300`}
        ></span>
      </span>
    </div>
  );
}

const [choosed, setChoosed] = createSignal(7);
const [disabled, setDisabled] = createSignal(false);

function QuizBox(props: {
  qs: any;
  index: Accessor<number>;
  setIndex: Setter<number>;
  subject: string;
}) {
  //TODO: remember to send data to indexeddb
  useBeforeLeave((e) => {
    if (!e.defaultPrevented) {
      e.preventDefault();
      setTimeout(() => {
        if (
          confirm("هل حقا تريد المغادرة ام أنك ضغط بالخطأ على زر الرجوع؟ 🤔")
        ) {
          e.retry(true);
        }
      }, 100);
    }
    addAnswersToProgress(unwrap(userAnswers()));
  });

  const currentQ = () => props.qs[props.index()];
  const options = () =>
    Object.keys(currentQ()).filter((key) => key.includes("Option"));
  return (
    <div class="bg-main-light dark:bg-main-dark px-5">
      <div class="flex flex-row-reverse">
        <span dir="rtl">{props.index() + 1}.</span>
        <p dir="auto">{currentQ()?.question}</p>
      </div>

      <ul
        classList={{
          "mt-5  h-fit w-full rounded-xl border-2 border-darker-light-2 p-2":
            true,
          "pointer-events-none": disabled(),
        }}
      >
        <For each={options()}>
          {(opt, index) => (
            <Show when={currentQ()[opt] != ""}>
              <li
                on:click={(e) => {
                  playSound(currentQ().correctIndex.indexOf(index()) != -1);
                  setUserAnswers(
                    (answers) =>
                      [
                        ...answers,
                        {
                          $id: currentQ().$id,
                          subject: props.subject,
                          state: true,
                          answer:
                            currentQ().correctIndex.indexOf(index()) != -1,
                        },
                      ] as userAnswerT[],
                  );
                  setDisabled(true);
                  setChoosed(index());
                }}
                classList={{
                  "text-true":
                    currentQ().correctIndex.includes(choosed()) &&
                    index() == choosed(),
                  "text-warn":
                    !currentQ().correctIndex.includes(choosed()) &&
                    index() == choosed(),
                  "flex flex-row-reverse items-center": true,
                }}
              >
                <button class="ml-2 flex size-4 items-center justify-center rounded-full border-2 border-current">
                  <span
                    classList={{
                      "bg-current ": choosed() == index(),
                      "block h-4/6 w-4/6 rounded-full": true,
                    }}
                  ></span>
                </button>
                <p>{currentQ()[opt]}</p>
              </li>
            </Show>
          )}
        </For>
      </ul>
    </div>
  );
}

function QuizFooter(props: {
  qs: any;
  index: Accessor<number>;
  setIndex: Setter<number>;
  setShowResult: Setter<boolean>;
  showResult: Accessor<boolean>;
}) {
  const answerState = () => userAnswers()[userAnswers().length - 1]?.answer;
  return (
    <div class="bg-main-light dark:bg-main-dark flex h-1/4 flex-col items-center py-5">
      <div class="flex w-full max-w-11/12 items-center justify-between">
        <button
          disabled={props.index() <= 0}
          onClick={() => {
            props.setIndex(props.index() - 1);
            resetOpts();
            userAnswers().pop();
          }}
          class="bg-main/70 dark:bg-main flex cursor-pointer items-center rounded-full px-3 py-2"
        >
          <LeftArrow />
          <p class="mr-2"> السابق </p>
        </button>
        <button
          onClick={() => {
            if (props.index() >= props.qs.length - 1) {
              props.setShowResult(true);
            }
            if (props.index() < props.qs.length - 1) {
              props.setIndex(props.index() + 1);
            }
            resetOpts();
          }}
          disabled={!disabled()}
          class="bg-main/70 dark:bg-main flex cursor-pointer items-center rounded-full px-3 py-2"
        >
          <p class="ml-2">
            {props.index() >= props.qs.length - 1
              ? "إظهار النتيجة"
              : "التالي"}{" "}
          </p>
          <RightArrow />
        </button>
      </div>
      <Show when={disabled()}>
        <div class="flex items-center justify-around rounded-full py-1 pr-2 pl-4">
          <p
            classList={{
              "text-true": answerState(),
              "text-warn": !answerState(),
              "font-bold": true,
            }}
          >
            {answerState() ? "صحيح" : "خطأ"}
          </p>
          <span
            classList={{
              "bg-true": answerState(),
              "bg-warn": !answerState(),
              "text-main-light relative ml-1 h-fit w-fit rounded-full": true,
            }}
          >
            <span
              classList={{
                "bg-true": answerState(),
                "bg-warn": !answerState(),
                " absolute top-1/2 left-1/2 h-9/11 w-9/11 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-current/10":
                  true,
              }}
            ></span>
            <Show
              when={answerState()}
              fallback={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20px"
                  height="20px"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="1.5"
                    d="m8.464 15.535l7.072-7.07m-7.072 0l7.072 7.07"
                  />
                </svg>
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20px"
                height="20px"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  d="M18.03 7.97a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l3.47 3.47l6.47-6.47a.75.75 0 0 1 1.06 0"
                  clip-rule="evenodd"
                />
              </svg>
            </Show>
          </span>
        </div>

        <p class="mt-5 text-center text-3xl">
          {props.qs[props.index()].explanation}
        </p>
      </Show>
    </div>
  );
}

function RightArrow() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26px"
      height="26px"
      viewBox="0 0 24 24"
    >
      <g fill="none">
        <path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
        <path
          fill="currentColor"
          d="m15.06 5.283l5.657 5.657a1.5 1.5 0 0 1 0 2.12l-5.656 5.658a1.5 1.5 0 0 1-2.122-2.122l3.096-3.096H4.5a1.5 1.5 0 0 1 0-3h11.535L12.94 7.404a1.5 1.5 0 0 1 2.122-2.121Z"
        />
      </g>
    </svg>
  );
}

function Result(props: { subject: string }) {
  addAnswersToProgress(unwrap(userAnswers()));
  let numberOfTrues = 0;
  userAnswers().map((e) => {
    if (e.answer) numberOfTrues++;
  });
  return (
    <div class="bg-main-light dark:bg-main-dark dark:text-main-light absolute flex h-screen w-screen items-center justify-center">
      <div class="bg-darker-light-1 dark:bg-lighter-dark-1 max-w-1/2 rounded-md">
        <div class="p-2">
          <p dir="rtl">
            عدد الاسئلة : <span class="text-main">{userAnswers().length}</span>
          </p>
          <p dir="rtl">
            عدد الاجابات الصحيحة: <span class="text-true">{numberOfTrues}</span>
          </p>
          <p dir="rtl">
            عدد الاجابات الخاطئة:{" "}
            <span class="text-warn">
              {userAnswers().length - numberOfTrues}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
