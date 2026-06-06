/**
 * gemini.ts
 * ─────────
 * يدير إرسال الطلبات لـ Gemini مع نظام fallback
 */

import { supabase } from "./supabase";

const NOVA_DAILY_LIMIT = 1000;
// 1. تصحيح اسم النموذج إلى الإصدار الفعلي المتاح
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

  if (!res.ok) {
    // 2. طباعة الخطأ الفعلي القادم من جوجل في الكونسول لمعرفة السبب الجذري
    console.error("❌ Gemini API Error Details:", data); 
    throw new Error(data?.error?.message ?? "حدث خطأ غير معروف من خوادم Gemini");
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "عذراً، لم أتمكن من معالجة الإجابة، حاول مجدداً."
  );
}

// ─── تحقق من الاستخدام اليومي لنوفا وزد العداد ──────────────────────────────
async function checkAndIncrementNovaUsage(): Promise<GeminiResult | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("❌ Supabase Auth Error:", authError);
    }

    if (!user) {
      // محاولة الإعادة بعد ثانية
      await new Promise(r => setTimeout(r, 1000));
      const { data: { user: retryUser } } = await supabase.auth.getUser();
      if (!retryUser) return { ok: false, reason: "nova_depleted", message: "يجب تسجيل الدخول أولاً", userLimit: false };
    }

    const { data, error } = await supabase.rpc("increment_ai_usage", {
      p_user_id: user!.id,
    });

    if (error) {
      console.error("❌ Supabase RPC Error:", error);
      return { ok: false, reason: "error", message: "خطأ في الاتصال بقاعدة البيانات", userLimit: false };
    }

    if (!data.allowed) {
      return {
        ok: false,
        reason: "nova_depleted",
        message: data.reason,
        userLimit: data.reason === "user_limit",
      };
    }

    return null;
  } catch (err) {
    console.error("❌ Unknown Usage Check Error:", err);
    return { ok: false, reason: "error", message: "حدث خطأ أثناء التحقق من الرصيد", userLimit: false };
  }
}

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────

export async function sendToGemini(
  systemContext: string,
  history: { role: string; parts: { text: string }[] }[],
  userText: string,
): Promise<GeminiResult> {
  
  // 3. التحقق من بيئة التشغيل لتجنب انهيار SSR (Server-Side Rendering)
  const userKey = typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") : null;

  // 1. مفتاح المستخدم الخاص — أولوية قصوى
  if (userKey) {
    try {
      const text = await callGemini(userKey, systemContext, history, userText);
      return { ok: true, text };
    } catch (e: any) {
      console.error("❌ User Key Failure:", e);
      return { ok: false, reason: "error", message: `خطأ (مفتاحك): ${e.message}` };
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
      console.error("❌ Nova Key Failure:", e);
      return { ok: false, reason: "error", message: `خطأ (النظام): ${e.message}` };
    }
  }

  // 3. لا مفتاح متاح
  return {
    ok: false,
    reason: "no_key",
    message: "لا يوجد مفتاح API متاح حالياً",
  };
}