import {
  createSignal,
  createResource,
  For,
  Show,
  Suspense,
  Switch,
  Match,
  createEffect,
} from "solid-js";
import { useParams, useLocation, useSearchParams, useNavigate } from "@solidjs/router";
import { supabase } from "../services/supabase";
import {
  getSections,
  deleteQuestion,
  insertQuestion,
  updateQuestion,
  getPassages,
  insertPassage,
  deletePassage,
  updatePassage,
  type Section,
  type QuestionUI,
  type PassageUI,
} from "../services/documentsManuplation";
import { fetchUserNames } from "../services/user";
import toast from "solid-toast";
import { uploadQuestionImage, deleteQuestionImage } from "../services/imageUpload";
import ImageLightbox from "./Quiz/ImageLightbox";
import { useUser } from "../context/user";
import { getSubjectsOfflineFirst, type CachedSubject } from "../services/local/indexeddb";

export type qModeT = "insert" | "edit" | "delete" | "";

const PAGE_SIZE = 10;

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard(props: {
  question: QuestionUI;
  index: number; // ✅ إضافة: رقم السؤال في القائمة
  subjectId: string;
  namesMap: Map<string, string>;
  passagesMap: Map<string, string>; // ✅ إضافة: map للمقالات لعرض معاينتها
  onRefetch: () => void;
  onEdit: (q: QuestionUI) => void;
  // ✅ ميزة التحديد المتعدد
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
}) {
  // 📌 LESSON 3: createSignal داخل component
  // كل نسخة من QuestionCard لها signal خاص بها — لا تتداخل مع باقي الكاردات
  const [open, setOpen] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [localImageUrl, setLocalImageUrl] = createSignal<string | null>(
    props.question.image_url ?? null,
  );

  const inserterName = () =>
    props.question.user_id
      ? props.namesMap.get(props.question.user_id)
      : undefined;

  // ✅ جلب معاينة المقالة من الـ map بدون أي طلب إضافي
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
      {/* ─── Meta row ─── */}
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* ✅ رقم السؤال + ID + checkbox في وضع التحديد */}
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

        {/* Badges */}
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
          {/* ✅ عرض معاينة المقالة بدل "مقالة" فقط */}
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

      {/* ─── نص السؤال ─── */}
      <p class="mb-4 font-bold text-slate-800 dark:text-slate-200" dir="auto">
        {props.question.question}
      </p>

      {/* ─── الخيارات ─── */}
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

      {/* ─── الشرح ─── */}
      <Show when={props.question.explanation}>
        <p
          class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          dir="auto"
        >
          💡 {props.question.explanation}
        </p>
      </Show>

      {/* ─── صورة السؤال ─── */}
      <Show when={localImageUrl()}>
        {(url) => {
          const [lightbox, setLightbox] = createSignal(false);
          const [deleting, setDeletingImg] = createSignal(false);

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
                  disabled={deleting()}
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
                  {deleting() ? "…" : "✕"}
                </button>
              </div>
              <Show when={lightbox()}>
                <ImageLightbox src={url()} onClose={() => setLightbox(false)} />
              </Show>
            </>
          );
        }}
      </Show>

      {/* ─── رفع صورة جديدة ─── */}
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

      {/* ─── معاينة المقالة الكاملة عند الفتح ─── */}
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

      {/* ─── أزرار الإجراءات (تظهر عند الضغط) ─── */}
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

// ─── SectionSelectors ─────────────────────────────────────────────────────────

// 📌 LESSON 5: props في SolidJS
// props تشبه props في React لكن لا تُفككها (destructure) خارج JSX
// لأن تفكيكها يفقدها التفاعلية (reactivity).
// الصحيح: props.seasonId  ← يتحدث تلقائياً
// الخطأ:  const { seasonId } = props  ← لن يتحدث

function SectionSelectors(props: {
  sections: Section[];
  seasonId: number | null;
  yearId: number | null;
  onSeasonChange: (id: number) => void;
  onYearChange: (id: number) => void;
}) {
  const seasons = () => props.sections.filter((s) => s.type === "season");
  const years = () => props.sections.filter((s) => s.type === "year");

  return (
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-bold text-slate-600 dark:text-slate-400">
          الفصل
        </label>
        <select
          class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
          onChange={(e) => props.onSeasonChange(Number(e.currentTarget.value))}
        >
          <option value="">اختر...</option>
          <For each={seasons()}>
            {(s) => (
              <option value={s.id} selected={props.seasonId === s.id}>
                {s.name}
              </option>
            )}
          </For>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-bold text-slate-600 dark:text-slate-400">
          السنة
        </label>
        <select
          class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
          onChange={(e) => props.onYearChange(Number(e.currentTarget.value))}
        >
          <option value="">اختر...</option>
          <For each={years()}>
            {(y) => (
              <option value={y.id} selected={props.yearId === y.id}>
                {y.name}
              </option>
            )}
          </For>
        </select>
      </div>
    </div>
  );
}

// ─── SmartImporter ────────────────────────────────────────────────────────────

