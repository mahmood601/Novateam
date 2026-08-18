import { createSignal, For, Show } from "solid-js";
import { supabase } from "../../../services/supabase";
import { deleteQuestion } from "../../../services/documentsManipulation";
import { uploadQuestionImage, deleteQuestionImage } from "../../../services/imageUpload";
import ImageLightbox from "../../Quiz/ImageLightbox";
import toast from "solid-toast";
import type { QuestionUI } from "../../../services/documentsManipulation";

export function QuestionCard(props: {
  question: QuestionUI;
  index: number;
  subjectId: string;
  namesMap: Map<string, string>;
  passagesMap: Map<string, string>;
  onRefetch: () => void;
  onEdit: (q: QuestionUI) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
}) {
  const [open, setOpen] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [localImageUrl, setLocalImageUrl] = createSignal<string | null>(
    props.question.image_url ?? null,
  );

  const inserterName = () =>
    props.question.user_id
      ? props.namesMap.get(props.question.user_id)
      : undefined;

  const passagePreview = () =>
    props.question.passage_id
      ? props.passagesMap.get(props.question.passage_id)
      : undefined;

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تريد حذف هذا السؤال؟")) return;

    setDeleting(true);
    const error = await deleteQuestion(props.subjectId, props.question.$id);
    setDeleting(false);

    if (error) {
      toast.error("فشل الحذف، حاول مرة أخرى");
      return;
    }
    toast.success("تم حذف السؤال");
    props.onRefetch();
  };

  return (
    <div
      onClick={() => {
        if (props.selectionMode) {
          props.onToggleSelect(props.question.$id);
        } else {
          setOpen(!open());
        }
      }}
      class={`cursor-pointer rounded-[2rem] border p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 ${
        props.isSelected
          ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20"
          : "border-slate-100 bg-white dark:bg-slate-800"
      }`}
    >
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Show
            when={props.selectionMode}
            fallback={
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-black text-white shadow">
                {props.index}
              </span>
            }
          >
            <span
              class={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-black transition-all ${
                props.isSelected
                  ? "border-cyan-500 bg-cyan-500 text-white"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
              }`}
            >
              {props.isSelected ? "✓" : props.index}
            </span>
          </Show>
          <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-700">
            {props.question.$id.slice(0, 8)}
          </span>
        </div>

        <div class="flex flex-wrap gap-1">
          <Show when={props.question.seasonName}>
            <span class="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-600 dark:bg-cyan-900/30">
              {props.question.seasonName}
            </span>
          </Show>
          <Show when={props.question.yearValue}>
            <span class="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-600 dark:bg-purple-900/30">
              {props.question.yearValue}
            </span>
          </Show>
          <Show when={inserterName()}>
            <span class="rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600 dark:bg-green-900/30">
              ✍️ {inserterName()}
            </span>
          </Show>
          <Show when={passagePreview()}>
            <span
              class="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30"
              title={passagePreview()}
            >
              🗒️ {passagePreview()!.slice(0, 20)}...
            </span>
          </Show>
        </div>
      </div>

      <p class="mb-4 font-bold text-slate-800 dark:text-slate-200" dir="auto">
        {props.question.question}
      </p>

      <div class="grid gap-2">
        <For each={props.question.options}>
          {(opt, i) => (
            <div
              dir="auto"
              class={`rounded-2xl p-3 text-sm ${
                props.question.correctIndex == i()
                  ? "border border-green-100 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400"
              }`}
            >
              {i() + 1}. {opt}
            </div>
          )}
        </For>
      </div>

      <Show when={props.question.explanation}>
        <p
          class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          dir="auto"
        >
          💡 {props.question.explanation}
        </p>
      </Show>

      <Show when={localImageUrl()}>
        {(url) => {
          const [lightbox, setLightbox] = createSignal(false);
          const [deletingImage, setDeletingImg] = createSignal(false);

          return (
            <>
              <div
                class="relative mt-3 overflow-hidden rounded-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={url()}
                  alt="صورة السؤال"
                  class="max-h-48 w-full cursor-zoom-in object-contain bg-slate-100 dark:bg-slate-900"
                  onClick={() => setLightbox(true)}
                />
                <button
                  class="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow disabled:opacity-50"
                  disabled={deletingImage()}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm("حذف الصورة؟")) return;
                    setDeletingImg(true);
                    await deleteQuestionImage(url());
                    await supabase
                      .from("questions")
                      .update({ image_url: null })
                      .eq("id", props.question.$id);
                    setLocalImageUrl(null);
                    toast.success("تم حذف الصورة");
                    setDeletingImg(false);
                  }}
                >
                  {deletingImage() ? "…" : "✕"}
                </button>
              </div>
              <Show when={lightbox()}>
                <ImageLightbox src={url()} onClose={() => setLightbox(false)} />
              </Show>
            </>
          );
        }}
      </Show>

      <Show when={open() && !localImageUrl()}>
        {() => {
          const [uploading, setUploadingImg] = createSignal(false);
          return (
            <label
              class={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-3 text-xs text-slate-400 transition hover:border-cyan-300 dark:border-slate-600 ${uploading() ? "pointer-events-none opacity-50" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span>{uploading() ? "⏳ جاري الرفع..." : "📷 إضافة صورة"}</span>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setUploadingImg(true);
                  try {
                    const uploadedUrl = await uploadQuestionImage(file);
                    await supabase
                      .from("questions")
                      .update({ image_url: uploadedUrl })
                      .eq("id", props.question.$id);
                    setLocalImageUrl(uploadedUrl);
                    toast.success("تم رفع الصورة ✓");
                  } catch {
                    toast.error("فشل رفع الصورة");
                  } finally {
                    setUploadingImg(false);
                  }
                }}
              />
            </label>
          );
        }}
      </Show>

      <Show when={open() && passagePreview()}>
        <div
          class="mt-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <p class="mb-1 font-bold">📖 نص المقالة:</p>
          <p class="whitespace-pre-wrap">{passagePreview()}</p>
        </div>
      </Show>

      <Show when={open()}>
        <div
          class="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => props.onEdit(props.question)}
            class="flex-1 rounded-xl bg-amber-50 py-2 text-sm font-bold text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20"
          >
            تعديل ✏️
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting()}
            class="flex-1 rounded-xl bg-red-50 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20"
          >
            {deleting() ? "جاري الحذف..." : "حذف 🗑️"}
          </button>
        </div>
      </Show>
    </div>
  );
}
