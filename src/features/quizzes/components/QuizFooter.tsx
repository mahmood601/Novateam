import { createSignal, Show } from "solid-js";
import FavoriteButton from "./Favorite";
import GeminiPanel from "../../shared/components/GeminiPanel";
import { quizDisplayMode, setQuizDisplayMode } from "../utils/quizDisplayMode";
import { quizState } from "../utils/quizStore";
import AdminEditPanel from "./AdminEditPanel";
import { useUser } from "../../shared/context/user";
import ContentCredit from "../../shared/components/ContentCredit";

export default function QuizFooter(props: {
  currentQuestion: any;
  userAnswer: any;
  isDisabled: boolean;
  passage?: string;
  subjectId?: string;
  onQuestionChanged?: () => void;
  /** آخر سؤال انجاب → يظهر زر "إظهار النتيجة" */
  canFinish?: boolean;
  onFinish?: () => void;
}) {
  const [geminiOpen, setGeminiOpen] = createSignal(false);
  const [editOpen, setEditOpen] = createSignal(false);

  const { can } = useUser();
  // The in-quiz edit panel edits others' questions → needs "publish" in this subject
  const canEditHere = () =>
    !!props.subjectId && can("quiz", props.subjectId, "publish");



  return (
    <footer class="bg-main-light  dark:bg-main-dark shrink-0 px-4 pt-1 pb-2">
      {/* زر النتيجة — يظهر بعد الإجابة على آخر سؤال */}
      <Show when={props.canFinish}>
        <button
          onClick={() => props.onFinish?.()}
          class="bg-main mx-auto mb-2 flex w-full max-w-sm animate-[fadeIn_.25s_ease-in-out] items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg"
        >
          إظهار النتيجة
        </button>
      </Show>

      {/* من أضاف السؤال + آخر تعديل.
          keyed: كل سؤال جديد = نسخة جديدة من ContentCredit، عشان ما يبقى
          اسم كاتب السؤال السابق ظاهر لحد ما يوصل الجديد. */}
      <Show when={props.currentQuestion} keyed>
        {(q) => (
          <ContentCredit
            class="justify-center pb-1"
            createdBy={q.created_by ?? q.user_id}
            updatedBy={q.updated_by}
            updatedAt={q.updated_at}
          />
        )}
      </Show>

      <div class="flex items-center justify-center gap-4">

        <div class="flex justify-between w-fit items-center">
          <FavoriteButton
            question={props.currentQuestion}
            userAnswer={props.userAnswer?.answerContent}
          />

          {/* زر تبديل وضع العرض: عمودي / أفقي */}
          <button
            onClick={() =>
              setQuizDisplayMode(
                quizDisplayMode() === "vertical" ? "horizontal" : "vertical",
              )
            }
            class="flex items-center justify-center rounded-full p-2 transition"
            title={
              quizDisplayMode() === "vertical"
                ? "التبديل إلى العرض الأفقي"
                : "التبديل إلى العرض العمودي"
            }
          >
            <Show
              when={quizDisplayMode() === "vertical"}
              fallback={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M4 5h16v2H4zm0 6h16v2H4zm0 6h16v2H4z"
                  />
                </svg>
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M5 4h2v16H5zm6 0h2v16h-2zm6 0h2v16h-2z"
                />
              </svg>
            </Show>
          </button>

          {/* زر AI */}
          <button
            onClick={() => setGeminiOpen(true)}
            class="flex items-center justify-center rounded-full p-2 transition hover:scale-105"
            title="مساعد AI"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
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
            passage={props.passage}
          />

          {/* زر تعديل السؤال — يظهر فقط للأدمن */}
          <Show when={canEditHere()}>
            <button
              onClick={() => setEditOpen(true)}
              class="flex items-center justify-center rounded-full p-2 transition hover:scale-105"
              title="تعديل السؤال (أدمن)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zm17.71-10.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.83 1.83l3.75 3.75z"
                />
              </svg>
            </button>

            <AdminEditPanel
              open={editOpen()}
              onClose={() => setEditOpen(false)}
              subjectId={props.subjectId!}
              question={props.currentQuestion}
              onQuestionChanged={() => props.onQuestionChanged?.()}
            />
          </Show>
        </div>

      </div>
    </footer>
  );
}
