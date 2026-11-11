import { createSignal, For, Show } from "solid-js";
import { supabase } from "../../shared/services/supabase";
import { deleteQuestion, setQuestionStatus } from "../services/questions";
import { useUser } from "../../shared/context/user";
import { uploadQuestionImage, deleteQuestionImage } from "../../shared/services/imageUpload";
import ImageLightbox from "./ImageLightbox";
import toast from "solid-toast";
import type { QuestionUI } from "../services/types";

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
  const { user, can } = useUser();
  const [open, setOpen] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [changingStatus, setChangingStatus] = createSignal(false);

  // ── What may THIS admin do with THIS question? ──────────────────
  // (UI only. Postgres enforces the same rules with RLS + a trigger.)
  const status = () => props.question.status ?? "published";
  const isOwn = () => !!user()?.id && props.question.user_id === user()?.id;
  const canPublish = () => can("quiz", props.subjectId, "publish");
  const canDelete = () => can("quiz", props.subjectId, "manage");
  // publishers edit anything; contributors only their own unpublished questions
  const canEdit = () =>
    canPublish() ||
    (can("quiz", props.subjectId, "contribute") &&
      isOwn() &&
      status() !== "published");

  const changeStatus = async (next: "published" | "pending") => {
    if (next === "pending" && !confirm("إلغاء نشر السؤال؟ سيختفي عن الطلاب.")) {
      return;
    }
    setChangingStatus(true);
    const { error } = await setQuestionStatus(props.question.$id, next);
    setChangingStatus(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(next === "published" ? "تم نشر السؤال ✓" : "أُلغي نشر السؤال");
    props.onRefetch();
  };
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

    if (error) return; // deleteQuestion already showed the reason
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
      class={`cursor-pointer rounded-[2rem] border p-6 shadow-sm transition-all hover:shadow-md dark:border-line-dark ${
        props.isSelected
          ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20"
          : "border-line-light bg-surface-light dark:bg-surface-dark"
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
                  : "border-line-light bg-surface-light dark:border-line-dark dark:bg-chip-dark"
              }`}
            >
              {props.isSelected ? "✓" : props.index}
            </span>
          </Show>
          <span class="rounded-full bg-chip-light px-2 py-1 text-[10px] text-ink-soft-light dark:bg-chip-dark">
            {props.question.$id.slice(0, 8)}
          </span>
          <Show when={status() !== "published"}>
            <span
              class={`rounded-full px-2 py-1 text-[10px] font-bold ${
                status() === "pending"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30"
                  : "bg-chip-light text-ink-soft-light dark:bg-chip-dark"
              }`}
            >
              {status() === "pending" ? "⏳ بانتظار المراجعة" : "مسودة"}
            </span>
          </Show>
        </div>

        <div class="flex flex-wrap gap-1">
          <Show when={props.question.seasonName}>
            <span class="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-600 dark:bg-cyan-900/30">
              {props.question.seasonName}
            </span>
          </Show>
          <Show when={props.question.yearValue}>
            <span class="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-600 dark:bg-purple-900/30">
              {props.question.yearName}
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

      <p class="mb-4 font-bold text-ink-light dark:text-ink-dark" dir="auto">
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
                  : "bg-base-light text-ink-soft-light dark:bg-base-dark/50 dark:text-ink-muted-dark"
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
                  class="max-h-48 w-full cursor-zoom-in object-contain bg-chip-light dark:bg-base-dark"
                  onClick={() => setLightbox(true)}
                />
                <Show when={canEdit()}>
                  <button
                    class="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow disabled:opacity-50"
                    disabled={deletingImage()}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("حذف الصورة؟")) return;
                      setDeletingImg(true);
                      // Update the row FIRST: if RLS refuses (0 rows) we must not
                      // delete the file of a question we don't own.
                      const { data: rows, error } = await supabase
                        .from("questions")
                        .update({ image_url: null })
                        .eq("id", props.question.$id)
                        .select("id");
                      if (error || !rows || rows.length === 0) {
                        toast.error("لا تملك صلاحية تعديل هذا السؤال");
                        setDeletingImg(false);
                        return;
                      }
                      await deleteQuestionImage(url());
                      setLocalImageUrl(null);
                      toast.success("تم حذف الصورة");
                      setDeletingImg(false);
                    }}
                  >
                    {deletingImage() ? "…" : "✕"}
                  </button>
                </Show>
              </div>
              <Show when={lightbox()}>
                <ImageLightbox src={url()} onClose={() => setLightbox(false)} />
              </Show>
            </>
          );
        }}
      </Show>

      <Show when={open() && !localImageUrl() && canEdit()}>
        {() => {
          const [uploading, setUploadingImg] = createSignal(false);
          return (
            <label
              class={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-light p-3 text-xs text-ink-muted-light transition hover:border-cyan-300 dark:border-line-dark ${uploading() ? "pointer-events-none opacity-50" : ""}`}
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
                    const { data: rows, error } = await supabase
                      .from("questions")
                      .update({ image_url: uploadedUrl })
                      .eq("id", props.question.$id)
                      .select("id");
                    if (error || !rows || rows.length === 0) {
                      // refused: don't leave an orphan file in the bucket
                      await deleteQuestionImage(uploadedUrl);
                      toast.error("لا تملك صلاحية تعديل هذا السؤال");
                      return;
                    }
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
          class="mt-4 flex gap-2 border-t border-line-light pt-4 dark:border-line-dark"
          onClick={(e) => e.stopPropagation()}
        >
          <Show when={canPublish() && status() !== "published"}>
            <button
              onClick={() => changeStatus("published")}
              disabled={changingStatus()}
              class="flex-1 rounded-xl bg-green-50 py-2 text-sm font-bold text-green-600 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20"
            >
              نشر ✓
            </button>
          </Show>
          <Show when={canPublish() && status() === "published"}>
            <button
              onClick={() => changeStatus("pending")}
              disabled={changingStatus()}
              class="flex-1 rounded-xl bg-chip-light py-2 text-sm font-bold text-ink-soft-light hover:bg-darker-light-2 disabled:opacity-50 dark:bg-chip-dark"
            >
              إلغاء النشر
            </button>
          </Show>
          <Show when={canEdit()}>
            <button
              onClick={() => props.onEdit(props.question)}
              class="flex-1 rounded-xl bg-amber-50 py-2 text-sm font-bold text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20"
            >
              تعديل ✏️
            </button>
          </Show>
          <Show when={canDelete()}>
            <button
              onClick={handleDelete}
              disabled={deleting()}
              class="flex-1 rounded-xl bg-red-50 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20"
            >
              {deleting() ? "جاري الحذف..." : "حذف 🗑️"}
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
