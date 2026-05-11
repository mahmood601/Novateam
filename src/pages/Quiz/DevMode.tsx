import {
  createSignal,
  createResource,
  For,
  Show,
  Suspense,
  Switch,
  Match,
} from "solid-js";
import { useParams, useLocation } from "@solidjs/router";
import { supabase } from "../../services/supabase";
import {
  getSections,
  deleteQuestion,
  insertQuestion,
  updateQuestion,
  type Section,
  type QuestionUI,
  insertPassage,
  getPassages,
} from "../../services/documentsManuplation";
import { fetchUserNames } from "../../services/user";
import toast from "solid-toast";

export type qModeT = "insert" | "edit" | "delete" | "";

const PAGE_SIZE = 10;

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard(props: {
  question: QuestionUI;
  subjectId: string;
  namesMap: Map<string, string>;
  onRefetch: () => void;
  onEdit: (q: QuestionUI) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  // قراءة مباشرة من الـ Map — لا طلب Supabase
  const inserterName = () =>
    props.question.user_id
      ? props.namesMap.get(props.question.user_id)
      : undefined;

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تريد حذف هذا السؤال؟")) return;
    setDeleting(true);
    await deleteQuestion(props.subjectId, props.question.$id);
    setDeleting(false);
    props.onRefetch();
  };

  return (
    <div
      onClick={() => setOpen(!open())}
      class="cursor-pointer rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      {/* Meta */}
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-700">
          {props.question.$id.slice(0, 8)}
        </span>
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
          <Show when={props.question.passage_id}>
            <span class="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30">
              🗒️ مقالة
            </span>
          </Show>
        </div>
      </div>

      {/* Question */}
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

      {/* Explanation */}
      <Show when={props.question.explanation}>
        <p
          class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          dir="auto"
        >
          💡 {props.question.explanation}
        </p>
      </Show>

      {/* Actions */}
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
        currentPassageText = null; // ← إلغاء المقالة
      } else if (trimmed.startsWith("@")) {
        flushQuestion();
        currentPassageText = trimmed.slice(1).trim(); // ← مقالة جديدة
      } else if (trimmed.startsWith("#")) {
        flushQuestion();
        currentQuestionLines = [trimmed.slice(1).trim()]; // ← سؤال جديد
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
        currentPassageText += "\n" + trimmed; // ← تكملة المقالة متعددة الأسطر
      }
    }
    flushQuestion();

    if (questionBlocks.length === 0) {
      toast.error("لم يتم العثور على أسئلة في النص");
      setLoading(false);
      return;
    }

    // رفع المقالات مع dedup — نفس المقالة لا تُرفع مرتين
    const passageCache = new Map<string, string>(); // النص → id
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

    const questions = questionBlocks.map((block) => {
      const blockLines = block.text.split(/\n(?=[=+!])/g);
      const question = blockLines[0].trim();
      const optionLines = blockLines.filter(
        (l) => l.trim().startsWith("=") || l.trim().startsWith("+"),
      );
      const correctLine = optionLines.findIndex((l) => l.startsWith("+"));
      const options = optionLines.map((l) =>
        l.trim().replace(/^[=+]/, "").trim(),
      );
      const explLine = blockLines.find((l) => l.trim().startsWith("!"));
      const explanation = explLine ? explLine.replace("!", "").trim() : null;
      const passage_id = block.passageText
        ? (passageCache.get(block.passageText) ?? null)
        : null;

      return {
        subject_id: props.subjectId,
        season_id: seasonId(),
        year_id: yearId(),
        question,
        explanation,
        options,
        correct_index: correctLine >= 0 ? correctLine : 0,
        passage_id,
      };
    });

    const { error } = await supabase.from("questions").insert(questions);
    setLoading(false);
    if (error) {
      toast.error("خطأ في الرفع: " + error.message);
      return;
    }

    toast.success(`تم رفع ${questions.length} سؤال 🎉`);
    setRawText("");
    props.onComplete();
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
      {/* تعليمات الرموز */}
      <div
        class="space-y-1 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900"
        dir="rtl"
      >
        <p>
          <span class="font-mono font-bold text-cyan-600">@</span> نص المقالة ←
          تفعيل مقالة للأسئلة التالية
        </p>
        <p>
          <span class="font-mono font-bold">@@</span> ← إلغاء المقالة
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
        placeholder={`# النور أدرينالين يفرز من:\n= الجهاز نظير الودي\n+ الجهاز الودي\n= كلاهما\n= لا شيء مما سبق\n! لان الجهاز الودي هو فقط من يحرر النورأدرينالين (شرح اختياري)\n\n مخصص للمقالة\n@ نص المقالة...\n\n# السؤال الأول\n= خاطئ\n+ صحيح\n\n@@\n\n# سؤال عادي\n+ ...`}
        class="h-64 w-full rounded-[2rem] bg-slate-50 p-6 font-mono text-sm outline-none placeholder:text-right focus:ring-4 focus:ring-cyan-100 dark:bg-slate-900 dark:text-white"
        dir="rtl"
      />

      <button
        disabled={loading()}
        onClick={parseAndUpload}
        class="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-4 font-black text-white shadow-lg transition disabled:opacity-50"
      >
        {loading() ? "جاري التحليل والرفع..." : "تحليل ورفع الكل دفعة واحدة 🚀"}
      </button>
    </div>
  );
}

