import { createResource, createSignal, For, Show } from "solid-js";
import { getSeasonName, getYearName } from "../../services/local/indexeddb";
import ImageLightbox from "./ImageLightbox";
import SuggestSection from "./SuggestSection";

export default function QuizBox(props: any) {
  const [yearName] = createResource(
    () => props.currentQuestion?.year_id,
    (yearId) => getYearName(props.subject, yearId ?? null),
  );

  const [seasonName] = createResource(
    () => props.currentQuestion?.season_id,
    (seasonId) => getSeasonName(props.subject, seasonId ?? null),
  );

  const [lightboxOpen, setLightboxOpen] = createSignal(false);

  return (
    <div class="bg-main-light dark:bg-main-dark">
      {/* شارة الفصل والسنة + زر الاقتراح */}
      <Show when={props.currentQuestion}>
        <div class="mb-2 flex items-center flex-row-reverse">
          <div class="text-xs border-secondary flex w-fit items-center rounded-full border-2 font-bold ml-2">
            <Show when={seasonName()}>
              <p dir="rtl" class="text-secondary flex-1 px-2">
                {seasonName()}
              </p>
            </Show>
            <Show when={yearName()}>
              <p class="bg-secondary text-main-light rounded-full px-2 py-1">
                {yearName()}
              </p>
            </Show>
          </div>

          {/* زر اقتراح الفصل */}
          <SuggestSection
            questionId={props.currentQuestion.$id}
            subject={props.subject}
            subjectName={props.subjectName}
            currentSeasonId={props.currentQuestion.season_id}
            questionText={props.currentQuestion.question}
          />
        </div>
      </Show>

      {/* نص المقالة — تظهر مرة واحدة فوق السؤال */}
      <Show when={props.passage}>
        <div
          dir="rtl"
          class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
        >
          <p class="mb-1 text-[10px] font-bold tracking-widest text-amber-500 uppercase"></p>
          <details>
            <summary class="cursor-pointer text-[10px] font-bold text-amber-500">
              🗒️ اضغط هنا لقراءة النص ثم أجب
            </summary>
            <pre dir="auto" class="font-sans whitespace-pre-wrap">
              {props.passage.content}
            </pre>
          </details>
        </div>
      </Show>

      {/* نص السؤال */}
      <div class="flex flex-row-reverse">
        <pre dir="rtl" class="text-md font-bold">
          {props.index + 1}.{" "}
        </pre>
        <p dir="auto">{props.currentQuestion?.question}</p>
      </div>

      {/* صورة السؤال */}
      <Show when={props.currentQuestion?.image_url}>
        <button
          onClick={() => setLightboxOpen(true)}
          class="mt-3 w-full overflow-hidden rounded-2xl border-2 border-transparent transition hover:border-main"
        >
          <img
            src={props.currentQuestion.image_url}
            alt="صورة السؤال"
            class="max-h-52 w-full object-contain bg-slate-50 dark:bg-slate-900"
          />
          <p class="py-1 text-center text-[10px] text-slate-400">
            اضغط للتكبير
          </p>
        </button>
      </Show>

      {/* Lightbox */}
      <Show when={lightboxOpen()}>
        <ImageLightbox
          src={props.currentQuestion.image_url}
          onClose={() => setLightboxOpen(false)}
        />
      </Show>

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
