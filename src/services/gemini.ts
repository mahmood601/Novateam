/**
 * gemini.ts
 * ─────────
 * يدير إرسال الطلبات لـ Gemini عبر Supabase Edge Function آمنة
 * ❌ لا يوجد أي API Key هنا — كل المفاتيح على الـ Server
 */

import { supabase } from "./supabase";

export type GeminiResult =
  | { ok: true; text: string }
  | {
      ok: false;
      reason: "no_key" | "nova_depleted" | "error";
      message: string;
      userLimit?: boolean;
    };

// ─── استدعاء الـ Supabase Edge Function (المفتاح مخفي في السيرفر) ───────────

async function callGeminiViaEdge(
  systemContext: string,
  history: { role: string; parts: { text: string }[] }[],
  userText: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: { systemContext, history, userText },
  });

  if (error) {
    console.error("❌ Gemini Edge Error:", error);
    // FunctionsHttpError يحمل الرسالة الأصلية ضمن context.json() غالباً
    const message =
      (error as any)?.context?.error ?? error.message ?? "حدث خطأ غير معروف";
    throw new Error(message);
  }

  if (data?.error) {
    console.error("❌ Gemini Edge Error (payload):", data.error);
    throw new Error(data.error);
  }

  return data.text;
}

// ─── استدعاء مباشر بمفتاح المستخدم الخاص (اختياري) ──────────────────────────

async function callGeminiWithUserKey(
  apiKey: string,
  systemContext: string,
  history: { role: string; parts: { text: string }[] }[],
  userText: string,
): Promise<string> {
  const GEMINI_MODEL = "gemini-2.0-flash-lite";
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
    console.error("❌ Gemini User Key Error:", data);
    throw new Error(data?.error?.message ?? "حدث خطأ من خوادم Gemini");
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "عذراً، لم أتمكن من معالجة الإجابة، حاول مجدداً."
  );
}

// ─── تحقق من الاستخدام اليومي لنوفا وزد العداد ──────────────────────────────

async function checkAndIncrementNovaUsage(): Promise<GeminiResult | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) console.error("❌ Supabase Auth Error:", authError);

    if (!user) {
      await new Promise((r) => setTimeout(r, 1000));
      const {
        data: { user: retryUser },
      } = await supabase.auth.getUser();
      if (!retryUser)
        return {
          ok: false,
          reason: "nova_depleted",
          message: "يجب تسجيل الدخول أولاً",
          userLimit: false,
        };
    }

    const { data, error } = await supabase.rpc("increment_ai_usage", {
      p_user_id: user!.id,
    });

    if (error) {
      console.error("❌ Supabase RPC Error:", error);
      return {
        ok: false,
        reason: "error",
        message: "خطأ في الاتصال بقاعدة البيانات",
        userLimit: false,
      };
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
    return {
      ok: false,
      reason: "error",
      message: "حدث خطأ أثناء التحقق من الرصيد",
      userLimit: false,
    };
  }
}

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────

export async function sendToGemini(
  systemContext: string,
  history: { role: string; parts: { text: string }[] }[],
  userText: string,
): Promise<GeminiResult> {
  // مفتاح المستخدم الخاص — أولوية قصوى (لا يزال آمناً لأنه مفتاحه هو)
  const userKey =
    typeof window !== "undefined"
      ? localStorage.getItem("gemini_api_key")
      : null;

  if (userKey) {
    try {
      const text = await callGeminiWithUserKey(
        userKey,
        systemContext,
        history,
        userText,
      );
      return { ok: true, text };
    } catch (e: any) {
      return { ok: false, reason: "error", message: `خطأ (مفتاحك): ${e.message}` };
    }
  }

  // نوفا Key — عبر Edge Function آمنة
  const check = await checkAndIncrementNovaUsage();
  if (check !== null) return check;

  try {
    const text = await callGeminiViaEdge(systemContext, history, userText);
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, reason: "error", message: `خطأ (النظام): ${e.message}` };
  }
}
