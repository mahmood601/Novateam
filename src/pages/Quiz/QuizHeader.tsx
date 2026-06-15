import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import LeftArrow from "../../components/Icons/LeftArrow";
import { useAudio } from "../../hooks/useAudio";
import FavoriteButton from "./Favorite";
import GeminiPanel from "../../components/GeminiPanel";

export default function QuizHeader(props: {
  total: number;
  index: number;
  subjectName: string;
  currentQuestion: any;
  userAnswer: any;
  isDisabled: boolean;
  onTimeUp?: () => void;
  onTimeWarning?: () => void;
}) {
  const [timeLeft, setTimeLeft] = createSignal(0);
  const [isPaused, setIsPaused] = createSignal(false);
  const [geminiOpen, setGeminiOpen] = createSignal(false);

  createEffect(() => {
    setTimeLeft((props.total - 1) * 60);
  });

  const { audioEnabled, setAudio } = useAudio();

  onMount(() => {
    const timer = setInterval(() => {
      if (isPaused()) return;
      if (timeLeft() <= 0) return;
      if (timeLeft() === 60) {
        // تنبيه آخر دقيقة
        props.onTimeWarning?.();
      }
      setTimeLeft((t) => t - 1);
      if (timeLeft() - 1 <= 0) {
        props.onTimeUp?.();
      }
    }, 1000);
    onCleanup(() => clearInterval(timer));
  });

  const formatTime = () => {
    const m = Math.floor(timeLeft() / 60);
    const s = timeLeft() % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <header class="p-5">
      <div class="flex items-center justify-between">
        <button onClick={() => history.back()}>
          <LeftArrow />
        </button>
        <h1 class="text-xl font-bold">{props.subjectName}</h1>
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

      <div class="mt-4 flex flex-wrap items-center justify-between gap-1">
        <span>
          {props.index + 1} / {props.total}
        </span>

        <FavoriteButton
          question={props.currentQuestion}
          userAnswer={props.userAnswer?.answerContent}
        />

        {/* زر AI */}
        <button
          onClick={() => setGeminiOpen(true)}
          class="flex items-center justify-center rounded-full bg-gray-100 p-2 transition hover:scale-105 dark:bg-gray-800"
          title="مساعد AI"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.5em"
            height="1.5em"
            viewBox="0 0 14 14"
          >
            <path d="M0 0h14v14H0z" fill="none" />
            <g
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6.022 4.347a18.5 18.5 0 0 0-1.93 1.686C1.248 8.877-.192 12.046.874 13.113c1.066 1.066 4.236-.375 7.079-3.218a18.5 18.5 0 0 0 1.686-1.931" />
              <path d="M9.639 7.964c1.677 2.226 2.36 4.32 1.532 5.148c-1.067 1.067-4.236-.374-7.08-3.217C1.249 7.05-.191 3.882.875 2.815c.828-.827 2.922-.144 5.148 1.532" />
              <path d="M5.522 7.964a.5.5 0 1 0 1 0a.5.5 0 0 0-1 0m2.51-4.354c-.315-.055-.315-.506 0-.56a2.84 2.84 0 0 0 2.29-2.193L10.34.77c.068-.31.51-.312.58-.003l.024.101a2.86 2.86 0 0 0 2.296 2.18c.316.055.316.509 0 .563a2.86 2.86 0 0 0-2.296 2.18l-.024.101c-.07.31-.512.308-.58-.002l-.02-.087A2.84 2.84 0 0 0 8.03 3.61" />
            </g>
          </svg>
        </button>

        <GeminiPanel
          open={geminiOpen()}
          onClose={() => setGeminiOpen(false)}
          question={props.currentQuestion}
        />

        <div class="text-secondary flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800">
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
