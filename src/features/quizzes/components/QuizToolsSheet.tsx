import { Show } from "solid-js";

export default function QuizToolsSheet(props: {
  open: boolean;
  hasCurrentQuestion: boolean;
  onSolveCurrent: () => void;
  onResetCurrent: () => void;
  onSolveAll: () => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const action = (fn: () => void) => () => {
    fn();
    props.onClose();
  };

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
        onClick={props.onClose}
      >
        <div
          dir="rtl"
          class="dark:bg-lighter-dark-1 w-full max-w-md rounded-t-3xl bg-white p-4 pb-6 animate-[fadeIn_.15s_ease-in-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <p class="mb-3 text-sm font-bold dark:text-white">أدوات الحل</p>

          <p class="mb-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            السؤال الحالي
          </p>
          <div class="mb-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={!props.hasCurrentQuestion}
              onClick={action(props.onSolveCurrent)}
              class="bg-true/10 text-true flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
            >
              ✅ حل هذا السؤال
            </button>
            <button
              type="button"
              disabled={!props.hasCurrentQuestion}
              onClick={action(props.onResetCurrent)}
              class="dark:bg-lighter-dark-2 flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-40 dark:text-gray-300"
            >
              🔄 تصفير / إعادة الحل
            </button>
          </div>

          <p class="mb-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            كل الأسئلة الظاهرة حالياً
          </p>
          <div class="flex flex-col gap-2">
            <button
              type="button"
              onClick={action(props.onSolveAll)}
              class="bg-true/10 text-true flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
            >
              ✅✅ حل الكل
            </button>
            <button
              type="button"
              onClick={action(props.onClearAll)}
              class="text-warn flex items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-sm font-bold dark:bg-red-900/20"
            >
              🗑️ إلغاء حل الكل
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
