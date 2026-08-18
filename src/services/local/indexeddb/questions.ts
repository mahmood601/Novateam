import { supabase } from "../../supabase";
import yearsFallback from "../years";
import { db, getLastSync, resetSync, saveLastSync } from "./db";
import type { Answer, Question } from "../../../types";

export function toQuestion(row: any, subject: string): Question {
  return {
    ...row,
    $id: row.id,
    subject,
    subject_id: row.subject_id,
    season_id: row.season_id,
    year_id: row.year_id,
    seasonName: row.season?.name,
    seasonValue: row.season?.value,
    yearName: row.year?.name,
    yearValue: row.year?.value,
    question: row.question,
    explanation: row.explanation,
    options: row.options ?? [],
    correctIndex: row.correct_index,
    user_id: row.created_by,
    image_url: row.image_url ?? null,
    passage_id: row.passage_id ?? null,
  };
}

export async function getQuestions(subject: string): Promise<Question[]> {
  return db.questions.where("subject").equals(subject).toArray().then((questions) => {
    return questions.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
  });
}

export async function getQuestionsOrAnswersWithFilter(
  subject: string,
  type: "questions" | "answers",
  sectionType: "season_id" | "year_id",
  sectionId: number,
): Promise<Question[] | Answer[]> {
  const table = db[type] as any;
  const records = await table
    .where(`[subject+${sectionType}]`)
    .equals([subject, sectionId])
    .toArray();

  return records.sort((a: any, b: any) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

export async function addQuestionsToFirstDB(
  subject: string,
  wait = false,
  forceFullSync = false,
): Promise<boolean> {
  if (forceFullSync) {
    resetSync(subject);
  }
  if (wait) {
    return await syncQuestionsInBackground(subject);
  }
  syncQuestionsInBackground(subject);
  return true;
}

export async function syncQuestionsInBackground(subject: string): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const lastSync = getLastSync(subject);
    const SELECT = `
      *,
      season:sections!season_id(id,name,value),
      year:sections!year_id(id,name,value)
    `;

    if (lastSync) {
      const { data: updated, error: updErr } = await supabase
        .from("questions")
        .select(SELECT)
        .eq("subject_id", subject)
        .gt("updated_at", lastSync)
        .order("updated_at", { ascending: true });

      if (!updErr && updated && updated.length > 0) {
        const mapped = updated.map((row: any) => toQuestion(row, subject));
        await db.questions.bulkPut(mapped);
      }

      const { data: remoteIds, error: idsErr } = await supabase
        .from("questions")
        .select("id")
        .eq("subject_id", subject);

      if (!idsErr && remoteIds) {
        const remoteSet = new Set(remoteIds.map((r: any) => r.id));
        const localQuestions = await db.questions.where("subject").equals(subject).toArray();
        const toDelete = localQuestions
          .filter((q) => !remoteSet.has(q.$id))
          .map((q) => q.$id);

        const deleteRatio =
          localQuestions.length > 0 ? toDelete.length / localQuestions.length : 0;

        if (toDelete.length > 0 && deleteRatio > 0.5) {
          console.warn(
            `⚠️ تم تجاهل حذف ${toDelete.length}/${localQuestions.length} سؤال دفعة واحدة — يبدو كفشل مؤقت بالمزامنة وليس حذفاً فعلياً، تم حماية البيانات المحلية`,
          );
        } else if (toDelete.length > 0) {
          await db.questions.bulkDelete(toDelete);
          console.log(
            `🗑️ حُذف ${toDelete.length} سؤال من IndexedDB (غير موجود في Supabase)`,
          );
        }
      }

      saveLastSync(subject);
      return true;
    }

    const { data, error } = await supabase
      .from("questions")
      .select(SELECT)
      .eq("subject_id", subject)
      .order("updated_at", { ascending: true });

    if (error || !data) return false;

    const questions = data.map((row: any) => toQuestion(row, subject));
    await db.questions.where("subject").equals(subject).delete();
    if (questions.length > 0) {
      await db.questions.bulkPut(questions);
    }

    saveLastSync(subject);
    return true;
  } catch {
    return false;
  }
}

export async function clearQuestions(): Promise<boolean> {
  try {
    await db.questions.clear();
    return true;
  } catch {
    return false;
  }
}
