/**
 * questionUpdates.ts
 * ──────────────────
 * يكتشف التغييرات (إضافة / تعديل / حذف) لمادة معينة ويملأ الـ store
 * بدون تطبيق أي شيء — المستخدم هو من يقرر التحديث
 */

import { supabase } from "./supabase";
import { db, toQuestion } from "./local/indexeddb";
import {
  setUpdateStore,
  updateStore,
  type QuestionChange,
} from "../stores/updateStore";

// ─── Version helpers ───────────────────────────────────────────────────────────

const VERSION_KEY = (subject: string) => `questions_version_${subject}`;

function saveLocalVersion(subject: string, version: number) {
  localStorage.setItem(VERSION_KEY(subject), String(version));
}

export function resetVersion(subject: string) {
  localStorage.removeItem(VERSION_KEY(subject));
}
export function resetAllVersions() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("questions_version_"))
    .forEach((k) => localStorage.removeItem(k));
}

// ─── Main: check one subject ───────────────────────────────────────────────────

/**
 * checkSubjectForUpdates
 * ─────────────────────
 * - يستعلم عن version المادة في Supabase
 * - إن كانت أعلى من المحلية → يجلب التغييرات ويملأ الـ store
 * - لا يُطبّق أي تحديث — فقط يعرض للمستخدم
 */
export async function checkSubjectForUpdates(
  subject: string,
  subjectName: string,
): Promise<void> {
  if (!navigator.onLine) return;

  const lastSync = localStorage.getItem(`sync_${subject}`);
  if (!lastSync) return; // المادة لم تُنزَّل بعد

  try {
    // ─── طلب واحد خفيف فقط ───────────────────────
    const { data, error } = await supabase
      .from("subjects")
      .select("questions_last_modified")
      .eq("id", subject)
      .single();

    if (error || !data) return;

    const remoteModified = data.questions_last_modified;

    // مقارنة مباشرة — لا تحديث إن كان نفس الوقت أو أقدم
    if (!remoteModified || remoteModified <= lastSync) return;

    // ─── في تحديث — اكتشف ماذا تغيّر ─────────────
    const changes = await diffSubject(subject, lastSync);
    if (changes.length === 0) return;

    const alreadyPending = updateStore.pending.some(
      (p) => p.subject === subject,
    );

    if (!alreadyPending) {
      setUpdateStore("pending", (prev) => [
        ...prev,
        { subject, subjectName, remoteModified, changes },
      ]);
    }
  } catch (e) {
    console.error("checkSubjectForUpdates error:", e);
  }
}

async function diffSubject(
  subject: string,
  lastSync: string,
): Promise<QuestionChange[]> {
  // جلب المعدّلة/المضافة بعد lastSync مباشرة — بدون طلب ثانٍ
  const { data: changed, error } = await supabase
    .from("questions")
    .select("id, question")
    .eq("subject_id", subject)
    .gt("updated_at", lastSync);

  if (error || !changed) return [];

  // تحديد added vs modified
  const localIds = new Set(
    (await db.questions.where("subject").equals(subject).toArray()).map(
      (q) => q.$id,
    ),
  );

  const changes: QuestionChange[] = changed.map((row: any) => ({
    id: row.id,
    type: localIds.has(row.id) ? "modified" : "added",
    question: truncate(row.question),
    subject,
  }));

  // كشف المحذوفات عبر المقارنة العددية
  const { data: remoteIds } = await supabase
    .from("questions")
    .select("id")
    .eq("subject_id", subject);

  const remoteIdSet = new Set(remoteIds?.map((r: any) => r.id) ?? []);

  const localQuestions = await db.questions
    .where("subject")
    .equals(subject)
    .toArray();

  const deleted = localQuestions.filter((q) => !remoteIdSet.has(q.$id));

  for (const q of deleted) {
    changes.push({
      id: q.$id,
      type: "deleted",
      question: truncate(q.question),
      subject,
    });
  }

  return changes;
}

// ─── Apply: طبّق التحديث لمادة واحدة ─────────────────────────────────────────

export async function applyUpdate(
  subject: string,
  onDone?: () => void,
): Promise<boolean> {
  const pending = updateStore.pending.find((p) => p.subject === subject);
  if (!pending) return false;

  try {
    const SELECT = `
      *,
      season:sections!season_id(id,name,value),
      year:sections!year_id(id,name,value)
    `;

    const lastSync = localStorage.getItem(`sync_${subject}`);

    if (lastSync) {
      // Incremental: جلب المعدّلة فقط
      const { data: updated, error } = await supabase
        .from("questions")
        .select(SELECT)
        .eq("subject_id", subject)
        .gt("updated_at", lastSync);

      if (!error && updated && updated.length > 0) {
        const mapped = updated.map((row: any) => toQuestion(row, subject));
        await db.questions.bulkPut(mapped);
      }

      // احذف المحذوفات
      const deletedIds = pending.changes
        .filter((c) => c.type === "deleted")
        .map((c) => c.id);
      if (deletedIds.length > 0) {
        await db.questions.bulkDelete(deletedIds);
      }
    } else {
      // Full sync لأول مرة
      const { data, error } = await supabase
        .from("questions")
        .select(SELECT)
        .eq("subject_id", subject);

      if (error || !data) return false;

      const questions = data.map((row: any) => toQuestion(row, subject));
      await db.questions.where("subject").equals(subject).delete();
      if (questions.length > 0) {
        await db.questions.bulkPut(questions);
      }
    }

    // حفّظ الإصدار والـ sync time
    localStorage.setItem(
      `sync_${subject}`,
      `${pending.remoteModified ?? new Date().toISOString()}`,
    );

    // أزل من الـ store
    setUpdateStore("pending", (prev) =>
      prev.filter((p) => p.subject !== subject),
    );

    onDone?.();
    return true;
  } catch (e) {
    console.error("applyUpdate error:", e);
    return false;
  }
}

// ─── Apply All ─────────────────────────────────────────────────────────────────

export async function applyAllUpdates(): Promise<void> {
  setUpdateStore("applying", true);
  const subjects = updateStore.pending.map((p) => p.subject);
  for (const subject of subjects) {
    await applyUpdate(subject);
  }
  setUpdateStore("applying", false);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function truncate(text: string, max = 80): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}
