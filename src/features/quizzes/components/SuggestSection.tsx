/**
 * SuggestSection.tsx
 * ──────────────────
 * - للمستخدم المسجل: زر "اقتراح" يرسل اقتراحاً للمراجعة
 */

import { createResource, createSignal, For, Show } from "solid-js";
import { supabase } from "../../shared/services/supabase";
import { getSeasons } from "../services/local/indexeddb";
import { useUser } from "../../shared/context/user";
import toast from "solid-toast";
import { ClipboardPen } from "lucide-solid";

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

  const [open, setOpen] = createSignal(false);
  const [selected, setSelected] = createSignal<number | null>(null);
  const [note, setNote] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [done, setDone] = createSignal(false);

  // Loaded only when the panel is opened. This component exists once PER
  // QUESTION, so loading eagerly meant one IndexedDB lookup per question.
  // `.latest` + initialValue: opening the panel must not trigger <Suspense>.
  const [seasons] = createResource(
    () => (open() ? props.subject : null),
    getSeasons,
    { initialValue: [] as Awaited<ReturnType<typeof getSeasons>> },
  );

  const getSeasonName = (id: number | null) =>
    seasons.latest.find((s) => s.id === id)?.name ?? "غير محدد";

  const submit = async () => {
    if (!selected()) return;
    setSubmitting(true);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
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
      ]
        .filter(Boolean)
        .join("\n");

      await sendTelegramNotification(msg);
      setTimeout(() => setOpen(false), 1500);
    }
  };

  return (
    <Show when={user()}>
      {/* الزر */}
      <button
        onClick={() => setOpen(true)}
        class="hover:border-main hover:text-main p-2"
        title="اقترح فصلاً أصح"
      >
        <ClipboardPen size={18} />
      </button>

      {/* النافذة */}
      <Show when={open()}>
        <div
          class="fixed inset-0 z-400 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        <div
          class="fixed right-0 bottom-0 left-0 z-[401] rounded-t-3xl bg-surface-light p-5 shadow-2xl dark:bg-base-dark"
          dir="rtl"
        >
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="font-bold">اقتراح فصل أصح</h3>
            </div>
            <button onClick={() => setOpen(false)} class="text-ink-muted-light">
              ✕
            </button>
          </div>

          <Show when={done()}>
            <div class="flex flex-col items-center gap-3 py-6">
              <span class="text-4xl">✅</span>
              <p class="font-bold">شكراً على مساهمتك!</p>
              <p class="text-sm text-ink-muted-light">سيراجع الفريق اقتراحك قريباً</p>
            </div>
          </Show>

          <Show when={!done()}>
            {/* الفصل الحالي */}
            <Show when={props.currentSeasonId}>
              <p class="mb-2 text-xs text-ink-muted-light">
                الفصل الحالي:{" "}
                <span class="font-bold text-ink-soft-light dark:text-ink-soft-dark">
                  {getSeasonName(props.currentSeasonId)}
                </span>
              </p>
            </Show>

            <p class="mb-3 text-xs text-ink-muted-light">
              اختر الفصل/المحاضرة الصحيحة:
            </p>

            <div class="mb-4 max-h-52 space-y-2 overflow-y-auto">
              <Show when={seasons.loading}>
                <p class="text-center text-sm text-ink-muted-light">
                  جاري التحميل...
                </p>
              </Show>
              <For each={seasons.latest}>
                {(season) => (
                  <button
                    onClick={() => setSelected(season.id)}
                    class={`w-full rounded-xl px-4 py-2.5 text-right text-sm transition ${
                      selected() === season.id
                        ? "bg-main text-white"
                        : "bg-base-light hover:bg-chip-light dark:bg-surface-dark dark:hover:bg-chip-dark"
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
              class="mb-4 w-full resize-none rounded-xl bg-base-light px-3 py-2 text-sm outline-none dark:bg-surface-dark"
              rows="2"
              dir="rtl"
            />

            <button
              onClick={submit}
              disabled={!selected() || submitting()}
              class="bg-main w-full rounded-full py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {submitting() ? "جاري..." : "إرسال الاقتراح"}
            </button>
          </Show>
        </div>
      </Show>
    </Show>
  );
}
