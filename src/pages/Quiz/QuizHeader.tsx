import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import LeftArrow from "../../components/Icons/LeftArrow";
import { useAudio } from "../../hooks/useAudio";
import FavoriteButton from "./Favorite";

export default function QuizHeader(props: {
  total: number;
  index: number;
  subjectName: string;
  currentQuestion: any;
  userAnswer: any;
  isDisabled: boolean;
}) {
  const [timeLeft, setTimeLeft] = createSignal(0);
  const [isPaused, setIsPaused] = createSignal(false);

  createEffect(() => {
    setTimeLeft((props.total - props.index) * 60);
  });
  const { audioEnabled, setAudio } = useAudio();

  onMount(() => {
    const timer = setInterval(() => {
      if (!isPaused() && timeLeft() > 0) setTimeLeft((t) => t - 1);
    }, 1000);
    onCleanup(() => clearInterval(timer));
  });

  const formatTime = () => {
    const m = Math.floor(timeLeft() / 60);
    const s = timeLeft() % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  console.log(timeLeft());

  return (
    <header class="p-5">
      <div class="flex items-center justify-between">
        <button onClick={() => history.back()}>
          <LeftArrow />
        </button>
        <h1 class="text-xl font-bold">{props.subjectName}</h1>
        <button>
          {/* Audio Icon Logic */}
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

      <div class="mt-4 flex items-center justify-between">
        <span>
          {props.index + 1} / {props.total}
        </span>

        <FavoriteButton
          question={props.currentQuestion}
          userAnswer={props.userAnswer.answerContent}
        />

        <div class="text-secondary flex items-center gap-2 rounded-full bg-current/5 px-3 py-2">
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

      <div class="mt-4 h-2 w-full rounded-full bg-gray-200">
        <div
          class="bg-main h-full rounded-full transition-all duration-300"
          style={{ width: `${((props.index + 1) / props.total) * 100}%` }}
        />
      </div>
    </header>
  );
}
