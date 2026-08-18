import { createResource, createSignal, For, Show } from "solid-js";
import toast from "solid-toast";
import { deleteQuestionImage, uploadQuestionImage } from "../../../services/imageUpload";
import {
  insertQuestion,
  insertPassage,
  updateQuestion,
  getPassages,
  type Section,
  type QuestionUI,
} from "../../../services/documentsManipulation";
import { SectionSelectors } from "./SectionSelectors";

export function ManualForm(props: {
  subjectId: string;
  sections: Section[];
  editQuestion?: QuestionUI | null;
  onComplete: () => void;
}) {
  const isEdit = () => !!props.editQuestion;

  const [seasonId, setSeasonId] = createSignal<number | null>(props.editQuestion?.season_id ?? null);
  const [yearId, setYearId] = createSignal<number | null>(props.editQuestion?.year_id ?? null);
  const [question, setQuestion] = createSignal(props.editQuestion?.question ?? "");
  const [explanation, setExplanation] = createSignal(props.editQuestion?.explanation ?? "");
  const [options, setOptions] = createSignal<string[]>(
    props.editQuestion?.options?.length
      ? [...props.editQuestion.options, ...Array(4).fill("")].slice(0, Math.max(props.editQuestion.options.length, 4))
      : ["", "", "", ""],
  );
  const [correctIndex, setCorrectIndex] = createSignal<number>(props.editQuestion?.correctIndex ?? 0);
  const [saving, setSaving] = createSignal(false);
  const [imageUrl, setImageUrl] = createSignal<string | null>(props.editQuestion?.image_url ?? null);
  const [imageUploading, setImageUploading] = createSignal(false);

  const [passages] = createResource(() => getPassages(props.subjectId));
  const [passageId, setPassageId] = createSignal<string | null>(props.editQuestion?.passage_id ?? null);
  const [newPassageText, setNewPassageText] = createSignal("");
  const [showNewPassage, setShowNewPassage] = createSignal(false);

  const selectedPassageContent = () => passages()?.find((p) => p.$id === passageId())?.content;
  const toggleCorrect = (idx: number) => setCorrectIndex(idx);

  const updateOption = (idx: number, val: string) => {
    const updated = [...options()];
    updated[idx] = val;
    setOptions(updated);
  };

  const save = async () => {
    if (!seasonId() || !yearId()) {
      toast.error("اختر الفصل والسنة");
      return;
    }
    if (!question().trim()) {
      toast.error("أدخل نص السؤال");
      return;
    }
    const filledOptions = options().filter(Boolean);
    if (filledOptions.length < 2) {
      toast.error("أدخل خيارين على الأقل");
      return;
    }

    setSaving(true);

    let finalPassageId = passageId();
    if (showNewPassage() && newPassageText().trim()) {
      const id = await insertPassage(props.subjectId, {
        content: newPassageText().trim(),
        season_id: seasonId(),
        year_id: yearId(),
      });
      if (id) finalPassageId = id;
    }

    let userId = "";
    try {
      userId = JSON.parse(localStorage.getItem("user") ?? "{}").id ?? "";
    } catch {
      userId = "";
    }

    const data = {
      subject: props.subjectId,
      season_id: seasonId(),
      year_id: yearId(),
      question: question(),
      explanation: explanation(),
      options: filledOptions,
      correctIndex: correctIndex(),
      user_id: userId,
      passage_id: finalPassageId ?? null,
      image_url: imageUrl() ?? null,
    };

    if (isEdit() && props.editQuestion) {
      await updateQuestion(props.subjectId, props.editQuestion.$id, data);
    } else {
      await insertQuestion(props.subjectId, data);
    }

    setSaving(false);
    props.onComplete();
  };

  return (
    <div class="space-y-4 text-right" dir="rtl">
      <SectionSelectors
        sections={props.sections}
        seasonId={seasonId()}
        yearId={yearId()}
        onSeasonChange={setSeasonId}
        onYearChange={setYearId}
      />

      <textarea
        value={question()}
        onInput={(e) => setQuestion(e.currentTarget.value)}
        placeholder="نص السؤال..."
        rows={3}
        dir="rtl"
        class="w-full rounded-2xl border-2 border-transparent bg-slate-50 p-4 transition outline-none focus:border-fuchsia-300 dark:bg-slate-900 dark:text-white"
      />

      <input
        value={explanation()}
        onInput={(e) => setExplanation(e.currentTarget.value)}
        placeholder="الشرح (اختياري)"
        dir="rtl"
        class="w-full rounded-2xl border-2 border-transparent bg-slate-50 p-4 transition outline-none focus:border-amber-300 dark:bg-slate-900 dark:text-white"
      />

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p class="text-sm font-bold text-slate-600 dark:text-slate-400">
          🖼️ صورة (اختياري)
        </p>

        <Show when={imageUrl()}>
          <div class="relative">
            <img
              src={imageUrl()!}
              alt="صورة السؤال"
              class="max-h-48 w-full rounded-xl object-contain bg-slate-100"
            />
            <button
              type="button"
              onClick={async () => {
                await deleteQuestionImage(imageUrl()!);
                setImageUrl(null);
              }}
              class="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow"
            >
              ✕
            </button>
            <label class="absolute top-2 left-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white text-xs shadow">
              🔄
              <input
                type="file"
                accept="image/*"
                class="hidden"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setImageUploading(true);
                  try {
                    await deleteQuestionImage(imageUrl()!);
                    const url = await uploadQuestionImage(file);
                    setImageUrl(url);
                    toast.success("تم تغيير الصورة ✓");
                  } catch {
                    toast.error("فشل تغيير الصورة");
                  } finally {
                    setImageUploading(false);
                  }
                }}
              />
            </label>
          </div>
        </Show>

        <Show when={!imageUrl()}>
          <label class={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-5 transition hover:border-cyan-300 dark:border-slate-600 ${imageUploading() ? "opacity-50 pointer-events-none" : ""}`}>
            <span class="text-2xl">{imageUploading() ? "⏳" : "📷"}</span>
            <span class="text-xs text-slate-400">
              {imageUploading() ? "جاري الرفع..." : "اضغط لرفع صورة"}
            </span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                if (!file) return;
                setImageUploading(true);
                try {
                  const url = await uploadQuestionImage(file);
                  setImageUrl(url);
                  toast.success("تم رفع الصورة ✓");
                } catch {
                  toast.error("فشل رفع الصورة");
                } finally {
                  setImageUploading(false);
                }
              }}
            />
          </label>
        </Show>
      </div>

      <div class="flex flex-col gap-2">
        <For each={options()}>
          {(opt, i) => (
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCorrect(i())}
                class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                  correctIndex() == i()
                    ? "border-green-400 bg-green-400 text-white"
                    : "border-slate-200 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                }`}
                title="اضغط لتعيين هذا الخيار كإجابة صحيحة"
              >
                {correctIndex() == i() ? "✓" : i() + 1}
              </button>
              <input
                value={opt}
                onChange={(e) => updateOption(i(), e.currentTarget.value)}
                placeholder={`الخيار ${i() + 1}${i() < 2 ? " *" : ""}`}
                required={i() < 2}
                dir="rtl"
                class="flex min-w-0 flex-1 rounded-xl bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-fuchsia-200 dark:bg-slate-900 dark:text-white"
              />
              <Show when={i() >= 2}>
                <button
                  type="button"
                  onClick={() => setOptions(options().filter((_, idx) => idx !== i()))}
                  class="text-red-400 hover:text-red-600"
                  title="حذف هذا الخيار"
                >
                  ✕
                </button>
              </Show>
            </div>
          )}
        </For>
        <Show when={options().length < 5}>
          <button
            type="button"
            onClick={() => setOptions([...options(), ""])}
            class="text-sm text-cyan-600 underline"
          >
            + إضافة خيار
          </button>
        </Show>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p class="text-sm font-bold text-slate-600 dark:text-slate-400">
          🗒️ مقالة (اختياري)
        </p>

        <Show when={!showNewPassage()}>
          <select
            class="w-full rounded-xl bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-800 dark:text-white"
            onChange={(e) => setPassageId(e.currentTarget.value || null)}
          >
            <option value="">بدون مقالة</option>
            <For each={passages() ?? []}>
              {(p) => (
                <option value={p.$id} selected={passageId() === p.$id}>
                  [{p.$id.slice(0, 6)}] {p.content.slice(0, 50)}...
                </option>
              )}
            </For>
          </select>

          <Show when={selectedPassageContent()}>
            <div
              class="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
              dir="rtl"
            >
              <p class="mb-1 font-bold">📖 المقالة المحددة:</p>
              <p class="line-clamp-4 whitespace-pre-wrap">
                {selectedPassageContent()}
              </p>
            </div>
          </Show>
        </Show>

        <Show when={showNewPassage()}>
          <textarea
            value={newPassageText()}
            onInput={(e) => setNewPassageText(e.currentTarget.value)}
            placeholder="أدخل نص المقالة الجديدة..."
            rows={4}
            dir="rtl"
            class="w-full rounded-xl bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-800 dark:text-white"
          />
        </Show>

        <button
          type="button"
          onClick={() => {
            setShowNewPassage(!showNewPassage());
            setPassageId(null);
            setNewPassageText("");
          }}
          class="text-xs text-cyan-600 underline"
        >
          {showNewPassage() ? "← اختر مقالة موجودة" : "+ إضافة مقالة جديدة"}
        </button>
      </div>

      <p class="text-center text-xs text-slate-400">
        اضغط على الرقم لتحديد الإجابة الصحيحة
      </p>

      <button
        onClick={save}
        disabled={saving()}
        class="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 py-4 font-black text-white shadow-lg transition disabled:opacity-50"
      >
        {saving()
          ? "جاري الحفظ..."
          : isEdit()
            ? "حفظ التعديلات ✏️"
            : "حفظ السؤال 🎯"}
      </button>
    </div>
  );
}
