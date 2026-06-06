/**
 * GeminiPanel.tsx
 * ───────────────
 * نافذة محادثة مع Gemini مع نظام fallback (مفتاح المستخدم → مفتاح نوفا → رسالة نفاد)
 */

import { createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { sendToGemini } from "../services/gemini";
import Markdown from "./Markdown";

type Message = {
  role: "user" | "model";
  text: string;
  depleted?: boolean;
};

export default function GeminiPanel(props: {
  open: boolean;
  onClose: () => void;
  question: any;
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [depleted, setDepleted] = createSignal(false);

  const hasUserKey = () => !!localStorage.getItem("gemini_api_key");

  const systemContext = () =>
    `أنت Nova AI مساعد طبي تعليمي متخصص. المستخدم يدرس هذا السؤال:

السؤال: ${props.question?.question ?? ""}
الخيارات: ${props.question?.options?.join(" | ") ?? ""}
الإجابة الصحيحة: الخيار رقم ${(props.question?.correctIndex?.[0] ?? 0) + 1}
الشرح: ${props.question?.explanation ?? "لا يوجد شرح"}

أجب بالعربية بشكل مختصر وواضح.`.trim();

  const send = async () => {
    const text = input().trim();
    if (!text || loading() || depleted()) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    const history = messages().map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const result = await sendToGemini(systemContext(), history, text);

    if (result.ok) {
      setMessages((prev) => [...prev, { role: "model", text: result.text }]);
    } else if (result.reason === "nova_depleted") {
      // تحقق من السبب
      const msg = result.userLimit
        ? "وصلت لحدك اليومي (10 طلب) — أضف مفتاحك الخاص للاستمرار"
        : "نفد رصيد نوفا اليومي — أضف مفتاحك الخاص للاستمرار";

      setMessages((prev) => [
        ...prev,
        { role: "model", text: msg, depleted: true },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "حدث خطأ، حاول مجدداً" },
      ]);
    }

    setLoading(false);
  };

  return (
    <Show when={props.open}>
      {/* Overlay */}
      <div
        class="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />

      {/* Panel */}
      <div
        class="fixed right-0 bottom-0 left-0 z-[301] flex flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900"
        style={{ "max-height": "75dvh" }}
        dir="rtl"
      >
        {/* Header */}
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div class="flex items-center gap-2">
            <span class="text-xl">✨</span>
            <h3 class="font-bold">مساعد Nova AI</h3>
            <Show when={hasUserKey()}>
              <span class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-600 dark:bg-green-900/30 dark:text-green-400">
                مفتاحك الخاص
              </span>
            </Show>
          </div>
          <button
            onClick={props.onClose}
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Chat */}
        <div class="flex-1 space-y-3 overflow-y-auto p-4">
          <Show when={messages().length === 0}>
            <div class="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800">
              اسأل عن هذا السؤال أو اطلب شرحاً للإجابة
            </div>
          </Show>

          <For each={messages()}>
            {(msg) => (
              <div
                class={`flex flex-col gap-2 ${msg.role === "user" ? "items-start" : "items-end"}`}
              >
                <div
                  class={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-main rounded-br-sm text-white"
                      : msg.depleted
                        ? "rounded-bl-sm bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        : "rounded-bl-sm bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <Markdown text={msg.text} />
                </div>

                {/* زر التحويل عند نفاد الرصيد */}
                <Show when={msg.depleted}>
                  <div class="flex max-w-[85%] flex-col items-end gap-2">
                    <p class="text-center text-xs text-slate-400">
                      احصل على مفتاحك المجاني من Google AI Studio واستمر بدون
                      قيود
                    </p>
                    <button
                      onClick={() => {
                        props.onClose();
                        navigate("/settings");
                      }}
                      class="bg-main rounded-full px-4 py-2 text-sm text-white"
                    >
                      أضف مفتاحك الخاص ←
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>

          <Show when={loading()}>
            <div class="flex justify-end">
              <div class="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <span class="gemini-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          </Show>
        </div>

        {/* Input */}
        <div class="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-700">
          <Show
            when={!depleted()}
            fallback={
              <p class="flex-1 py-2 text-center text-xs text-slate-400">
                أضف مفتاحك للاستمرار
              </p>
            }
          >
            <button
              onClick={send}
              disabled={loading() || !input().trim()}
              class="bg-main flex-shrink-0 rounded-full px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              إرسال
            </button>
            <input
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب سؤالك..."
              class="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm outline-none dark:bg-slate-800"
              dir="rtl"
            />
          </Show>
        </div>
      </div>
    </Show>
  );
}