function SmartImporter(props: {
  subjectId: string;
  sections: Section[];
  onComplete: () => void;
}) {
  const [rawText, setRawText] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [seasonId, setSeasonId] = createSignal<number | null>(null);
  const [yearId, setYearId] = createSignal<number | null>(null);

  // ✅ عداد مرئي للأسئلة المكتشفة في النص قبل الرفع
  const previewCount = () => {
    const lines = rawText().split("\n");
    return lines.filter((l) => l.trim().startsWith("#")).length;
  };

  const parseAndUpload = async () => {
    if (!seasonId() || !yearId()) {
      toast.error("يرجى اختيار الفصل والسنة أولاً");
      return;
    }
    setLoading(true);

    const inputLines = rawText().split("\n");
    const questionBlocks: { text: string; passageText: string | null }[] = [];
    let currentPassageText: string | null = null;
    let currentQuestionLines: string[] = [];

    const flushQuestion = () => {
      if (currentQuestionLines.length > 0) {
        questionBlocks.push({
          text: currentQuestionLines.join("\n").trim(),
          passageText: currentPassageText,
        });
        currentQuestionLines = [];
      }
    };

    for (const line of inputLines) {
      const trimmed = line.trim();
      if (trimmed === "@@") {
        flushQuestion();
        currentPassageText = null;
      } else if (trimmed.startsWith("@")) {
        flushQuestion();
        currentPassageText = trimmed.slice(1).trim();
      } else if (trimmed.startsWith("#")) {
        flushQuestion();
        currentQuestionLines = [trimmed.slice(1).trim()];
      } else if (
        trimmed.startsWith("=") ||
        trimmed.startsWith("+") ||
        trimmed.startsWith("!")
      ) {
        currentQuestionLines.push(trimmed);
      } else if (
        trimmed &&
        currentPassageText !== null &&
        currentQuestionLines.length === 0
      ) {
        currentPassageText += "\n" + trimmed;
      }
    }
    flushQuestion();

    
    if (questionBlocks.length === 0) {
      toast.error("لم يتم العثور على أسئلة في النص");
      setLoading(false);
      console.log("[SmartImporter] No questions found");
      return;
    }

    // رفع المقالات أولاً
    const passageCache = new Map<string, string>();
    for (const block of questionBlocks) {
      if (block.passageText && !passageCache.has(block.passageText)) {
        const id = await insertPassage(props.subjectId, {
          content: block.passageText,
          season_id: seasonId(),
          year_id: yearId(),
        });
        if (id) passageCache.set(block.passageText, id);
      }
    }

    const questions = questionBlocks.map((block, blockIndex) => {
      const blockLines = block.text.split(/\n(?=[=+!])/g);
      const question = blockLines[0].trim();
      const optionLines = blockLines.filter(
        (l) => l.trim().startsWith("=") || l.trim().startsWith("+"),
      );
      const correctLine = optionLines.findIndex((l) => l.startsWith("+"));
      const correct_index = correctLine >= 0 ? correctLine : 0;
      const options = optionLines.map((l) =>
        l.trim().replace(/^[=+]/, "").trim(),
      );
      const explLine = blockLines.find((l) => l.trim().startsWith("!"));
      const explanation = explLine ? explLine.replace("!", "").trim() : null;
      const passage_id = block.passageText
        ? (passageCache.get(block.passageText) ?? null)
        : null;

      const qObj = {
        subject_id: props.subjectId,
        season_id: seasonId(),
        year_id: yearId(),
        question,
        explanation,
        options,
        correct_index,
        passage_id,
      };
      return qObj;
    });

    // ─── Progress Toast ───────────────────────────────────────────────────────
    // نُنشئ الـ signals خارج JSX حتى نتحكم بها من داخل الـ loop
    const [current, setCurrent] = createSignal(0);
    const [failed, setFailed] = createSignal(0);
    const total = questions.length;

    const toastId = toast.custom(
      () => {
        const pct = () => Math.round((current() / total) * 100);
        const isDone = () => current() + failed() >= total;

        return (
          <div
            dir="rtl"
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              "border-radius": "1.5rem",
              padding: "1rem 1.25rem",
              "min-width": "260px",
              "box-shadow": "0 4px 24px rgba(0,0,0,0.10)",
            }}
          >
            <div
              style={{
                display: "flex",
                "justify-content": "space-between",
                "margin-bottom": "0.5rem",
              }}
            >
              <span
                style={{
                  "font-size": "0.85rem",
                  "font-weight": "bold",
                  color: "#1e293b",
                }}
              >
                رفع الأسئلة 🚀
              </span>
              <span style={{ "font-size": "0.85rem", color: "#64748b" }}>
                {current()}/{total}
              </span>
            </div>
            <div
              style={{
                height: "8px",
                background: "#e2e8f0",
                "border-radius": "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct()}%`,
                  background: isDone()
                    ? failed() > 0
                      ? "#f97316"
                      : "#22c55e"
                    : "linear-gradient(90deg, #06b6d4, #8b5cf6)",
                  "border-radius": "999px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <p
              style={{
                "margin-top": "0.4rem",
                "font-size": "0.75rem",
                color: "#94a3b8",
                "text-align": "right",
              }}
            >
              {isDone()
                ? failed() > 0
                  ? ` ✅ ${current()} نجح · ❌ ${failed()} فشل`
                  : "✅ اكتمل بنجاح!"
                : "⏳ جاري الرفع..."}
            </p>
          </div>
        );
      },
      { duration: Infinity, unmountDelay: 0 },
    );
    // ─────────────────────────────────────────────────────────────────────────

    // رفع تسلسلي مع تحديث البروجرس بعد كل سؤال
    let successCount = 0;
    let failCount = 0;

    for (const q of questions) {
      const { error: qErr } = await supabase.from("questions").insert(q);
      if (qErr) {
        failCount++;
        setFailed(failCount);
      } else {
        successCount++;
        setCurrent(successCount);
      }
    }

    // أغلق الـ toast بعد ثانيتين من الاكتمال
    setTimeout(() => toast.dismiss(toastId), 2000);

    setLoading(false);

    if (successCount > 0) {
      setRawText("");
      props.onComplete();
    }
  };

  return (
    <div class="space-y-4" dir="rtl">
      <SectionSelectors
        sections={props.sections}
        seasonId={seasonId()}
        yearId={yearId()}
        onSeasonChange={setSeasonId}
        onYearChange={setYearId}
      />
      <div class="space-y-1 rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 dark:bg-slate-900">
        <p>
          <span class="font-mono font-bold text-cyan-600">@</span> نص المقالة ←
          تفعيل مقالة للأسئلة التالية
        </p>
        <p>
          <span class="font-mono font-bold text-slate-800 dark:text-slate-200">
            @@
          </span>{" "}
          ← إلغاء المقالة (أسئلة عادية بعدها)
        </p>
        <p>
          <span class="font-mono font-bold text-fuchsia-600">#</span> سؤال
          &nbsp;
          <span class="font-mono font-bold text-green-600">+</span> صحيح &nbsp;
          <span class="font-mono font-bold text-red-400">=</span> خاطئ &nbsp;
          <span class="font-mono font-bold text-amber-500">!</span> شرح
        </p>
      </div>
      <textarea
        value={rawText()}
        onInput={(e) => setRawText(e.currentTarget.value)}
        placeholder={
          "@ نص المقالة هنا...\n\n# السؤال الأول\n= خيار خاطئ\n+ خيار صحيح\n! شرح اختياري\n\n@@\n\n# سؤال عادي بدون مقالة\n+ ..."
        }
        class="h-72 w-full rounded-[2rem] bg-slate-50 p-6 font-mono text-sm outline-none placeholder:text-right focus:ring-4 focus:ring-cyan-100 dark:bg-slate-900 dark:text-white"
        dir="rtl"
      />

      {/* ✅ عداد مرئي للأسئلة المكتشفة */}
      <Show when={previewCount() > 0}>
        <p class="text-center text-sm font-bold text-cyan-600">
          🔍 تم اكتشاف {previewCount()} سؤال جاهز للرفع
        </p>
      </Show>

      <button
        disabled={loading() || previewCount() === 0}
        onClick={parseAndUpload}
        class="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-4 font-black text-white shadow-lg transition disabled:opacity-50"
      >
        {loading()
          ? "جاري التحليل والرفع..."
          : `تحليل ورفع ${previewCount() > 0 ? previewCount() + " أسئلة" : "الكل"} دفعة واحدة 🚀`}
      </button>
    </div>
  );
}

