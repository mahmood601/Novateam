import { createSignal, Show } from "solid-js";
import toast from "solid-toast";
import { supabase } from "../../../services/supabase";
import { insertPassage } from "../../../services/documentsManipulation";
import type { Section } from "../../../services/documentsManipulation";
import { SectionSelectors } from "./SectionSelectors";

export function SmartImporter(props: {
  subjectId: string;
  sections: Section[];
  onComplete: () => void;
}) {
  const [rawText, setRawText] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [seasonId, setSeasonId] = createSignal<number | null>(null);
  const [yearId, setYearId] = createSignal<number | null>(null);

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

    const questions = questionBlocks.map((block) => {
      const blockLines = block.text.split(/\n(?=[=+!])/g);
      const question = blockLines[0].trim();
      const optionLines = blockLines.filter(
        (l) => l.trim().startsWith("=") || l.trim().startsWith("+"),
      );
      const correctLine = optionLines.findIndex((l) => l.startsWith("+"));
      const correct_index = correctLine >= 0 ? correctLine : 0;
      const options = optionLines.map((l) => l.trim().replace(/^[=+]/, "").trim());
      const explLine = blockLines.find((l) => l.trim().startsWith("!"));
      const explanation = explLine ? explLine.replace("!", "").trim() : null;
      const passage_id = block.passageText
        ? passageCache.get(block.passageText) ?? null
        : null;

      return {
        subject_id: props.subjectId,
        season_id: seasonId(),
        year_id: yearId(),
        question,
        explanation,
        options,
        correct_index,
        passage_id,
      };
    });

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