// ─── ManualForm ───────────────────────────────────────────────────────────────

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

  const toggleCorrect = (idx: number) => setCorrectIndex(idx);

  const updateOption = (idx: number, val: string) => {
    const updated = [...options()];
    updated[idx] = val;
    setOptions(updated);
  };

  const [passages] = createResource(() => getPassages(props.subjectId));
  const [passageId, setPassageId] = createSignal<string | null>(
    props.editQuestion?.passage_id ?? null,
  );
  const [newPassageText, setNewPassageText] = createSignal("");
  const [showNewPassage, setShowNewPassage] = createSignal(false);

  const save = async () => {
    if (!seasonId() || !yearId()) {
      toast.error("اختر الفصل والسنة");
      return;
    }
    if (!question().trim()) {
      toast.error("أدخل نص السؤال");
      return;
    }
    // if (correctIndex().length === 0) {
    //   toast.error("اختر إجابة صحيحة واحدة على الأقل");
    //   return;
    // }

    let finalPassageId = passageId();
    if (showNewPassage() && newPassageText().trim()) {
      const id = await insertPassage(props.subjectId, {
        content: newPassageText().trim(),
        season_id: seasonId(),
        year_id: yearId(),
      });
      if (id) finalPassageId = id;
    }

    setSaving(true);
    const data = {
      subject: props.subjectId,
      season_id: seasonId(),
      year_id: yearId(),
      question: question(),
      explanation: explanation(),
      options: options().filter(Boolean),
      correctIndex: correctIndex(),
      user_id: JSON.parse(localStorage.getItem("user") ?? "{}").id ?? "",
      passage_id: finalPassageId ?? null,
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
              >
                {correctIndex() == i() ? "✓" : i() + 1}
              </button>
              <input
                value={opt}
                onChange={(e) => updateOption(i(), e.currentTarget.value)}
                placeholder={`الخيار ${i() + 1}`}
                required={i() < 2}
                dir="rtl"
                class="flex min-w-0 flex-1 rounded-xl bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-fuchsia-200 dark:bg-slate-900 dark:text-white"
              />
              {/* حذف خيار إضافي */}
              <Show when={i() >= 2}>
                <button
                  type="button"
                  onClick={() =>
                    setOptions(options().filter((_, idx) => idx !== i()))
                  }
                  class="text-red-400 hover:text-red-600"
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
            class="text-main text-sm underline"
          >
            + إضافة خيار
          </button>
        </Show>
      </div>

      <p class="text-center text-xs text-slate-400">
        اضغط على الرقم لتحديد الإجابة الصحيحة
      </p>
      <div class="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p class="text-sm font-bold text-slate-600 dark:text-slate-400">
          🗒️ مقالة (اختياري)
        </p>

        <Show when={!showNewPassage()}>
          <select
            class="w-full rounded-xl bg-white p-3 text-sm outline-none dark:bg-slate-800 dark:text-white"
            onChange={(e) => setPassageId(e.currentTarget.value || null)}
          >
            <option value="">بدون مقالة</option>
            <For each={passages() ?? []}>
              {(p) => (
                <option value={p.$id} selected={passageId() === p.$id}>
                  {p.content.slice(0, 60)}...
                </option>
              )}
            </For>
          </select>
        </Show>

        <Show when={showNewPassage()}>
          <textarea
            value={newPassageText()}
            onInput={(e) => setNewPassageText(e.currentTarget.value)}
            placeholder="أدخل نص المقالة الجديدة..."
            rows={4}
            dir="rtl"
            class="w-full rounded-xl bg-white p-3 text-sm outline-none dark:bg-slate-800 dark:text-white"
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

// ─── DevMode — main ───────────────────────────────────────────────────────────

export default function DevMode() {
  const params = useParams();
  const location = useLocation();
  const isInFavorite = () => location.pathname.includes("favorite");

  const [page, setPage] = createSignal(0);
  const [mode, setMode] = createSignal<"smart" | "manual">("smart");
  const [showAdd, setShowAdd] = createSignal(false);
  const [editTarget, setEditTarget] = createSignal<QuestionUI | null>(null);

  const [sections] = createResource(() => getSections(params.subject));

  const [data, { refetch }] = createResource(page, async (p) => {
    const {
      data: rows,
      count,
      error,
    } = await supabase
      .from("questions")
      .select(
        `*, season:sections!season_id(id,name,value),
             year:sections!year_id(id,name,value)`,
        { count: "exact" },
      )
      .eq("subject_id", params.subject)
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return { questions: [], total: 0, namesMap: new Map<string, string>() };
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
      seasonName: row.season?.name,
      seasonValue: row.season?.value,
      yearName: row.year?.name,
      yearValue: row.year?.value,
    }));

    // طلب واحد لكل الأسماء بدل طلب لكل card
    const userIds = questions.map((q) => q.user_id).filter(Boolean) as string[];
    const namesMap = await fetchUserNames(userIds);

    return { questions, total: count ?? 0, namesMap };
  });

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

  return (
    <Show when={!isInFavorite()}>
      <div
        class="min-h-screen bg-[#f8fafc] px-5 pt-22 pb-10 dark:bg-[#0f172a]"
        dir="rtl"
      >
        {/* Header */}
        <div class="mx-auto mb-8 flex max-w-4xl items-center justify-between rounded-[2.5rem] bg-white/80 p-6 shadow-sm backdrop-blur-md dark:bg-slate-800/80">
          <div>
            <h1 class="text-2xl font-black text-slate-800 dark:text-white">
              إدارة المحتوى
            </h1>
            <p class="text-sm text-slate-400">أسئلة المادة: {params.subject}</p>
          </div>
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

        <div class="mx-auto max-w-4xl pb-12">
          {/* Form panel */}
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
                    subjectId={params.subject}
                    sections={sections() ?? []}
                    onComplete={onFormComplete}
                  />
                </Match>
                <Match when={mode() === "manual" || editTarget()}>
                  <ManualForm
                    subjectId={params.subject}
                    sections={sections() ?? []}
                    editQuestion={editTarget()}
                    onComplete={onFormComplete}
                  />
                </Match>
              </Switch>
            </div>
          </Show>

          {/* List */}
          <Suspense
            fallback={
              <div class="animate-bounce p-20 text-center text-slate-400">
                جاري تحميل الأسئلة... 🧬
              </div>
            }
          >
            <Show
              when={(data()?.total ?? 0) > 0}
              fallback={
                <p class="py-20 text-center text-slate-400">
                  لا توجد أسئلة بعد 🎯
                </p>
              }
            >
              <p class="mb-4 text-sm text-slate-400">
                إجمالي:{" "}
                <span class="font-bold text-slate-600 dark:text-slate-300">
                  {data()?.total}
                </span>
              </p>

              <div class="grid gap-4">
                <For each={data()?.questions}>
                  {(q) => (
                    <QuestionCard
                      question={q}
                      subjectId={params.subject}
                      namesMap={data()?.namesMap ?? new Map()}
                      onRefetch={refetch}
                      onEdit={openEdit}
                    />
                  )}
                </For>
              </div>

              <Show when={(data()?.total ?? 0) > PAGE_SIZE}>
                <div class="mt-12 flex flex-wrap justify-center gap-2 pb-12">
                  <For
                    each={Array.from({
                      length: Math.ceil((data()?.total ?? 0) / PAGE_SIZE),
                    })}
                  >
                    {(_, i) => (
                      <button
                        onClick={() => setPage(i())}
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
        </div>
      </div>
    </Show>
  );
}
