import { createSignal, For, onMount, Show } from "solid-js";
import party from "party-js";
import { setStateStore } from "~/stores/testStore";
import { toast, Toaster } from "solid-toast";

export type TestProps = {
  id: number;
  question: string;
  correct: number;
  options: string[];
  explain: string | null;
};

export  function TestsList(props: { questions: TestProps[] }) {
  return (
    <div class="px-5 h-[calc(100vh_-_180px)] flex flex-col items-center gap-5 dark:bg-black dark:text-white text-lg overflow-y-scroll">
      <For each={props.questions}>
        {(question) => (
          <Test
            id={question.id}
            question={question.question}
            options={question.options}
            correct={question.correct}
            explain={question.explain}
          />
        )}
      </For>
    </div>
  );
}

let checkboxRef!: any;
let audio: HTMLMediaElement | any;

export default function Test(props: TestProps) {
  const [answer, setAnswer] = createSignal({ state: false, index: -1 });

  const beat = "/music/heartbeat.mp3";
  const beep = "/music/heartbeep.mp3";

  onMount(() => {
    audio = new Audio();
  });

  return (
    <div dir="rtl" class="bg-gray-300 dark:bg-[#222] p-5 w-full rounded-md">
      <div class="flex justify-between">
        <p class="inline-block pr-2 font-bold w-5/6">
          {props.id}. {props.question}
        </p>
        <Toaster position="top-center" />
        <svg
          onClick={() => {
            if (props.explain) {
              toast(props.explain, {
                duration: 1500,
                className:
                  "w-[calc(100vw_-_100px)] h-fit text-md wrap dark:bg-black dark:tet-white",
                style: {
                  "box-shadow": "none",
                  border: "2px solid #000",
                  direction: "rtl",
                  "text-wrap": "wrap",
                },
              });
            }
          }}
          xmlns="http://www.w3.org/2000/svg"
          width={26}
          height={26}
          viewBox="0 0 24 24"
        >
          <g
            fill={`${props.explain ? "#60a5fa" : "none"}`}
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={1.5}
            color="currentColor"
          >
            <path d="M5.143 14A7.8 7.8 0 0 1 4 9.919C4 5.545 7.582 2 12 2s8 3.545 8 7.919A7.8 7.8 0 0 1 18.857 14"></path>
            <path d="M14 10c-.613.643-1.289 1-2 1s-1.387-.357-2-1m-2.617 7.098c-.092-.276-.138-.415-.133-.527a.6.6 0 0 1 .382-.53c.104-.041.25-.041.54-.041h7.656c.291 0 .436 0 .54.04a.6.6 0 0 1 .382.531c.005.112-.041.25-.133.527c-.17.511-.255.767-.386.974a2 2 0 0 1-1.2.869c-.238.059-.506.059-1.043.059h-3.976c-.537 0-.806 0-1.043-.06a2 2 0 0 1-1.2-.868c-.131-.207-.216-.463-.386-.974M15 19l-.13.647c-.14.707-.211 1.06-.37 1.34a2 2 0 0 1-1.113.912C13.082 22 12.72 22 12 22s-1.082 0-1.387-.1a2 2 0 0 1-1.113-.913c-.159-.28-.23-.633-.37-1.34L9 19m3-3.5V11"></path>
          </g>
        </svg>
      </div>
      <ul>
        <For each={props.options}>
          {(option, index) => (
            <li
              onClick={(e) => {
                e.stopPropagation();
                audio.pause();

                if (index() === props.correct - 1) {
                  checkboxRef = e.currentTarget;
                  party.confetti(checkboxRef as HTMLElement, {
                    count: party.variation.range(20, 25),
                    shapes: ["star", "roundedSquare"],
                    spread: 40,
                  });
                  audio.src = beat;
                  setStateStore("numberOfCorrect", (n) => n + 1);
                } else {
                  audio.src = beep;
                }
                audio.play();

                setAnswer({ state: true, index: index() });
              }}
              class={`${
                answer().state ? "pointer-events-none" : ""
              } flex items-center w-fit`}
            >
              <Show
                when={index() !== answer().index}
                fallback={
                  <Checkbox
                    isAnswered={answer().state}
                    correct={answer().index == props.correct - 1}
                    isAnswer={index() == props.correct - 1}
                  />
                }
              >
                <Checkbox
                  isAnswered={answer().state}
                  correct={"notChoosen"}
                  isAnswer={index() == props.correct - 1}
                />
              </Show>
              <p class="pr-2 text-wrap h-fit w-fit">{option}</p>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

function Checkbox(props: {
  isAnswered: boolean;
  correct: boolean | "notChoosen";
  isAnswer: boolean;
}) {
  const getBorderColor = () => {
    return props.correct
      ? "border-green-600"
      : "border-blue-600 dark:border-blue-600";
  };

  const getBackgroundColor = () => {
    if (props.isAnswer && props.isAnswered) return "bg-pink-600";
    if (props.correct === "notChoosen") return "bg-none";
    return props.correct
      ? "bg-pink-400 dark:bg-pink-600"
      : "bg-blue-400 dark:bg-blue-600";
  };

  const getIcon = () => {
    if ((props.correct == "notChoosen" && !props.isAnswer) || !props.isAnswered)
      return null;
    if (props.isAnswered && !props.correct) return <Cross />;
    return props.correct ? <Check /> : <Cross />;
  };

  return (
    <div
      class={` ${getBorderColor()} ${getBackgroundColor()} border-pink-400 dark:border-pink-600 relative flex items-center justify-center w-5 h-5 border-2 rounded-xs`}
    >
      <span
        class={`h-0 absolute transition-all w-full bottom-0 ${getBackgroundColor()}`}
      ></span>
      {getIcon()}
    </div>
  );
}

function Check() {
  return (
    <svg
      class="text-black dark:text-white z-10 "
      xmlns="http://www.w3.org/2000/svg"
      width="1.5em"
      height="1.5em"
      viewBox="0 0 24 24"
    >
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={4}
        d="M5 11.917L9.724 16.5L19 7.5"
      ></path>
    </svg>
  );
}

function Cross() {
  return (
    <svg
      class="text-black dark:text-white z-10  "
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 15 15"
    >
      <path
        fill="currentColor"
        d="M3.64 2.27L7.5 6.13l3.84-3.84A.92.92 0 0 1 12 2a1 1 0 0 1 1 1a.9.9 0 0 1-.27.66L8.84 7.5l3.89 3.89A.9.9 0 0 1 13 12a1 1 0 0 1-1 1a.92.92 0 0 1-.69-.27L7.5 8.87l-3.85 3.85A.92.92 0 0 1 3 13a1 1 0 0 1-1-1a.9.9 0 0 1 .27-.66L6.16 7.5L2.27 3.61A.9.9 0 0 1 2 3a1 1 0 0 1 1-1c.24.003.47.1.64.27"
      />
    </svg>
  );
}
