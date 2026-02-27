import { Show } from "solid-js";


export default function QuizFooter(props: any) {
  return (
    <footer class="dark:bg-main-dark border-t bg-white p-5 dark:border-gray-800">
      <Show when={props.showExplanation}>
          <p dir="rtl" class=" text-center mb-3 text-sm opacity-80">{props.explanation}</p>
        </Show>
      <div class="mb-4 flex items-center justify-between">
        <button
          onClick={props.onPrev}
          disabled={props.index === 0}
          class="border-main text-main rounded-full border px-6 py-2 disabled:opacity-30"
        >
          السابق
        </button>
        
        <button
          onClick={props.onNext}
          disabled={props.isDisabled}
          class="bg-main rounded-full px-6 py-2 text-white disabled:opacity-50"
        >
          {props.index >= props.total - 1 ? "إظهار النتيجة" : "التالي"}
        </button>
      </div>
    </footer>
  );
}
