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
  | {
      ok: false;
      reason: "no_key" | "nova_depleted" | "error";
      message: string;
      userLimit?: boolean;
    };

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
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "لم أفهم السؤال، حاول مجدداً"
  );
}

// ─── تحقق من الاستخدام اليومي لنوفا وزد العداد ──────────────────────────────
async function checkAndIncrementNovaUsage(): Promise<GeminiResult | null> {
  try {
    // انتظر حتى يكتمل الـ session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // انتظر ثانية وحاول مجدداً
      await new Promise(r => setTimeout(r, 1000));
      const { data: { user: retryUser } } = await supabase.auth.getUser();
      if (!retryUser) return { ok: false, reason: "nova_depleted", message: "غير مسجل", userLimit: false };
    }

    const { data, error } = await supabase.rpc("increment_ai_usage", {
      p_user_id: user!.id,
    });

    if (error) return { ok: false, reason: "error", message: "خطأ في الاتصال", userLimit: false };

    if (!data.allowed) {
      return {
        ok: false,
        reason: "nova_depleted",
        message: data.reason,
        userLimit: data.reason === "user_limit",
      };
    }

    return null;
  } catch {
    return { ok: false, reason: "error", message: "حدث خطأ، حاول مجدداً", userLimit: false };
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
    const check = await checkAndIncrementNovaUsage();
    if (check !== null) return check;

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
