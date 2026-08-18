import { db } from "./db";
import type { Favorite, Question } from "../../../types";

export async function addFavoriteForQuestion(
  question: Question,
  note?: string,
  userAnswer?: number,
): Promise<void> {
  await db.favorites.put({
    $id: question.$id,
    questionId: question.$id,
    subject: question.subject,
    snapshot: {
      $id: question.$id,
      subject: question.subject,
      question: question.question,
      explanation: question.explanation,
      options: question.options,
      correctIndex: question.correctIndex,
      season_id: question.season_id,
      year_id: question.year_id,
      seasonName: question.seasonName,
      yearValue: question.yearValue,
      image_url: question.image_url,
      passage_id: question.passage_id,
      userAnswer,
    },
    note: note ?? "",
    savedAt: Date.now(),
  });
}

export async function removeFavorite(questionId: string): Promise<void> {
  await db.favorites.delete(questionId);
}

export async function updateFavoriteNote(
  questionId: string,
  note: string,
): Promise<void> {
  await db.favorites.update(questionId, { note, savedAt: Date.now() });
}

export async function toggleFavorite(
  question: Question,
  note?: string,
): Promise<boolean> {
  const exists = await isFavorite(question.$id);
  if (exists) {
    await removeFavorite(question.$id);
    return false;
  }
  await addFavoriteForQuestion(question, note);
  return true;
}

export async function isFavorite(questionId: string): Promise<boolean> {
  return !!(await db.favorites.get(questionId));
}

export async function getFavorites(subject?: string): Promise<Favorite[]> {
  if (subject) return db.favorites.where("subject").equals(subject).toArray();
  return db.favorites.toArray();
}

export async function getFavorite(
  questionId: string,
): Promise<Favorite | undefined> {
  return db.favorites.get(questionId);
}
