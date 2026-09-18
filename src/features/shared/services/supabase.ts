import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Offline-aware fetch wrapper ──────────────────────────────────────────────
//
// المشكلة: كل دالة sync في indexeddb.ts كانت تكرر نفس النمط:
//   if (!navigator.onLine) return fallback;
//   try { ...supabase call... } catch { return fallback; }
//
// الحل: دالة واحدة تتولى هذا النمط. الـ caller يعرّف فقط:
//   1. ماذا يجلب من Supabase  (fetcher)
//   2. ماذا يرجع لو offline أو فشل  (fallback)
//
// ملاحظة: هذا الـ wrapper مخصص لطلبات القراءة (sync) فقط.
// طلبات الكتابة (insert/update/delete) لا تمر هنا — هي بطبيعتها
// تتطلب اتصالاً ويجب أن تفشل صراحةً لو offline.
//
// الاستخدام:
//   const data = await fetchIfOnline(
//     () => supabase.from("subjects").select("..."),
//     []   // fallback لو offline
//   );

export async function fetchIfOnline<T>(
  fetcher: () => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> {
  if (!navigator.onLine) return fallback;
  try {
    const { data, error } = await fetcher();
    if (error || data === null) return fallback;
    return data;
  } catch {
    return fallback;
  }
}