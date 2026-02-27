import { For, Show } from "solid-js";
import subjects from "../../components/subjects";

export default function QuizBox(props: any) {
  const options = () => [
    "firstOption",
    "secondOption",
    "thirdOption",
    "fourthOption",
    "fifthOption",
  ];


  return (
    <div class="bg-main-light dark:bg-main-dark">
        <Show when={subjects[props.subject] && props.currentQuestion}>
          <div class="border-secondary mb-2 ml-auto flex w-fit items-center rounded-full border-2 font-bold">
            <p dir="rtl" class="text-secondary flex-1 px-2">
              {
                subjects[props.subject]?.season.at(
                  props.currentQuestion!.season - 1,
                ).name
              }
            </p>
            <p class="bg-secondary text-main-light rounded-full px-2 py-1">
              {props.currentQuestion.year}
            </p>
          </div>
        </Show>

      <div class="flex flex-row-reverse">
        <pre dir="rtl" class="text-md font-bold">
          {props.index + 1}.{" "}
        </pre>
        <p dir="auto">{props.currentQuestion?.question}:</p>
      </div>

      <ul
        classList={{
          "space-y-3 mt-5": true,
          "pointer-events-none": props.isDisabled,
        }}
      >
        <For each={options()}>
          {(optKey, i) => (
            <Show when={props.question?.[optKey]}>
              <button
                onClick={() =>
                  props.onSelect(props.question, i(), props.question[optKey])
                }
                class={`flex w-full flex-row-reverse items-center rounded-xl border-2 p-4 transition-all ${props.isDisabled && props.question.correctIndex.includes(i()) ? "border-main bg-main-50 dark:bg-main/20" : "border-gray-200 dark:border-gray-700"} ${props.selectedOption === i() && !props.question.correctIndex.includes(i()) ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""}`}
              >
                <div
                  class={`ml-3 flex size-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${!props.isDisabled ? "" : props.isDisabled && props.question.correctIndex.includes(i()) ? "bg-main" : props.selectedOption == i() ? "bg-red-500" : ""} `}
                >
                  <p
                    class={`text-main-dark dark:text-main-light text-center text-[9px]`}
                  >
                    {!props.isDisabled
                      ? ""
                      : props.isDisabled &&
                          props.question.correctIndex.includes(i())
                        ? "✔"
                        : props.selectedOption == i()
                          ? "✗"
                          : ""}
                  </p>
                </div>
                <span dir="auto" class="flex-1 text-right">
                  {props.question[optKey]}
                </span>
              </button>
            </Show>
          )}
        </For>
      </ul>
    </div>
  );
}
