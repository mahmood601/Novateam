import { createSignal, For, Show } from "solid-js";
import ImageLightbox from "./ImageLightbox";

export default function QuizBox(props: any) {
  // seasonName / yearName now arrive as plain props (looked up once by the page).
  // They used to be two createResource calls PER QUESTION.

  const [lightboxOpen, setLightboxOpen] = createSignal(false);

  return (
    <div class="bg-main-light dark:bg-main-dark">
      {/* شارة الفصل والسنة + بادج "صعب" */}
      <Show when={props.currentQuestion}>
        <div class="mb-3 mt-2 flex text-xs w-full items-center flex-row-reverse gap-2">
          <div class="text-xs mb-1 border-secondary flex w-fit rounded-full h-fit border-2 overflow-x-scroll font-bold ">
            <Show when={props.seasonName}>
              <p dir="rtl" class="text-secondary flex-1 h-full py-1 px-1 ml-3 text-nowrap overflow-x-scroll">
                {props.seasonName}
              </p>
            </Show>
            <Show when={props.yearName}>
                <p dir="rtl" class="bg-secondary text-main-light rounded-full px-2 py-1 flex items-center text-xs font-bold">
                {props.yearName}
              </p>
            </Show>
          </div>

          {/* بادج عدد مرات الإخطاء — يظهر لأي سؤال أخطأ فيه المستخدم قبل، مو بس بوضع فلتر "الصعبة" */}
          <Show when={props.weakAttempts}>
            <span
              dir="rtl"
              class="flex items-center gap-1 shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            >
               أخطأت {props.weakAttempts} {props.weakAttempts === 1 ? "مرة" : "مرات"}
            </span>
          </Show>

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
      <div class="flex flex-row-reverse mt-3 text-md leading-relaxed font-bold">
        <pre dir="rtl" class="font-sans">
          {props.index + 1}.{" "}
        </pre>
        <p dir="rtl">{props.currentQuestion?.question}:</p>
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
            class="max-h-52 w-full object-contain bg-base-light dark:bg-base-dark"
          />
          <p class="py-1 text-center text-[10px] text-ink-muted-light">
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
          "space-y-3 mt-1": true,
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
                  : "border-line-light dark:border-line-dark"
              } ${
                props.selectedOption === i() &&
                props.question.correctIndex !== i()
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : ""
              }`}
            >
              <div
                class={`ml-3 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  props.isDisabled && props.question.correctIndex == i()
                    ? "bg-main"
                    : props.selectedOption === i()
                      ? "bg-red-500"
                      : ""
                }`}
              >
                <p class="text-ink-light dark:text-ink-dark text-center text-[9px]">
                  {props.isDisabled
                    ? props.question.correctIndex == i()
                      ? "✔"
                      : props.selectedOption === i()
                        ? "✗"
                        : ""
                    : ""}
                </p>
              </div>
              <span dir="auto" class="flex-1 text-right text-sm">
                {opt}
              </span>
            </button>
          )}
        </For>
      </ul>

      {/* التفسير — يظهر مباشرة تحت الخيارات بعد الإجابة */}
      <Show when={props.isDisabled && props.explanation}>
        <div
          dir="rtl"
          class="mt-4 rounded-2xl border border-line-light bg-base-light p-4 text-sm leading-relaxed opacity-90 dark:border-line-dark dark:bg-surface-dark/50"
        >
          <p class="mb-1 text-[10px] font-bold tracking-widest text-main uppercase">
            التفسير
          </p>
          {props.explanation}
        </div>
      </Show>
    </div>
  );
}
