/**
 * SuggestSection.tsx
 * ──────────────────
 * زر صغير بجانب شارة الفصل — يفتح نافذة لاقتراح فصل أصح للسؤال
 */

import { createResource, createSignal, For, Show } from "solid-js";
import { supabase } from "../../services/supabase";
import { getSeasons } from "../../services/local/indexeddb";
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
  } catch (e) {
    console.log(e);

    // الإشعار اختياري — لا نوقف العملية إن فشل
  }
}

export default function SuggestSection(props: {
  questionId: string;
  subject: string;
  subjectName: string;
  currentSeasonId: number | null;
  questionText?: string;
}) {
  const [open, setOpen] = createSignal(false);
  const [selected, setSelected] = createSignal<number | null>(null);
  const [note, setNote] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [done, setDone] = createSignal(false);

  const [seasons] = createResource(() => getSeasons(props.subject));

  const getSeasonName = (id: number | null) =>
    seasons()?.find((s) => s.id === id)?.name ?? "غير محدد";

  const submit = async () => {
    if (!selected()) return;
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      setSubmitting(false);
      return;
    }

    // جلب اسم المستخدم
    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();

    const { error } = await supabase.from("question_suggestions").insert({
      question_id: props.questionId,
      suggested_by: user.id,
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

      // إشعار Telegram
      const msg = `
💡 اقتراح جديد

📚 المادة: ${props.subjectName}
❓ السؤال: ${props.questionText ?? "—"}

🔄 من: ${getSeasonName(props.currentSeasonId)}
✅ إلى: ${getSeasonName(selected())}

${note() ? `💬 <b>ملاحظة:</b> ${note()}` : null}

👤 بواسطة: ${profile?.name ?? "مجهول"}
`;

      await sendTelegramNotification(msg);

      setTimeout(() => setOpen(false), 1500);
    }
  };



  return (
    <>
      {/* زر الاقتراح */}
      <button
        onClick={() => setOpen(true)}
        class="hover:border-main hover:text-main flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-400 transition dark:border-slate-600"
        title="اقترح فصلاً أصح"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        اقتراح
      </button>

      {/* نافذة الاقتراح */}
      <Show when={open()}>
        <div
          class="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        <div
          class="fixed right-0 bottom-0 left-0 z-[401] rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"
          dir="rtl"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="font-bold">اقتراح فصل أصح</h3>
            <button onClick={() => setOpen(false)} class="text-slate-400">
              ✕
            </button>
          </div>

          <Show when={done()}>
            <div class="flex flex-col items-center gap-3 py-6">
              <span class="text-4xl">✅</span>
              <p class="font-bold">شكراً على مساهمتك!</p>
              <p class="text-sm text-slate-400">سيراجع الفريق اقتراحك قريباً</p>
            </div>
          </Show>

          <Show when={!done()}>
            <p class="mb-3 text-xs text-slate-400">
              اختر الفصل/المحاضرة الصحيحة لهذا السؤال:
            </p>

            <div class="mb-4 max-h-52 space-y-2 overflow-y-auto">
              <Show when={seasons.loading}>
                <p class="text-center text-sm text-slate-400">
                  جاري التحميل...
                </p>
              </Show>
              <For each={seasons()}>
                {(season) => (
                  <button
                    onClick={() => setSelected(season.id)}
                    class={`w-full rounded-xl px-4 py-2.5 text-right text-sm transition ${
                      selected() === season.id
                        ? "bg-main text-white"
                        : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                    }`}
                  >
                    {season.name}
                  </button>
                )}
              </For>
            </div>

            <textarea
              value={note()}
              onInput={(e) => setNote(e.currentTarget.value)}
              placeholder="ملاحظة إضافية (اختياري)..."
              class="mb-4 w-full resize-none rounded-xl bg-slate-50 px-3 py-2 text-sm outline-none dark:bg-slate-800"
              rows="2"
              dir="rtl"
            />

            <button
              onClick={submit}
              disabled={!selected() || submitting()}
              class="bg-main w-full rounded-full py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {submitting() ? "جاري الإرسال..." : "إرسال الاقتراح"}
            </button>
          </Show>
        </div>
      </Show>
    </>
  );
}
