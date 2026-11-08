import { A, useNavigate, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { useUser } from "../../shared/context/user";

export default function SubjectHub() {
  const params = useParams();
  const navigate = useNavigate();
  const { can } = useUser();
  const subjectId = () => params.subject!;

  // Show only what this admin may do in THIS subject (Postgres enforces it too)
  const canQuiz = () => can("quiz", subjectId(), "contribute");
  const canLecture = () => can("lecture", subjectId(), "contribute");

  return (
    <div class="flex min-h-dvh flex-col items-center justify-center bg-base-light px-5 pb-10 dark:bg-base-dark" dir="rtl">
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-4 text-center">
          <p class="mb-1 text-sm text-ink-muted-light">المادة</p>
          <h1 class="text-2xl font-black text-ink-light dark:text-ink-dark">
            {subjectId()}
          </h1>
        </div>

        <Show
          when={canQuiz() || canLecture()}
          fallback={
            <p class="rounded-4xl bg-surface-light p-6 text-center text-sm text-ink-muted-light shadow-sm dark:bg-surface-dark">
              لم تُمنح صلاحية على هذه المادة 🔒
            </p>
          }
        >
          <div class="flex flex-col gap-4">
            <Show when={canQuiz()}>
              <A
                href={`/dashboard/${subjectId()}/edit-quiz`}
                class="flex items-center gap-4 rounded-[2rem] bg-surface-light p-6 text-right shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:bg-surface-dark"
              >
                <span class="text-3xl">📋</span>
                <div>
                  <p class="font-black text-ink-light dark:text-ink-dark">
                    إدارة الأسئلة
                  </p>
                  <p class="text-xs text-ink-muted-light">
                    الأسئلة، المقالات، والمقترحات
                  </p>
                </div>
              </A>
            </Show>

            <Show when={canLecture()}>
              <button
                onClick={() => {
                  navigate(`/dashboard/${subjectId()}/edit-lecture`, { replace: false });
                }}
                class="flex items-center gap-4 rounded-[2rem] bg-surface-light p-6 text-right shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:bg-surface-dark"
              >
                <span class="text-3xl">✍️</span>
                <div>
                  <p class="font-black text-ink-light dark:text-ink-dark">
                    محرر المحاضرات
                  </p>
                  <p class="text-xs text-ink-muted-light">
                    تنسيق المحتوى النظري للمادة
                  </p>
                </div>
              </button>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
