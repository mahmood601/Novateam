/**
 * gemini.ts
 * ─────────
 * يدير إرسال الطلبات لـ Gemini مع نظام fallback:
 * 1. مفتاح المستخدم الخاص (أولوية)
 * 2. مفتاح نوفا (إن لم يتجاوز الحد اليومي 1000)
 * 3. رسالة "نفد الرصيد" مع زر التحويل للـ Profile
 */

import { supabase } from "./supabase";

const NOVA_DAILY_LIMIT = 1000;
const GEMINI_MODEL = "gemini-3.5-flash";
const NOVA_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; reason: "no_key" | "nova_depleted" | "error"; message: string };

// ─── استدعاء Gemini API ───────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  systemContext: string,
  history: { role: string; parts: { text: string }[] }[],
  userText: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemContext }] },
        contents: [...history, { role: "user", parts: [{ text: userText }] }],
      }),
    },
  );

  const data = await res.json();

  if (!res.ok) throw new Error(data?.error?.message ?? "Gemini error");

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "لم أفهم السؤال، حاول مجدداً"
  );
}

// ─── تحقق من الاستخدام اليومي لنوفا وزد العداد ──────────────────────────────

async function checkAndIncrementNovaUsage(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("increment_ai_usage");
    if (error) return false;
    // الدالة ترجع العدد بعد الزيادة — إن كان > الحد فقد تجاوزنا
    return data <= NOVA_DAILY_LIMIT;
  } catch {
    return false;
  }
}

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────

export async function sendToGemini(
  systemContext: string,
  history: { role: string; parts: { text: string }[] }[],
  userText: string,
): Promise<GeminiResult> {
  const userKey = localStorage.getItem("gemini_api_key");

  // 1. مفتاح المستخدم الخاص — أولوية قصوى
  if (userKey) {
    try {
      const text = await callGemini(userKey, systemContext, history, userText);
      return { ok: true, text };
    } catch (e: any) {
      return { ok: false, reason: "error", message: e.message };
    }
  }

  // 2. مفتاح نوفا — تحقق من الحد اليومي
  if (NOVA_KEY) {
    const allowed = await checkAndIncrementNovaUsage();

    if (!allowed) {
      return {
        ok: false,
        reason: "nova_depleted",
        message: "نفد رصيد نوفا المجاني لهذا اليوم",
      };
    }

    try {
      const text = await callGemini(NOVA_KEY, systemContext, history, userText);
      return { ok: true, text };
    } catch (e: any) {
      return { ok: false, reason: "error", message: e.message };
    }
  }

  // 3. لا مفتاح متاح
  return {
    ok: false,
    reason: "no_key",
    message: "لا يوجد مفتاح API متاح",
  };
}
