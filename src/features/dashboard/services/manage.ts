import { supabase } from "../../shared/services/supabase";
import { db } from "../../quizzes/services/local/indexeddb";

// All writes here are enforced server-side by RLS (super-admin only).
// The UI gate is only a convenience.

export type SubjectRow = {
  id: string;
  name: string;
  year_key: string;
  semester: "first" | "second" | null;
};

export type SectionRow = {
  id: number;
  subject_id: string;
  type: "season" | "year";
  value: string;
  name: string;
};

export type Result = { ok: true } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });

// Subject id is used as a URL slug and as a foreign key in 5 tables
export const SUBJECT_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function listSubjects(yearKey: string): Promise<SubjectRow[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, year_key, semester")
    .eq("year_key", yearKey)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as SubjectRow[];
}

export async function getSubject(id: string): Promise<SubjectRow | null> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, year_key, semester")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SubjectRow) ?? null;
}

export async function listSections(subjectId: string): Promise<SectionRow[]> {
  const { data, error } = await supabase
    .from("sections")
    .select("id, subject_id, type, value, name")
    .eq("subject_id", subjectId)
    .order("type")
    .order("value");
  if (error) throw new Error(error.message);
  return (data ?? []) as SectionRow[];
}

// ─── Usage counting (used to block deletes) ───────────────────────────────────

async function count(
  table: "questions" | "passages" | "formatted_lectures" | "sections",
  apply: (q: any) => any,
): Promise<number> {
  const q = supabase.from(table).select("*", { count: "exact", head: true });
  const { count: n, error } = await apply(q);
  if (error) throw new Error(error.message);
  return n ?? 0;
}

export async function subjectUsage(subjectId: string) {
  const [questions, passages, lectures] = await Promise.all([
    count("questions", (q) => q.eq("subject_id", subjectId)),
    count("passages", (q) => q.eq("subject_id", subjectId)),
    count("formatted_lectures", (q) => q.eq("subject_id", subjectId)),
  ]);
  return { questions, passages, lectures };
}

export async function sectionUsage(sectionId: number) {
  const [questions, passages, lectures] = await Promise.all([
    count("questions", (q) =>
      q.or(`season_id.eq.${sectionId},year_id.eq.${sectionId}`),
    ),
    count("passages", (q) =>
      q.or(`season_id.eq.${sectionId},year_id.eq.${sectionId}`),
    ),
    count("formatted_lectures", (q) => q.eq("season_id", sectionId)),
  ]);
  return { questions, passages, lectures };
}

function usageMessage(
  what: string,
  u: { questions: number; passages: number; lectures: number },
): string | null {
  const parts: string[] = [];
  if (u.questions) parts.push(`${u.questions} سؤال`);
  if (u.passages) parts.push(`${u.passages} نص`);
  if (u.lectures) parts.push(`${u.lectures} محاضرة`);
  return parts.length
    ? `لا يمكن حذف ${what} لأنه يحتوي: ${parts.join("، ")}`
    : null;
}

// ─── Subject writes ───────────────────────────────────────────────────────────

export async function createSubject(s: SubjectRow): Promise<Result> {
  if (!SUBJECT_ID_RE.test(s.id)) {
    return fail("المعرّف يجب أن يكون أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط");
  }
  if (!s.name.trim()) return fail("الاسم مطلوب");

  const { error } = await supabase.from("subjects").insert({
    id: s.id,
    name: s.name.trim(),
    year_key: s.year_key,
    semester: s.semester,
  });
  if (error) {
    return fail(error.code === "23505" ? "المعرّف مستخدم مسبقاً" : error.message);
  }
  await db.subjects.put({ id: s.id, name: s.name.trim(), year_keys: [s.year_key] });
  return { ok: true };
}

// id is immutable: it is a foreign key in several tables
export async function updateSubject(
  id: string,
  patch: Pick<SubjectRow, "name" | "year_key" | "semester">,
): Promise<Result> {
  if (!patch.name.trim()) return fail("الاسم مطلوب");

  const { error } = await supabase
    .from("subjects")
    .update({
      name: patch.name.trim(),
      year_key: patch.year_key,
      semester: patch.semester,
    })
    .eq("id", id);
  if (error) return fail(error.message);

  await db.subjects.put({ id, name: patch.name.trim(), year_keys: [patch.year_key] });
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<Result> {
  try {
    const blocked = usageMessage("المادة", await subjectUsage(id));
    if (blocked) return fail(blocked);

    // Empty subject: its (empty) sections must go first because of the FK
    const { error: secErr } = await supabase
      .from("sections")
      .delete()
      .eq("subject_id", id);
    if (secErr) return fail(secErr.message);

    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return fail(error.message);
  } catch (e: any) {
    return fail(e.message ?? "خطأ غير معروف");
  }

  await db.subjects.delete(id);
  await db.sections.where("subject_id").equals(id).delete();
  return { ok: true };
}

// ─── Section writes ───────────────────────────────────────────────────────────

export async function createSection(
  s: Omit<SectionRow, "id">,
): Promise<Result> {
  if (!s.name.trim() || !s.value.trim()) return fail("الاسم والقيمة مطلوبان");
  if (!/^\d+$/.test(s.value.trim())) return fail("القيمة يجب أن تكون رقماً");

  const { error } = await supabase.from("sections").insert({
    subject_id: s.subject_id,
    type: s.type,
    value: s.value.trim(),
    name: s.name.trim(),
  });
  if (error) return fail(error.message);
  await db.sections.where("subject_id").equals(s.subject_id).delete();
  return { ok: true };
}

export async function updateSection(
  id: number,
  patch: Pick<SectionRow, "type" | "value" | "name">,
): Promise<Result> {
  if (!patch.name.trim() || !patch.value.trim()) return fail("الاسم والقيمة مطلوبان");
  if (!/^\d+$/.test(patch.value.trim())) return fail("القيمة يجب أن تكون رقماً");

  const { error } = await supabase
    .from("sections")
    .update({
      type: patch.type,
      value: patch.value.trim(),
      name: patch.name.trim(),
    })
    .eq("id", id);
  if (error) return fail(error.message);
  await db.sections.delete(id);
  return { ok: true };
}

export async function deleteSection(section: SectionRow): Promise<Result> {
  try {
    const blocked = usageMessage("القسم", await sectionUsage(section.id));
    if (blocked) return fail(blocked);

    const { error } = await supabase
      .from("sections")
      .delete()
      .eq("id", section.id);
    if (error) return fail(error.message);
  } catch (e: any) {
    return fail(e.message ?? "خطأ غير معروف");
  }
  await db.sections.delete(section.id);
  return { ok: true };
}