// ─── ManualForm ───────────────────────────────────────────────────────────────

// 📌 LESSON 7: لماذا نقرأ localStorage هنا وليس في مكان مركزي؟
// هذا ضعف في الكود الأصلي — يُقرأ في كل save.
// الأفضل: createSignal للمستخدم في مكان مشترك (context أو store)
// لكن لعدم كسر الكود الحالي سنبقيه كما هو مع تحسين طفيف

function ManualForm(props: {
  subjectId: string;
  sections: Section[];
  editQuestion?: QuestionUI | null;
  onComplete: () => void;
}) {
  const isEdit = () => !!props.editQuestion;

  const [seasonId, setSeasonId] = createSignal<number | null>(
    props.editQuestion?.season_id ?? null,
  );
  const [yearId, setYearId] = createSignal<number | null>(
    props.editQuestion?.year_id ?? null,
  );
  const [question, setQuestion] = createSignal(
    props.editQuestion?.question ?? "",
  );
  const [explanation, setExplanation] = createSignal(
    props.editQuestion?.explanation ?? "",
  );
  const [options, setOptions] = createSignal<string[]>(
    props.editQuestion?.options?.length
      ? [...props.editQuestion.options, ...Array(4).fill("")].slice(
          0,
          Math.max(props.editQuestion.options.length, 4),
        )
      : ["", "", "", ""],
  );
  const [correctIndex, setCorrectIndex] = createSignal<number>(
    props.editQuestion?.correctIndex ?? 0,
  );
  const [saving, setSaving] = createSignal(false);
  const [imageUrl, setImageUrl] = createSignal<string | null>(
    props.editQuestion?.image_url ?? null,
  );
  const [imageUploading, setImageUploading] = createSignal(false);

  // ─── Passage state ────────────────────────────────────────────────────────
  const [passages] = createResource(() => getPassages(props.subjectId));
  const [passageId, setPassageId] = createSignal<string | null>(
    props.editQuestion?.passage_id ?? null,
  );
  const [newPassageText, setNewPassageText] = createSignal("");
  const [showNewPassage, setShowNewPassage] = createSignal(false);

  // ✅ معاينة المقالة المحددة حالياً
  const selectedPassageContent = () =>
    passages()?.find((p) => p.$id === passageId())?.content;

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
    // ✅ تحقق من وجود خيارين على الأقل
    const filledOptions = options().filter(Boolean);
    if (filledOptions.length < 2) {
      toast.error("أدخل خيارين على الأقل");
      return;
    }

    setSaving(true);

    // رفع مقالة جديدة إذا أُدخلت
    let finalPassageId = passageId();
    if (showNewPassage() && newPassageText().trim()) {
      const id = await insertPassage(props.subjectId, {
        content: newPassageText().trim(),
        season_id: seasonId(),
        year_id: yearId(),
      });
      if (id) finalPassageId = id;
    }

    // 📌 LESSON 8: قراءة localStorage بأمان
    // JSON.parse قد تُفشل إذا كانت القيمة تالفة، لذا نُغلّفها بـ try/catch
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

    // 📌 LESSON 9: هذا هو pattern الـ "mutation" في SolidJS
    // لا نحتاج useMutation — نستدعي الدالة مباشرة
    // الدالة updateQuestion / insertQuestion ترجع error أو null
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

      {/* ─── صورة السؤال ─── */}
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
            {/* زر حذف */}
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
            {/* زر تغيير الصورة */}
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

      {/* ─── الخيارات ─── */}
      <div class="flex flex-col gap-2">
        <For each={options()}>
          {(opt, i) => (
            <div class="flex items-center gap-2">
              {/* زر تحديد الإجابة الصحيحة */}
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
                  onClick={() =>
                    setOptions(options().filter((_, idx) => idx !== i()))
                  }
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

      {/* ─── ربط مقالة ─── */}
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
                  {/* ✅ عرض ID مختصر + معاينة أوضح */}[{p.$id.slice(0, 6)}]{" "}
                  {p.content.slice(0, 50)}...
                </option>
              )}
            </For>
          </select>

          {/* ✅ معاينة المقالة المحددة */}
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

// ─── PassageManager ───────────────────────────────────────────────────────────

function PassageManager(props: { subjectId: string }) {
  // 📌 LESSON 10: createResource مع refetch
  // createResource يجلب البيانات تلقائياً عند أول تحميل
  // { refetch } تعيد الجلب يدوياً بعد أي تعديل
  const [passages, { refetch }] = createResource(() =>
    getPassages(props.subjectId),
  );
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editText, setEditText] = createSignal("");
  const [savingId, setSavingId] = createSignal<string | null>(null); // ✅ تتبع أي مقالة يجري حفظها

  const startEdit = (p: PassageUI) => {
    setEditingId(p.$id);
    setEditText(p.content);
  };

  const saveEdit = async () => {
    if (!editingId()) return;
    setSavingId(editingId());
    await updatePassage(editingId()!, editText());
    setSavingId(null);
    setEditingId(null);
    toast.success("تم حفظ المقالة");
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذه المقالة؟ سيتم إلغاء ربطها بجميع الأسئلة.",
      )
    )
      return;
    await deletePassage(id);
    toast.success("تم حذف المقالة");
    refetch();
  };

  return (
    <div class="space-y-4" dir="rtl">
      <Show
        when={(passages() ?? []).length > 0}
        fallback={
          <p class="py-10 text-center text-slate-400">لا توجد مقالات بعد 📄</p>
        }
      >
        <p class="text-sm text-slate-400">
          إجمالي:{" "}
          <span class="font-bold text-slate-600 dark:text-slate-300">
            {passages()?.length}
          </span>
        </p>
        <For each={passages()}>
          {(p) => (
            <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {/* ✅ عرض رقم ترتيبي + ID */}
              <div class="flex items-center gap-2">
                <span class="font-mono text-[10px] text-slate-400">
                  {p.$id.slice(0, 8)}
                </span>
              </div>

              <Show
                when={editingId() === p.$id}
                fallback={
                  <p class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {p.content}
                  </p>
                }
              >
                <textarea
                  value={editText()}
                  onInput={(e) => setEditText(e.currentTarget.value)}
                  rows={6}
                  dir="rtl"
                  class="w-full rounded-xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                />
              </Show>

              <div class="flex justify-end gap-2">
                <Show when={editingId() === p.$id}>
                  <button
                    onClick={() => setEditingId(null)}
                    class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500 dark:bg-slate-700"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={savingId() === p.$id}
                    class="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {savingId() === p.$id ? "جاري الحفظ..." : "حفظ ✏️"}
                  </button>
                </Show>
                <Show when={editingId() !== p.$id}>
                  <button
                    onClick={() => startEdit(p)}
                    class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    تعديل ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(p.$id)}
                    class="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-500 dark:bg-red-900/20"
                  >
                    حذف 🗑️
                  </button>
                </Show>
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}

// ─── BulkActionBar ────────────────────────────────────────────────────────────

function BulkActionBar(props: {
  selectedIds: Set<string>;
  sections: Section[];
  subjectId: string;
  onClear: () => void;
  onComplete: () => void;
}) {
  const [moving, setMoving] = createSignal(false);
  const [targetSeasonId, setTargetSeasonId] = createSignal<number | null>(null);
  const [targetYearId, setTargetYearId] = createSignal<number | null>(null);
  const [showPanel, setShowPanel] = createSignal(false);

  const count = () => props.selectedIds.size;

  const handleMove = async () => {
    if (!targetSeasonId() && !targetYearId()) {
      toast.error("اختر فصلاً أو سنة للنقل إليها");
      return;
    }

    setMoving(true);
    const ids = [...props.selectedIds];
    const updates: any = {};
    if (targetSeasonId()) updates.season_id = targetSeasonId();
    if (targetYearId()) updates.year_id = targetYearId();

    // نقل الأسئلة المحددة
    const { error } = await supabase
      .from("questions")
      .update(updates)
      .in("id", ids);

    setMoving(false);

    if (error) {
      toast.error("فشل النقل: " + error.message);
      return;
    }

    toast.success(`تم نقل ${count()} سؤال ✅`);
    props.onClear();
    props.onComplete();
    setShowPanel(false);
  };

  const handleDelete = async () => {
    if (!confirm(`هل تريد حذف ${count()} سؤال محدد؟ لا يمكن التراجع!`)) return;

    setMoving(true);
    const ids = [...props.selectedIds];
    const { error } = await supabase.from("questions").delete().in("id", ids);

    setMoving(false);

    if (error) {
      toast.error("فشل الحذف: " + error.message);
      return;
    }

    toast.success(`تم حذف ${count()} سؤال 🗑️`);
    props.onClear();
    props.onComplete();
  };

  return (
    <div
      class="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2"
      dir="rtl"
    >
      {/* ─── شريط الإجراءات ─── */}
      <div class="flex items-center gap-3 rounded-[2rem] bg-slate-900 p-4 text-white shadow-2xl">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-black">
          {count()}
        </span>
        <span class="flex-1 text-sm font-bold">سؤال محدد</span>

        <button
          onClick={() => setShowPanel(!showPanel())}
          class="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold transition hover:bg-cyan-400"
        >
          نقل 📦
        </button>
        <button
          onClick={handleDelete}
          disabled={moving()}
          class="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold transition hover:bg-red-400 disabled:opacity-50"
        >
          حذف 🗑️
        </button>
        <button
          onClick={props.onClear}
          class="rounded-xl bg-slate-700 px-3 py-2 text-sm font-bold transition hover:bg-slate-600"
        >
          ✕
        </button>
      </div>

      {/* ─── لوحة النقل ─── */}
      <Show when={showPanel()}>
        <div class="mt-2 rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-800">
          <p class="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            نقل {count()} سؤال إلى:
          </p>
          <div class="mb-4 grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-500">الفصل</label>
              <select
                class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                onChange={(e) =>
                  setTargetSeasonId(
                    e.currentTarget.value
                      ? Number(e.currentTarget.value)
                      : null,
                  )
                }
              >
                <option value="">بدون تغيير</option>
                <For each={props.sections.filter((s) => s.type === "season")}>
                  {(s) => <option value={s.id}>{s.name}</option>}
                </For>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-500">السنة</label>
              <select
                class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                onChange={(e) =>
                  setTargetYearId(
                    e.currentTarget.value
                      ? Number(e.currentTarget.value)
                      : null,
                  )
                }
              >
                <option value="">بدون تغيير</option>
                <For each={props.sections.filter((s) => s.type === "year")}>
                  {(y) => <option value={y.id}>{y.name}</option>}
                </For>
              </select>
            </div>
          </div>
          <button
            onClick={handleMove}
            disabled={moving() || (!targetSeasonId() && !targetYearId())}
            class="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-black text-white shadow-lg transition disabled:opacity-50"
          >
            {moving() ? "جاري النقل..." : `نقل ${count()} سؤال ✅`}
          </button>
        </div>
      </Show>
    </div>
  );
}


// ─── SubjectPicker ────────────────────────────────────────────────────────────

const YEARS = [
  { id: "second", name: "الثانية" },
  { id: "third", name: "الثالثة" },
  { id: "fourth", name: "الرابعة" },
  { id: "fifth", name: "الخامسة" },
];

function SubjectPicker(props: { onSelect: (subjectId: string) => void }) {
  const [yearKey, setYearKey] = createSignal<string>("second");
  const [subjects] = createResource(
    () => yearKey(),
    (year) => getSubjectsOfflineFirst(year),
  );

  return (
    <div class="min-h-screen bg-[#f8fafc] px-5 pt-22 pb-10 dark:bg-[#0f172a]" dir="rtl">
      <div class="mx-auto max-w-lg">
        <div class="mb-8 text-center">
          <div class="mb-3 flex justify-center">
            <span class="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 text-3xl shadow-lg">
              🎛️
            </span>
          </div>
          <h1 class="text-2xl font-black text-slate-800 dark:text-white">لوحة الإدارة</h1>
          <p class="mt-1 text-sm text-slate-400">اختر المادة التي تريد إدارتها</p>
        </div>

        <div class="mb-4 rounded-[2rem] bg-white p-4 shadow-sm dark:bg-slate-800">
          <p class="mb-3 text-xs font-bold text-slate-400">📅 السنة الدراسية</p>
          <div class="flex flex-wrap gap-2 justify-around">
            <For each={YEARS}>
              {(y) => (
                <button
                  onClick={() => setYearKey(y.id)}
                  class={`rounded-2xl p-2 w-17 text-sm font-bold transition-all ${
                    yearKey() === y.id
                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {y.name}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="rounded-[2rem] bg-white p-4 shadow-sm dark:bg-slate-800">
          <p class="mb-3 text-xs font-bold text-slate-400">📚 المواد</p>
          <Show
            when={!subjects.loading}
            fallback={
              <div class="animate-pulse py-8 text-center text-slate-400">
                جاري التحميل... ⏳
              </div>
            }
          >
            <Show
              when={(subjects() ?? []).length > 0}
              fallback={
                <p class="py-8 text-center text-slate-400">لا توجد مواد لهذه السنة 📭</p>
              }
            >
              <div class="grid gap-2">
                <For each={subjects()}>
                  {(sub) => (
                    <button
                      onClick={() => props.onSelect(sub.id)}
                      class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-cyan-700 dark:hover:bg-cyan-900/20"
                    >
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-black text-white shadow-sm">
                        {sub.name.charAt(0)}
                      </span>
                      <div class="flex-1">
                        <p class="font-bold text-slate-700 dark:text-slate-200">{sub.name}</p>
                        <p class="text-[11px] text-slate-400">{sub.id}</p>
                      </div>
                      <span class="text-slate-300 dark:text-slate-600">←</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const params = useParams();
  const location = useLocation();
  const { user } = useUser();
  const navigate = useNavigate();

  // اختيار المادة — إذا لم يكن هناك subject في URL، نعرض SubjectPicker
  const [pickedSubject, setPickedSubject] = createSignal<string | null>(null);
  const subjectId = () => params.subject || pickedSubject();

  // مثال: /dev/math?season=3&year=7
  // [searchParams, setSearchParams] = useSearchParams()
  // searchParams.season  ← قراءة (string أو undefined)
  // setSearchParams({ season: "3" })  ← تغيير يحدث URL تلقائياً
  const [searchParams, setSearchParams] = useSearchParams();

  const isInFavorite = () => location.pathname.includes("favorite");

  const [page, setPage] = createSignal(0);
  const [mode, setMode] = createSignal<"smart" | "manual">("smart");
  const [showAdd, setShowAdd] = createSignal(false);
  const [editTarget, setEditTarget] = createSignal<QuestionUI | null>(null);
  const [mainTab, setMainTab] = createSignal<"questions" | "passages">(
    "questions",
  );

  // ✅ ميزة التحديد المتعدد — Set يحتفظ بالـ IDs المحددة عبر الصفحات
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set<string>());
  const [selectionMode, setSelectionMode] = createSignal(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // إذا أصبح الـ Set فارغاً اخرج من وضع التحديد
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set<string>());
    setSelectionMode(false);
  };

  // تحديد/إلغاء تحديد كل أسئلة الصفحة الحالية
  const toggleSelectAll = () => {
    const currentIds = data()?.questions.map((q) => q.$id) ?? [];
    const allSelected = currentIds.every((id) => selectedIds().has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        currentIds.forEach((id) => next.delete(id));
        if (next.size === 0) setSelectionMode(false);
      } else {
        currentIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // ✅ فلاتر الفصل والسنة من URL (قراءة فقط — الكتابة عبر setSearchParams)
  const filterSeasonId = () =>
    searchParams.season ? Number(searchParams.season) : null;
  const filterYearId = () =>
    searchParams.year ? Number(searchParams.year) : null;

  const [sections] = createResource(() => getSections(subjectId() ?? ""));

  // 📌 LESSON 12: createResource مع source مركب
  // عندما نمرر دالة كـ source، يُعاد الجلب تلقائياً كلما تغيرت قيمتها.
  // هنا نجمع page + filterSeasonId + filterYearId في object واحد
  // أي تغيير في أي منها → يُعيد الجلب فوراً
  const [data, { refetch }] = createResource(
    () => ({
      p: page(),
      seasonId: filterSeasonId(),
      yearId: filterYearId(),
    }),
    async ({ p, seasonId, yearId }) => {
      let query = supabase
        .from("questions")
        .select(
          `*, image_url, season:sections!season_id(id,name,value),
               year:sections!year_id(id,name,value)`,
          { count: "exact" },
        )
        .eq("subject_id", subjectId() ?? "");

      // ✅ تطبيق الفلاتر فقط إن وُجدت
      if (seasonId) query = query.eq("season_id", seasonId);
      if (yearId) query = query.eq("year_id", yearId);

      const {
        data: rows,
        count,
        error,
      } = await query
        .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(error.message);
        return {
          questions: [],
          total: 0,
          namesMap: new Map<string, string>(),
          passagesMap: new Map<string, string>(),
        };
      }

      const questions: QuestionUI[] = (rows ?? []).map((row: any) => ({
        $id: row.id,
        subject_id: row.subject_id,
        season_id: row.season_id,
        year_id: row.year_id,
        question: row.question,
        explanation: row.explanation,
        options: row.options ?? [],
        correctIndex: row.correct_index,
        user_id: row.created_by,
        passage_id: row.passage_id,
        seasonName: row.season?.name,
        seasonValue: row.season?.value,
        yearName: row.year?.name,
        yearValue: row.year?.value,
        image_url: row.image_url,
      }));

      const userIds = questions
        .map((q) => q.user_id)
        .filter(Boolean) as string[];
      const namesMap = await fetchUserNames(userIds);

      // ✅ جلب المقالات المرتبطة وبناء map للعرض السريع في الكاردات
      const passageIds = [
        ...new Set(questions.map((q) => q.passage_id).filter(Boolean)),
      ] as string[];

      const passagesMap = new Map<string, string>();
      if (passageIds.length > 0) {
        const { data: passageRows } = await supabase
          .from("passages")
          .select("id, content")
          .in("id", passageIds);
        (passageRows ?? []).forEach((r: any) =>
          passagesMap.set(r.id, r.content),
        );
      }

      return { questions, total: count ?? 0, namesMap, passagesMap };
    },
  );

  // 📌 LESSON 13: createEffect
  // يعمل مثل useEffect في React لكن بدون dependency array
  // يكتشف تلقائياً ماذا يقرأ ويُعيد التشغيل عند التغيير
  // هنا: كلما تغير الفلتر → نرجع للصفحة الأولى
  // (بدون هذا قد تبقى في صفحة 5 بعد تغيير الفصل وتجد لا توجد نتائج)
  //
  // ملاحظة: لا نستخدم createEffect هنا لأن setSearchParams يُغير URL
  // وتغيير URL يُعيد تشغيل الـ resource تلقائياً
  // لكن نحتاج إعادة ضبط الصفحة عند تغيير الفلتر
  // نستخدم createEffect لمراقبة filterSeasonId و filterYearId
  //
  // (uncomment if needed)
  // createEffect(() => {
  //   filterSeasonId();
  //   filterYearId();
  //   setPage(0);
  // });

  const openEdit = (q: QuestionUI) => {
    setEditTarget(q);
    setMode("manual");
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onFormComplete = () => {
    setShowAdd(false);
    setEditTarget(null);
    refetch();
  };

   createEffect(() => {
    if (user() && user()?.role !== "admin") {
      navigate("/", { replace: true });
    }
  });

  // عرض SubjectPicker إذا لم يكن هناك subject
  if (!subjectId()) {
    return <SubjectPicker onSelect={(id) => {
      setPickedSubject(id);
      navigate(`/dashboard/${id}`, { replace: true });
    }} />;
  }

  return (
    <Show when={!isInFavorite()}>
      <div
        class="min-h-screen bg-[#f8fafc] px-5 pt-22 pb-10 dark:bg-[#0f172a]"
        dir="rtl"
      >
        {/* ─── Header ─── */}
        <div class="mx-auto mb-8 flex max-w-4xl items-center justify-between rounded-[2.5rem] bg-white/80 p-6 shadow-sm backdrop-blur-md dark:bg-slate-800/80">
          <div>
            <h1 class="text-2xl font-black text-slate-800 dark:text-white">
              إدارة المحتوى
            </h1>
            <div class="flex items-center mt-3 gap-1">
              <p class="text-sm text-slate-400">المادة: <span class="font-bold text-slate-600 dark:text-slate-300">{subjectId()}</span></p>
              <button
                onClick={() => {
                  setPickedSubject(null);
                  navigate("/dashboard", { replace: true });
                }}
                class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                title="تغيير المادة"
              >
                تغيير ↩
              </button>
            </div>
          </div>
          <div class="flex flex-col-reverse lg:flex-row items-center gap-2">
            {/* ✅ زر وضع التحديد المتعدد */}
            <button
              onClick={() => {
                if (selectionMode()) {
                  clearSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              class={`flex h-7 w-7 items-center justify-center rounded-full text-lg transition-all ${
                selectionMode()
                  ? "bg-cyan-500 text-white shadow-lg"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
              }`}
              title={selectionMode() ? "إلغاء وضع التحديد" : "تحديد متعدد"}
            >
              {selectionMode() ? "✕" : "☑"}
            </button>
            <button
              onClick={() => {
                setEditTarget(null);
                setShowAdd(!showAdd());
              }}
              class={`flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg transition-all ${
                showAdd()
                  ? "rotate-45 bg-slate-800"
                  : "bg-gradient-to-tr from-cyan-400 to-fuchsia-500"
              }`}
            >
              +
            </button>
          </div>
        </div>
        
        <Show when={mainTab() === "questions"}>
          {/* ─── Form panel ─── */}
          <Show when={showAdd()}>
            <div class="mb-12 rounded-[3rem] border-4 border-cyan-50 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <Show when={!editTarget()}>
                <div class="mx-auto mb-8 flex w-fit rounded-full bg-slate-100 p-1 dark:bg-slate-900">
                  <button
                    onClick={() => setMode("smart")}
                    class={`rounded-full px-8 py-2 font-bold transition-all ${mode() === "smart" ? "bg-white text-cyan-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
                  >
                    🚀 ذكي
                  </button>
                  <button
                    onClick={() => setMode("manual")}
                    class={`rounded-full px-8 py-2 font-bold transition-all ${mode() === "manual" ? "bg-white text-fuchsia-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
                  >
                    ✍️ يدوي
                  </button>
                </div>
              </Show>

              <Switch>
                <Match when={mode() === "smart" && !editTarget()}>
                  <SmartImporter
                    subjectId={subjectId() ?? ""}
                    sections={sections() ?? []}
                    onComplete={onFormComplete}
                  />
                </Match>
                <Match when={mode() === "manual" || editTarget()}>
                  <ManualForm
                    subjectId={subjectId() ?? ""}
                    sections={sections() ?? []}
                    editQuestion={editTarget()}
                    onComplete={onFormComplete}
                  />
                </Match>
              </Switch>
            </div>
          </Show>
        </Show>

        {/* ─── فلاتر الفصل والسنة (من URL) ─── */}
        <Show when={sections()}>
          <div class="mx-auto mb-6 max-w-4xl">
            <div class="rounded-[2rem] bg-white p-4 shadow-sm dark:bg-slate-800">
              <p class="mb-3 text-xs font-bold text-slate-400">
                🔍 تصفية الأسئلة
              </p>
              <div class="grid grid-cols-2 gap-3">
                {/* فلتر الفصل */}
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-slate-500 dark:text-slate-400">
                    الفصل
                  </label>
                  <select
                    class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                    onChange={(e) => {
                      setPage(0);
                      setSearchParams({
                        season: e.currentTarget.value || undefined,
                      });
                    }}
                  >
                    <option value="">الكل</option>
                    <For each={sections()?.filter((s) => s.type === "season")}>
                      {(s) => (
                        <option
                          value={s.id}
                          selected={filterSeasonId() === s.id}
                        >
                          {s.name}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
                {/* فلتر السنة */}
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-slate-500 dark:text-slate-400">
                    السنة
                  </label>
                  <select
                    class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                    onChange={(e) => {
                      setPage(0);
                      setSearchParams({
                        year: e.currentTarget.value || undefined,
                      });
                    }}
                  >
                    <option value="">الكل</option>
                    <For each={sections()?.filter((s) => s.type === "year")}>
                      {(y) => (
                        <option value={y.id} selected={filterYearId() === y.id}>
                          {y.name}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </div>
              {/* ✅ زر إعادة ضبط الفلاتر */}
              <Show when={filterSeasonId() || filterYearId()}>
                <button
                  onClick={() => {
                    setPage(0);
                    setSearchParams({ season: undefined, year: undefined });
                  }}
                  class="mt-2 text-xs text-red-400 underline"
                >
                  ✕ إلغاء الفلترة
                </button>
              </Show>
            </div>
          </div>
        </Show>

        {/* ─── Main Tab Switcher ─── */}
        <div class="mx-auto mb-6 flex w-fit max-w-4xl rounded-full bg-slate-100 p-1 dark:bg-slate-900">
          <button
            onClick={() => setMainTab("questions")}
            class={`rounded-full px-6 py-2 text-sm font-bold transition-all ${mainTab() === "questions" ? "bg-white text-cyan-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
          >
            📋 الأسئلة
          </button>
          <button
            onClick={() => setMainTab("passages")}
            class={`rounded-full px-6 py-2 text-sm font-bold transition-all ${mainTab() === "passages" ? "bg-white text-amber-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
          >
            🗒️ المقالات
          </button>
        </div>

        <div class="mx-auto max-w-4xl pb-12">
          <Show when={mainTab() === "passages"}>
            <PassageManager subjectId={subjectId() ?? ""} />
          </Show>

          <Show when={mainTab() === "questions"}>
            {/* ─── قائمة الأسئلة ─── */}
            <Suspense
              fallback={
                <div class="animate-pulse p-20 text-center text-slate-400">
                  جاري تحميل الأسئلة... 🧬
                </div>
              }
            >
              <Show
                when={(data()?.total ?? 0) > 0}
                fallback={
                  <p class="py-20 text-center text-slate-400">
                    {filterSeasonId() || filterYearId()
                      ? "لا توجد أسئلة لهذا الفلتر 🔍"
                      : "لا توجد أسئلة بعد 🎯"}
                  </p>
                }
              >
                <p class="mb-4 text-sm text-slate-400">
                  إجمالي:{" "}
                  <span class="font-bold text-slate-600 dark:text-slate-300">
                    {data()?.total}
                  </span>
                  <Show when={filterSeasonId() || filterYearId()}>
                    <span class="mr-2 text-cyan-500">(مُفلترة)</span>
                  </Show>
                  {/* ✅ زر تحديد كل الصفحة في وضع التحديد */}
                  <Show when={selectionMode()}>
                    <button
                      onClick={toggleSelectAll}
                      class="mr-3 text-xs font-bold text-cyan-600 underline"
                    >
                      {(data()?.questions ?? []).every((q) =>
                        selectedIds().has(q.$id),
                      )
                        ? "إلغاء تحديد الصفحة"
                        : `تحديد الصفحة (${data()?.questions.length})`}
                    </button>
                    <Show when={selectedIds().size > 0}>
                      <span class="mr-1 text-xs font-bold text-cyan-700">
                        — {selectedIds().size} محدد إجمالاً
                      </span>
                    </Show>
                  </Show>
                </p>

                <div class="grid gap-4">
                  <For each={data()?.questions}>
                    {/* 📌 LESSON 14: i() في For هو الـ index (يبدأ من 0)
                        نضيف page() * PAGE_SIZE لعرض الرقم الصحيح عبر الصفحات */}
                    {(q, i) => (
                      <QuestionCard
                        question={q}
                        index={page() * PAGE_SIZE + i() + 1}
                        subjectId={subjectId() ?? ""}
                        namesMap={data()?.namesMap ?? new Map()}
                        passagesMap={data()?.passagesMap ?? new Map()}
                        onRefetch={refetch}
                        onEdit={openEdit}
                        isSelected={selectedIds().has(q.$id)}
                        onToggleSelect={toggleSelect}
                        selectionMode={selectionMode()}
                      />
                    )}
                  </For>
                </div>

                {/* ─── Pagination ─── */}
                <Show when={(data()?.total ?? 0) > PAGE_SIZE}>
                  <div class="mt-12 flex flex-wrap justify-center gap-2 pb-12">
                    <For
                      each={Array.from({
                        length: Math.ceil((data()?.total ?? 0) / PAGE_SIZE),
                      })}
                    >
                      {(_, i) => (
                        <button
                          onClick={() => {
                            setPage(i());
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          class={`h-8 w-8 rounded-full p-1 text-sm font-bold transition-all ${
                            page() === i()
                              ? "scale-110 bg-cyan-500 text-white"
                              : "bg-white text-slate-400 shadow-sm hover:bg-slate-50"
                          }`}
                        >
                          {i() + 1}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </Suspense>
          </Show>
        </div>
      </div>

      {/* ✅ شريط الإجراءات الجماعية — يظهر فقط عند تحديد أسئلة */}
      <Show when={selectedIds().size > 0}>
        <BulkActionBar
          selectedIds={selectedIds()}
          sections={sections() ?? []}
          subjectId={subjectId() ?? ""}
          onClear={clearSelection}
          onComplete={() => {
            clearSelection();
            refetch();
          }}
        />
      </Show>
    </Show>
  );
}