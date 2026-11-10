import { createMemo, createSignal, For, Show, onMount } from "solid-js";
import toast from "solid-toast";
import { supabase } from "../shared/services/supabase";
import { useUser } from "../shared/context/user";
import { getSelectedGeminiModel, DEFAULT_GEMINI_MODEL } from "../shared/services/gemini";

type Subject = { id: string; name: string };
type Section = { id: number; name: string; value: string | number; type: string };
type Question = { id: number; question: string; options: string[] | null; season_id: number | null; year_id: number | null };
type Assignment = { q: Question; section_id: number | null; confidence: number; reason: string; confirmed: boolean };

const BATCH_SIZE = 20;
const GEMINI_KEY = "gemini_api_key";
const MODEL_KEY = "gemini_model";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع";
}

async function fetchModels(key: string): Promise<string[]> {
  const models: string[] = [];
  let pageToken = "";
  do {
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { "x-goog-api-key": key } });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "تعذر جلب نماذج Gemini");
    for (const model of data.models ?? []) {
      const id = String(model.name ?? "").replace(/^models\//, "");
      if (id && model.supportedGenerationMethods?.includes("generateContent")) models.push(id);
    }
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return models.sort();
}

async function classifyBatch(key: string, model: string, questions: Question[], sections: Section[], context: string) {
  const allowed = sections.map(s => `value:${s.value} | ${s.name}`).join("\n");
  const input = questions.map((q, index) =>
    `[${index}] id:${q.id}\nالسؤال: ${q.question}\nالخيارات: ${(q.options ?? []).filter(Boolean).join(" / ")}`
  ).join("\n\n");
  const prompt = `أنت مساعد متخصص في تصنيف أسئلة الامتحانات.
المحاضرات المتاحة (استخدم value كما هي حرفياً):
${allowed}
سياق المادة:
${context || "لا يوجد سياق إضافي"}
صنّف كل سؤال إلى section_value من القائمة فقط. استخدم null إن كان خارج نطاق المحاضرات.
أعد JSON array فقط بالشكل: [{"index":0,"section_value":"3","confidence":0.9,"reason":"سبب مختصر"}]
الأسئلة:
${input}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: "application/json" },
      }),
    },
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "حدث خطأ من Gemini");
  const raw = payload.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text ?? "").join("") ?? "";
  let parsed: any;
  try { parsed = JSON.parse(raw); }
  catch {
    const last = raw.lastIndexOf("}");
    if (raw.trim().startsWith("[") && last >= 0) {
      try { parsed = JSON.parse(raw.slice(0, last + 1) + "]"); }
      catch { throw new Error("رد Gemini غير مكتمل. قلّل حجم الدفعة وأعد المحاولة."); }
    } else throw new Error("لم يُرجع Gemini بيانات JSON صالحة.");
  }
  if (!Array.isArray(parsed)) throw new Error("تنسيق رد Gemini غير صحيح.");
  const byValue = new Map(sections.map(s => [String(s.value), s.id]));
  return parsed.flatMap((item: any) => {
    const index = Number(item.index);
    if (!Number.isInteger(index) || index < 0 || index >= questions.length) return [];
    const rawValue = item.section_value == null ? null : String(item.section_value);
    return [{
      index,
      section_id: rawValue === null ? null : (byValue.get(rawValue) ?? null),
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
      reason: String(item.reason ?? "").slice(0, 120),
    }];
  });
}

export default function ClassifierPage() {
  const { user } = useUser();
  const [step, setStep] = createSignal<"subjects" | "years" | "context" | "review" | "done">("subjects");
  const [subjects, setSubjects] = createSignal<Subject[]>([]);
  const [subjectId, setSubjectId] = createSignal("");
  const [sections, setSections] = createSignal<Section[]>([]);
  const [unclassifiedId, setUnclassifiedId] = createSignal<number | null>(null);
  const [years, setYears] = createSignal<Section[]>([]);
  const [yearIds, setYearIds] = createSignal<number[]>([]);
  const [questions, setQuestions] = createSignal<Question[]>([]);
  const [context, setContext] = createSignal("");
  const [assignments, setAssignments] = createSignal<Assignment[]>([]);
  const [geminiKey] = createSignal(localStorage.getItem(GEMINI_KEY)?.trim() ?? "");
  const [model, setModel] = createSignal(localStorage.getItem(MODEL_KEY) || getSelectedGeminiModel() || DEFAULT_GEMINI_MODEL);
  const [models, setModels] = createSignal<string[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [progress, setProgress] = createSignal({ done: 0, total: 0 });
  const [error, setError] = createSignal("");
  const [confirmSave, setConfirmSave] = createSignal(false);
  const [savedCount, setSavedCount] = createSignal(0);

  const selectedSubject = createMemo(() => subjects().find(s => s.id === subjectId()));
  const confirmedCount = createMemo(() => assignments().filter(a => a.confirmed && a.section_id !== null).length);
  const nullCount = createMemo(() => assignments().filter(a => a.section_id === null).length);

  const loadSubjects = async () => {
    setBusy(true); setError("");
    try {
      const { data, error } = await supabase.from("subjects").select("id,name").order("name");
      if (error) throw error;
      setSubjects(data ?? []);
      if (!data?.length) setError("لا توجد مواد متاحة.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const loadSubject = async () => {
    if (!subjectId()) return setError("اختر مادة أولاً");
    setBusy(true); setError("");
    try {
      const [{ data: sec, error: secError }, { data: yrs, error: yearError }] = await Promise.all([
        supabase.from("sections").select("id,name,value,type").eq("subject_id", subjectId()).eq("type", "season").order("value"),
        supabase.from("sections").select("id,name,value,type").eq("subject_id", subjectId()).eq("type", "year").order("value"),
      ]);
      if (secError) throw secError;
      if (yearError) throw yearError;
      const allSections = (sec ?? []) as Section[];
      if (!allSections.length) throw new Error("لا توجد محاضرات لهذه المادة.");
      const unclassified = allSections.find(s => String(s.value).toLowerCase() === "nan" || s.name === "غير مصنف" || s.name === "nan");
      setUnclassifiedId(unclassified?.id ?? null);
      setSections(allSections.filter(s => s.id !== unclassified?.id));
      setYears((yrs ?? []) as Section[]);
      if (yrs?.length) {
        setYearIds([]);
        setStep("years");
      } else {
        await loadQuestions(null);
        setStep("context");
      }
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const loadQuestions = async (selectedYears: number[] | null) => {
    let query = supabase.from("questions")
      .select("id,question,options,season_id,year_id")
      .eq("subject_id", subjectId())
      .order("created_at")
      .limit(5000);
    if (selectedYears?.length) query = query.in("year_id", selectedYears);
    const { data, error } = await query;
    if (error) throw error;
    setQuestions((data ?? []) as Question[]);
    if (!data?.length) throw new Error("لا توجد أسئلة ضمن الاختيار المحدد.");
  };

  const startClassification = async () => {
    const key = geminiKey();
    if (!key) return setError("أضف مفتاح Gemini في صفحة الإعدادات أولاً.");
    if (!model().trim()) return setError("اختر نموذج Gemini.");
    if (!questions().length) return setError("لا توجد أسئلة للتصنيف.");
    setBusy(true); setError(""); setProgress({ done: 0, total: questions().length });
    const result: Assignment[] = [];
    try {
      for (let offset = 0; offset < questions().length; offset += BATCH_SIZE) {
        const batch = questions().slice(offset, offset + BATCH_SIZE);
        let response = await classifyBatch(key, model(), batch, sections(), context());
        const covered = new Set(response.map(r => r.index));
        const missing = batch.map((_, i) => i).filter(i => !covered.has(i));
        if (missing.length) {
          try {
            const retry = await classifyBatch(key, model(), missing.map(i => batch[i]), sections(), context());
            const mapped = retry.map(r => ({ ...r, index: missing[r.index] }));
            response = [...response, ...mapped];
          } catch {
            // Keep every question visible for manual review even if Gemini truncates/fails on retry.
          }
        }
        const byIndex = new Map(response.map(r => [r.index, r]));
        batch.forEach((q, i) => {
          const r = byIndex.get(i);
          result.push({ q, section_id: r?.section_id ?? null, confidence: r?.confidence ?? 0, reason: r?.reason ?? "لم يصل تصنيف", confirmed: false });
        });
        setProgress({ done: Math.min(offset + batch.length, questions().length), total: questions().length });
      }
      setAssignments(result);
      setStep("review");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const updateAssignment = (index: number, field: "section_id" | "confirmed", value: number | null | boolean) => {
    setAssignments(prev => prev.map((a, i) => {
      if (i !== index) return a;
      if (field === "section_id") return { ...a, section_id: value as number | null, confirmed: false };
      return { ...a, confirmed: value as boolean };
    }));
  };

  const saveAssignments = async () => {
    setConfirmSave(false); setBusy(true); setError("");
    let count = 0;
    const toSave = assignments().filter(a => a.confirmed && a.section_id !== null && a.section_id !== unclassifiedId());
    try {
      // Small bounded concurrency; each row remains independently attributable on failure.
      for (let i = 0; i < toSave.length; i += 10) {
        const batch = toSave.slice(i, i + 10);
        const outcomes = await Promise.all(batch.map(async a => {
          const { error } = await supabase.from("questions").update({ season_id: a.section_id }).eq("id", a.q.id);
          return { id: a.q.id, error };
        }));
        const failed = outcomes.filter(x => x.error);
        count += outcomes.length - failed.length;
        if (failed.length) throw new Error(`تعذّر تحديث ${failed.length} سؤال (أول معرّف: ${failed[0].id}). تم حفظ ${count} سؤال قبل التوقف.`);
      }
      setSavedCount(count);
      setStep("done");
      toast.success(`تم حفظ ${count} سؤال`);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  onMount(() => { void loadSubjects(); });
  // User identity is deliberately consumed so this route shares the existing authenticated session.
  return (
    <main class="min-h-dvh bg-darker-light-1 px-4 py-8 dark:bg-main-dark" dir="rtl">
      <div class="mx-auto max-w-5xl">
        <header class="mb-6">
          <h1 class="text-2xl font-bold">🧠 مصنّف الأسئلة</h1>
          <p class="mt-1 text-sm text-ink-muted-light dark:text-ink-muted-dark">تصنيف الأسئلة حسب المحاضرات باستخدام Gemini</p>
          <p class="mt-1 text-xs text-ink-muted-light">الحساب: {user()?.email}</p>
        </header>
        <Show when={error()}>
          <div role="alert" class="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error()}</div>
        </Show>
        <section class="rounded-2xl bg-surface-light p-5 shadow-sm dark:bg-surface-dark">
          <Show when={step() === "subjects"}>
            <h2 class="mb-4 text-lg font-bold">اختر المادة</h2>
            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <For each={subjects()}>{s =>
                <button class={`rounded-xl border p-3 text-right ${subjectId() === s.id ? "border-main bg-main/10" : "border-line-light dark:border-line-dark"}`} onClick={() => setSubjectId(s.id)}>{s.name}</button>
              }</For>
            </div>
            <button class="bg-main mt-5 rounded-full px-5 py-2 text-white disabled:opacity-50" disabled={busy() || !subjectId()} onClick={loadSubject}>{busy() ? "جارٍ التحميل..." : "تحميل المادة ←"}</button>
          </Show>

          <Show when={step() === "years"}>
            <h2 class="mb-2 text-lg font-bold">اختر الدورات المطلوب تصنيفها</h2>
            <p class="mb-4 text-sm text-amber-700">حدّد الدورات غير المصنّفة فقط؛ لن تتغير الدورات الأخرى.</p>
            <div class="space-y-2">
              <For each={years()}>{y =>
                <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-line-light p-3 dark:border-line-dark">
                  <input type="checkbox" checked={yearIds().includes(y.id)} onChange={e => setYearIds(prev => e.currentTarget.checked ? [...prev, y.id] : prev.filter(id => id !== y.id))}/>
                  {y.name}
                </label>
              }</For>
            </div>
            <div class="mt-5 flex gap-2">
              <button class="rounded-full border px-4 py-2" onClick={() => setStep("subjects")}>رجوع</button>
              <button class="bg-main rounded-full px-5 py-2 text-white disabled:opacity-50" disabled={busy() || !yearIds().length} onClick={async () => { setBusy(true); setError(""); try { await loadQuestions(yearIds()); setStep("context"); } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); } }}>{busy() ? "جارٍ التحميل..." : `متابعة (${yearIds().length})`}</button>
            </div>
          </Show>

          <Show when={step() === "context"}>
            <h2 class="mb-2 text-lg font-bold">سياق المادة</h2>
            <p class="mb-3 text-sm text-ink-muted-light">الصق ملخص المحاضرات من NotebookLM لتحسين دقة التصنيف.</p>
            <p class="mb-3 text-xs">المادة: {selectedSubject()?.name} · {sections().length} محاضرة · {questions().length} سؤال</p>
            <textarea class="min-h-48 w-full rounded-xl border border-line-light bg-transparent p-3 dark:border-line-dark" value={context()} onInput={e => setContext(e.currentTarget.value)} placeholder="الصق خلاصة NotebookLM هنا..."/>
            <div class="mt-4 flex flex-wrap gap-2">
              <button class="rounded-full border px-4 py-2" onClick={() => setStep(years().length ? "years" : "subjects")}>رجوع</button>
              <button class="bg-main rounded-full px-5 py-2 text-white disabled:opacity-50" disabled={busy()} onClick={startClassification}>{busy() ? `جارٍ التصنيف ${progress().done}/${progress().total}` : `بدء التصنيف (${questions().length})`}</button>
            </div>
            <Show when={busy()}>
              <progress class="mt-4 w-full" max={progress().total} value={progress().done}/>
            </Show>
          </Show>

          <Show when={step() === "review"}>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-lg font-bold">مراجعة التصنيف ({assignments().length})</h2>
              <div class="text-sm">مؤكد: {confirmedCount()} · غير محدد: {nullCount()}</div>
            </div>
            <div class="mb-4 flex flex-wrap gap-2">
              <button class="rounded-full border px-3 py-2 text-sm" onClick={() => setAssignments(prev => prev.map(a => ({...a, confirmed: a.section_id !== null && a.section_id !== unclassifiedId()})))}>تأكيد كل التصنيفات</button>
              <button class="rounded-full border px-3 py-2 text-sm" onClick={() => setStep("context")}>إعادة التصنيف</button>
            </div>
            <div class="max-h-[60vh] space-y-3 overflow-y-auto">
              <For each={assignments()}>{(a, index) =>
                <article class="rounded-xl border border-line-light p-3 dark:border-line-dark">
                  <p class="mb-3 text-sm leading-7">{a.q.question}</p>
                  <div class="flex flex-wrap items-center gap-3">
                    <select class="min-w-56 flex-1 rounded-lg border border-line-light bg-transparent p-2 text-sm dark:border-line-dark" value={a.section_id ?? ""} onChange={e => updateAssignment(index(), "section_id", e.currentTarget.value ? Number(e.currentTarget.value) : null)}>
                      <option value="">— غير محدد —</option>
                      <For each={sections()}>{s => <option value={s.id}>{s.value}. {s.name}</option>}</For>
                      <Show when={unclassifiedId() !== null}><option value={unclassifiedId()!}>غير مصنف (خارج المقرر)</option></Show>
                    </select>
                    <span class="text-xs tabular-nums">{Math.round(a.confidence * 100)}% · {a.reason}</span>
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.confirmed} disabled={a.section_id === null || a.section_id === unclassifiedId()} onChange={e => updateAssignment(index(), "confirmed", e.currentTarget.checked)}/> تأكيد</label>
                  </div>
                </article>
              }</For>
            </div>
            <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span class="text-sm">سيتم حفظ {confirmedCount()} سؤال فقط.</span>
              <button class="rounded-full bg-red-600 px-5 py-2 text-white disabled:opacity-50" disabled={busy() || confirmedCount() === 0} onClick={() => setConfirmSave(true)}>حفظ المؤكد</button>
            </div>
          </Show>

          <Show when={step() === "done"}>
            <div class="py-8 text-center">
              <div class="mb-3 text-4xl">✅</div>
              <h2 class="text-xl font-bold">تم الحفظ بنجاح</h2>
              <p class="mt-2 text-sm">تم تحديث {savedCount()} سؤال.</p>
              <button class="bg-main mt-5 rounded-full px-5 py-2 text-white" onClick={() => { setStep("subjects"); setSubjectId(""); setAssignments([]); setQuestions([]); setContext(""); setYearIds([]); }}>تصنيف مادة أخرى</button>
            </div>
          </Show>
        </section>
      </div>

      <Show when={confirmSave()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="dialog" aria-modal="true" class="w-full max-w-md rounded-2xl bg-surface-light p-6 dark:bg-surface-dark">
            <h2 class="text-lg font-bold">تأكيد الحفظ</h2>
            <p class="my-4 text-sm leading-7">سيتم تحديث {confirmedCount()} سؤال في قاعدة البيانات. {nullCount()} سؤال غير محدد لن يُحفظ. هذا الإجراء يغيّر بيانات الأسئلة مباشرة.</p>
            <div class="flex gap-2">
              <button class="flex-1 rounded-full border px-4 py-2" onClick={() => setConfirmSave(false)}>إلغاء</button>
              <button class="flex-1 rounded-full bg-red-600 px-4 py-2 text-white disabled:opacity-50" disabled={busy()} onClick={saveAssignments}>تأكيد الحفظ</button>
            </div>
          </div>
        </div>
      </Show>
    </main>
  );
}
