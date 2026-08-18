import { db } from "./db";
import type { Answer, Question } from "../../../types";

export async function addAnswersToProgress(answers: Answer[]) {
  const now = Date.now();
  const existing = await db.answers
    .where("$id")
    .anyOf(answers.map((a) => a.$id))
    .toArray();
  const existingMap = new Map(existing.map((e) => [e.$id, e]));

  const enriched = answers.map((a) => ({
    ...a,
    answeredAt: now,
    attempts: (existingMap.get(a.$id)?.attempts ?? 0) + 1,
  }));

  await db.answers.bulkPut(enriched);
}

export async function getSubjectStats(subject: string) {
  const answers = await db.answers.where("subject").equals(subject).toArray();
  const total = answers.length;
  const correct = answers.filter((a) => a.answer).length;
  const wrong = total - correct;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, wrong, rate };
}

export async function getWeakQuestions(
  subject: string,
  limit = 20,
): Promise<Question[]> {
  const wrongAnswers = (await db.answers.where("subject").equals(subject).toArray())
    .filter((a) => !a.answer)
    .sort((a, b) => (b.attempts ?? 0) - (a.attempts ?? 0))
    .slice(0, limit);

  if (wrongAnswers.length === 0) return [];

  const ids = wrongAnswers.map((a) => a.$id);
  const questions = await db.questions.where("$id").anyOf(ids).toArray();
  const attemptsMap = new Map(wrongAnswers.map((a) => [a.$id, a.attempts ?? 1]));

  return questions.sort(
    (a, b) => (attemptsMap.get(b.$id) ?? 0) - (attemptsMap.get(a.$id) ?? 0),
  );
}

export async function getWeeklyStats(subject: string) {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;

  const recent = await db.answers
    .where("subject")
    .equals(subject)
    .and((a) => (a.answeredAt ?? 0) > now - week)
    .toArray();

  const byDay: Record<string, { correct: number; total: number }> = {};
  for (const a of recent) {
    const day = new Date(a.answeredAt).toLocaleDateString("ar-SA", {
      weekday: "short",
    });
    if (!byDay[day]) byDay[day] = { correct: 0, total: 0 };
    byDay[day].total++;
    if (a.answer) byDay[day].correct++;
  }

  return byDay;
}

export async function getAnswers(subject: string): Promise<Answer[]> {
  return db.answers.where("subject").equals(subject).toArray();
}

export async function deleteAnswersWithFilter(
  subject: string,
  sectionType: "season_id" | "year_id",
  sectionId: number,
): Promise<void> {
  await db.answers
    .where(`[subject+${sectionType}]`)
    .equals([subject, sectionId])
    .delete();
}

export async function clearAnswers(): Promise<boolean> {
  try {
    await db.answers.clear();
    return true;
  } catch {
    return false;
  }
}
