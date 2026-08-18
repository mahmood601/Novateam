/**
 * SuggestSection.tsx
 * ──────────────────
 * - للطالب: زر "اقتراح" يرسل اقتراحاً للمراجعة
 * - للأدمن: زر "تعديل" يعدّل الفصل مباشرة بدون مراجعة
 */

import { createResource, createSignal, For, Show } from "solid-js";
import { supabase } from "../../services/supabase";
import { getSeasons } from "../../services/local/indexeddb";
import { useUser } from "../../context/user";
import toast from "solid-toast";

const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_TOKEN ?? "";
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "";

async function sendTelegramNotification(text: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch {}
}

export default function SuggestSection(props: {
  questionId: string;
  subject: string;
  currentSeasonId: number | null;
  questionText?: string;
}) {
  const { user } = useUser();
  const isAdmin = () => user()?.role === "admin";

  const [open, setOpen] = createSignal(false);
  const [selected, setSelected] = createSignal<number | null>(null);
  const [note, setNote] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [done, setDone] = createSignal(false);

  const [seasons] = createResource(() => getSeasons(props.subject));

  const getSeasonName = (id: number | null) =>
    seasons()?.find((s) => s.id === id)?.name ?? "غير محدد";

  // ─── أدمن: تعديل مباشر ───────────────────────────────────────────
  const submitAdmin = async () => {
    if (!selected()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("questions")
      .update({ season_id: selected() })
      .eq("id", props.questionId);

    setSubmitting(false);

    if (error) {
      toast.error("فشل التعديل");
    } else {
      toast.success(`تم تغيير الفصل إلى: ${getSeasonName(selected())} ✓`);
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setSelected(null); }, 1500);
    }
  };

  // ─── طالب: اقتراح للمراجعة ───────────────────────────────────────
  const submitStudent = async () => {
    if (!selected()) return;
    setSubmitting(true);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error("يجب تسجيل الدخول أولاً");
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", authUser.id)
      .single();

    const { error } = await supabase.from("question_suggestions").insert({
      question_id: props.questionId,
      suggested_by: authUser.id,
      current_season_id: props.currentSeasonId,
      suggested_season_id: selected(),
      subject_id: props.subject,
      note: note() || null,
    });

    setSubmitting(false);

    if (error) {
      toast.error("فشل الإرسال، حاول مجدداً");
    } else {
      setDone(true);
      toast.success("تم إرسال اقتراحك ✓");

      const msg = [
        `💡 <b>اقتراح تصنيف جديد</b>`,
        ``,
        `📚 <b>المادة:</b> ${props.subject}`,
        ``,
        `❓ <b>السؤال:</b>`,
        `${props.questionText ?? "—"}`,
        ``,
        `🔄 <b>من:</b> ${getSeasonName(props.currentSeasonId)}`,
        `✅ <b>إلى:</b> ${getSeasonName(selected())}`,
        ``,
        note() ? `💬 <b>ملاحظة:</b> ${note()}` : null,
        ``,
        `👤 <b>بواسطة:</b> ${profile?.name ?? "مجهول"}`,
      ].filter(Boolean).join("\n");

      await sendTelegramNotification(msg);
      setTimeout(() => setOpen(false), 1500);
    }
  };

  const submit = () => isAdmin() ? submitAdmin() : submitStudent();

  return (
    <>
      {/* الزر */}
      <button
        onClick={() => setOpen(true)}
        class={`flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] transition ${
          isAdmin()
            ? "border-amber-300 text-amber-500 hover:border-amber-500"
            : "border-slate-300 dark:border-slate-600 text-slate-400 hover:border-main hover:text-main"
        }`}
        title={isAdmin() ? "تعديل الفصل مباشرة" : "اقترح فصلاً أصح"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        {isAdmin() ? "تعديل" : "اقتراح"}
      </button>

      {/* النافذة */}
      <Show when={open()}>
        <div
          class="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        <div
          class="fixed bottom-0 left-0 right-0 z-[401] rounded-t-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl"
          dir="rtl"
        >
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="font-bold">
                {isAdmin() ? "⚡ تعديل الفصل مباشرة" : "اقتراح فصل أصح"}
              </h3>
              <Show when={isAdmin()}>
                <span class="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-600 font-bold">
                  أدمن
                </span>
              </Show>
            </div>
            <button onClick={() => setOpen(false)} class="text-slate-400">✕</button>
          </div>

          <Show when={done()}>
            <div class="flex flex-col items-center gap-3 py-6">
              <span class="text-4xl">{isAdmin() ? "⚡" : "✅"}</span>
              <p class="font-bold">
                {isAdmin() ? "تم التعديل مباشرة!" : "شكراً على مساهمتك!"}
              </p>
              <Show when={!isAdmin()}>
                <p class="text-sm text-slate-400">سيراجع الفريق اقتراحك قريباً</p>
              </Show>
            </div>
          </Show>

          <Show when={!done()}>
            {/* الفصل الحالي */}
            <Show when={props.currentSeasonId}>
              <p class="text-xs text-slate-400 mb-2">
                الفصل الحالي: <span class="font-bold text-slate-600 dark:text-slate-300">{getSeasonName(props.currentSeasonId)}</span>
              </p>
            </Show>

            <p class="text-xs text-slate-400 mb-3">
              {isAdmin() ? "اختر الفصل الصحيح:" : "اختر الفصل/المحاضرة الصحيحة:"}
            </p>

            <div class="max-h-52 overflow-y-auto space-y-2 mb-4">
              <Show when={seasons.loading}>
                <p class="text-center text-sm text-slate-400">جاري التحميل...</p>
              </Show>
              <For each={seasons()}>
                {(season) => (
                  <button
                    onClick={() => setSelected(season.id)}
                    class={`w-full rounded-xl px-4 py-2.5 text-sm text-right transition ${
                      selected() === season.id
                        ? "bg-main text-white"
                        : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {season.name}
                  </button>
                )}
              </For>
            </div>

            {/* ملاحظة للطلاب فقط */}
            <Show when={!isAdmin()}>
              <textarea
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
                placeholder="ملاحظة إضافية (اختياري)..."
                class="w-full rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none mb-4 resize-none"
                rows="2"
                dir="rtl"
              />
            </Show>

            <button
              onClick={submit}
              disabled={!selected() || submitting()}
              class={`w-full rounded-full py-3 text-sm font-bold text-white disabled:opacity-40 ${
                isAdmin() ? "bg-amber-500" : "bg-main"
              }`}
            >
              {submitting()
                ? "جاري..."
                : isAdmin()
                  ? "⚡ تطبيق مباشرة"
                  : "إرسال الاقتراح"}
            </button>
          </Show>
        </div>
      </Show>
    </>
  );
}