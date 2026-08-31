import { useNavigate, useParams } from "@solidjs/router";

export default function SubjectHub() {
  const params = useParams();
  const navigate = useNavigate();
  const subjectId = () => params.subject!;

  return (
    <div class="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-5 pt-22 pb-10 dark:bg-[#0f172a]" dir="rtl">
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-8 text-center">
          <p class="mb-1 text-sm text-slate-400">المادة</p>
          <h1 class="text-2xl font-black text-slate-800 dark:text-white">
            {subjectId()}
          </h1>
        </div>

        <div class="flex flex-col gap-4">
          <button
            onClick={() => {
              navigate(`/dashboard/${subjectId()}/edit-quiz`, { replace: false });
            }}
            class="flex items-center gap-4 rounded-[2rem] bg-white p-6 text-right shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:bg-slate-800"
          >
            <span class="text-3xl">📋</span>
            <div>
              <p class="font-black text-slate-800 dark:text-white">
                إدارة الأسئلة
              </p>
              <p class="text-xs text-slate-400">
                الأسئلة، المقالات، والمقترحات
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              navigate(`/dashboard/${subjectId()}/edit-lecture`, { replace: false });

            }}
            class="flex items-center gap-4 rounded-[2rem] bg-white p-6 text-right shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:bg-slate-800"
          >
            <span class="text-3xl">✍️</span>
            <div>
              <p class="font-black text-slate-800 dark:text-white">
                محرر المحاضرات
              </p>
              <p class="text-xs text-slate-400">
                تنسيق المحتوى النظري للمادة
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}