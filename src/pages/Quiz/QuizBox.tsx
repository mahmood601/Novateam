import { For, Show } from "solid-js";

export default function QuizBox(props: any) {
  return (
    <div class="bg-main-light dark:bg-main-dark">
      {/* شارة الفصل والسنة */}
      <Show when={props.currentQuestion}>
        <div class="border-secondary mb-2 ml-auto flex w-fit items-center rounded-full border-2 font-bold">
          <Show when={props.currentQuestion.seasonName}>
            <p dir="rtl" class="text-secondary flex-1 px-2">
              {props.currentQuestion.seasonName}
            </p>
          </Show>
          <Show when={props.currentQuestion.yearValue}>
            <p class="bg-secondary text-main-light rounded-full px-2 py-1">
              {props.currentQuestion.yearValue}
            </p>
          </Show>
        </div>
      </Show>

      {/* نص السؤال */}
      <div class="flex flex-row-reverse">
        <pre dir="rtl" class="text-md font-bold">
          {props.index + 1}.{" "}
        </pre>
        <p dir="auto">{props.currentQuestion?.question}:</p>
      </div>

      {/* الخيارات — options[] مصفوفة */}
      <ul
        classList={{
          "space-y-3 mt-5": true,
          "pointer-events-none": props.isDisabled,
        }}
      >
        <For each={props.question?.options ?? []}>
          {(opt, i) => (
            <button
              onClick={() => props.onSelect(props.question, i(), opt)}
              class={`flex w-full flex-row-reverse items-center rounded-xl border-2 p-4 transition-all ${
                props.isDisabled && props.question.correctIndex == i()
                  ? "border-main bg-main-50 dark:bg-main/20"
                  : "border-gray-200 dark:border-gray-700"
              } ${
                props.selectedOption === i() &&
                props.question.correctIndex !== i()
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : ""
              }`}
            >
              <div
                class={`ml-3 flex size-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  props.isDisabled && props.question.correctIndex == i()
                    ? "bg-main"
                    : props.selectedOption === i()
                      ? "bg-red-500"
                      : ""
                }`}
              >
                <p class="text-main-dark dark:text-main-light text-center text-[9px]">
                  {props.isDisabled
                    ? props.question.correctIndex == i()
                      ? "✔"
                      : props.selectedOption === i()
                        ? "✗"
                        : ""
                    : ""}
                </p>
              </div>
              <span dir="auto" class="flex-1 text-right">
                {opt}
              </span>
            </button>
          )}
        </For>
      </ul>
    </div>
  );
}
