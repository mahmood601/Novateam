import { supabase } from "./supabase";

// ─── اسم من أضاف المحتوى (سؤال / محاضرة) ─────────────────────────────────
// كاش بالذاكرة + دمج الطلبات المتزامنة في طلب واحد، حتى لو ظهر 30 سؤالاً
// لنفس المضيف ما نرسل إلا استعلاماً واحداً. الفشل (offline أو RLS) = null
// والواجهة تكتفي بعرض التاريخ بدون اسم.
const names = new Map<string, string | null>();
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let waiters: Array<() => void> = [];

function flush() {
  timer = undefined;
  const ids = [...pending];
  const done = waiters;
  pending.clear();
  waiters = [];

  // RPC آمنة (SECURITY DEFINER): ترجع الاسم فقط، ولمن فعّل "إظهار اسمي".
  // جدول users نفسه مغلق على الطلاب بسياسات RLS.
  Promise.resolve(supabase.rpc("get_author_names", { ids }))
    .then(({ data, error }) => {
      if (error) throw error;
      const map = new Map<string, string>(
        (data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]),
      );
      for (const id of ids) names.set(id, map.get(id) ?? null);
    })
    .catch(() => {
      for (const id of ids) names.set(id, null);
    })
    .finally(() => done.forEach((fn) => fn()));
}

/** يُستدعى بعد تغيير خيار إظهار الاسم كي لا يبقى الاسم القديم بالذاكرة. */
export const clearAuthorNameCache = () => names.clear();

export function getAuthorName(userId?: string | null): Promise<string | null> {
  if (!userId) return Promise.resolve(null);
  if (names.has(userId)) return Promise.resolve(names.get(userId)!);
  if (!navigator.onLine) return Promise.resolve(null);

  return new Promise((resolve) => {
    pending.add(userId);
    waiters.push(() => resolve(names.get(userId) ?? null));
    timer ??= setTimeout(flush, 50);
  });
}

// ─── بيانات نسب المحاضرة (المنشئ / آخر معدّل / آخر تعديل) ───────────────
export type LectureCredit = {
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

const lectureCredits = new Map<string, LectureCredit>();

export async function getLectureCredit(
  subjectId: string,
  seasonId: number,
): Promise<LectureCredit | null> {
  const key = `${subjectId}:${seasonId}`;
  if (lectureCredits.has(key)) return lectureCredits.get(key)!;
  if (!navigator.onLine) return null;

  try {
    const { data, error } = await supabase
      .from("formatted_lectures")
      .select("created_by, updated_by, updated_at")
      .eq("subject_id", subjectId)
      .eq("season_id", seasonId)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    const credit: LectureCredit = {
      created_by: data.created_by ?? null,
      updated_by: data.updated_by ?? null,
      updated_at: data.updated_at ?? null,
    };
    lectureCredits.set(key, credit);
    return credit;
  } catch {
    return null;
  }
}

/** يفرّغ كاش المحاضرة (يُستدعى لو تغيّر updated_at في الخلفية). */
export const invalidateLectureCredit = (subjectId: string, seasonId: number) =>
  lectureCredits.delete(`${subjectId}:${seasonId}`);
