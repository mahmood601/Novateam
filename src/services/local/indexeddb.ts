import { supabase } from "../supabase";
import { Dexie, Table } from "dexie";
// fallback ثابت عند غياب الشبكة في أول تشغيل
import subjectsFallback from "../../pages/subjects";
import yearsFallback from "./years";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Question = {
  $id: string;
  subject: string;
  subject_id: string;
  season_id: number | null;
  year_id: number | null;
  seasonName?: string;
  seasonValue?: string;
  yearName?: string;
  yearValue?: string;
  question: string;
  explanation: string | null;
  options: string[];
  correctIndex: number;
  user_id: string | null;
  [key: string]: any;
};

export type Answer = {
  $id: string;
  subject: string;
  season_id: number | null;
  year_id: number | null;
  [key: string]: any;
};

export type Favorite = {
  $id: string;
  questionId: string;
  subject: string;
  snapshot?: Partial<Question>;
  note?: string;
  savedAt: number;
};

export type CachedSection = {
  id: number;
  subject_id: string;
  type: "season" | "year";
  value: string;
  name: string;
};

export type CachedSubject = {
  id: string;       // subject_id مثل "anatomy-2"
  name: string;
  year_keys: string[]; // ["second", "third", ...]
};

export type CachedYear = {
  id: string;       // "second" | "third" | ...
  name: string;
  subjects: string[];
};

// ─── Dexie DB ─────────────────────────────────────────────────────────────────

class AppDB extends Dexie {
  questions!: Table<Question, "$id">;
  answers!: Table<Answer, "$id">;
  favorites!: Table<Favorite, "$id">;
  sections!: Table<CachedSection, "id">;
  subjects!: Table<CachedSubject, "id">;
  years!: Table<CachedYear, "id">;

  constructor() {
    super("db");
    this.version(2).stores({
      questions: `
        $id,
        subject,
        season_id,
        year_id,
        [subject+season_id],
        [subject+year_id]
      `,
      answers: `
        $id,
        subject,
        season_id,
        year_id,
        [subject+season_id],
        [subject+year_id]
      `,
      favorites: `
        $id,
        questionId,
        subject,
        [subject+questionId]
      `,
      sections: `
        id,
        subject_id,
        type,
        [subject_id+type]
      `,
      subjects: `id`,
      years: `id`,
    });
  }
}

const db = new AppDB();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYNC_KEY = (subject: string) => `sync_${subject}`;

function saveLastSync(subject: string) {
  localStorage.setItem(SYNC_KEY(subject), new Date().toISOString());
}

function getLastSync(subject: string): string | null {
  return localStorage.getItem(SYNC_KEY(subject));
}

function toQuestion(row: any, subject: string): Question {
  return {
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
  };
}

// ─── Subjects: Offline-First ──────────────────────────────────────────────────

/**
 * اقرأ المواد من IDB أولاً.
 * إذا كانت فارغة: حاول Supabase، وإلا استخدم subjects.ts كـ fallback.
 * زامن في الخلفية دائماً.
 */
export async function getSubjectsOfflineFirst(): Promise<CachedSubject[]> {
  const cached = await db.subjects.toArray();

  // زامن في الخلفية دائماً
  syncSubjectsInBackground();

  if (cached.length > 0) return cached;

  // أول تشغيل بدون اتصال → fallback من subjects.ts
  return buildSubjectsFallback();
}

function buildSubjectsFallback(): CachedSubject[] {
  return Object.entries(subjectsFallback).map(([id, data]) => ({
    id,
    name: data.name,
    year_keys: [], // لا نعرف السنوات من subjects.ts مباشرة
  }));
}

async function syncSubjectsInBackground() {
  if (!navigator.onLine) return;
  try {
    // إذا كان عندك جدول subjects في Supabase
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name");

    if (!error && data && data.length > 0) {
      await db.subjects.bulkPut(data as CachedSubject[]);
      return;
    }
  } catch {
    // offline أو الجدول غير موجود
    console.log("error");
    
  }

  // Fallback: بناء من subjects.ts وتخزين في IDB
  const fallback = buildSubjectsFallback();
  await db.subjects.bulkPut(fallback);
}

// ─── Years: Offline-First ─────────────────────────────────────────────────────

/**
 * اقرأ السنوات من IDB أولاً.
 * إذا كانت فارغة: حاول Supabase، وإلا استخدم years.ts كـ fallback.
 */
export async function getYearsOfflineFirst(): Promise<CachedYear[]> {
  const cached = await db.years.toArray();

  syncYearsInBackground();

  if (cached.length > 0) return cached;

  return buildYearsFallback();
}

function buildYearsFallback(): CachedYear[] {
  return Object.entries(yearsFallback).map(([id, data]) => ({
    id,
    name: data.name,
    subjects: data.subjects,
  }));
}

async function syncYearsInBackground() {
  if (!navigator.onLine) return;
  try {
    // إذا كان عندك جدول years في Supabase
    const { data, error } = await supabase
      .from("years")
      .select("id, name, subjects");

    if (!error && data && data.length > 0) {
      await db.years.bulkPut(data as CachedYear[]);
      return;
    }
  } catch {
    // offline أو الجدول غير موجود
  }

  // Fallback: بناء من years.ts وتخزين في IDB
  const fallback = buildYearsFallback();
  await db.years.bulkPut(fallback);
}

// ─── Sections: Offline-First ──────────────────────────────────────────────────

export async function syncAndGetSections(
  subjectId: string,
  onUpdate?: (sections: CachedSection[]) => void,
): Promise<CachedSection[]> {
  const cached = await db.sections
    .where("subject_id")
    .equals(subjectId)
    .toArray();

  // زامن في الخلفية
  syncSectionsInBackground(subjectId, onUpdate);

  if (cached.length === 0) {
    // أول تشغيل — انتظر الشبكة مرة واحدة
    return new Promise((resolve) => {
      syncSectionsInBackground(subjectId, (fresh) => {
        onUpdate?.(fresh);
        resolve(fresh);
      });
    });
  }

  return cached;
}

async function syncSectionsInBackground(
  subjectId: string,
  onUpdate?: (sections: CachedSection[]) => void,
) {
  if (!navigator.onLine) return;
  try {
    const { data, error } = await supabase
      .from("sections")
      .select("id, subject_id, type, value, name")
      .eq("subject_id", subjectId)
      .order("type")
      .order("value");
      

    if (error || !data) return;

    await db.sections.bulkPut(data);
    onUpdate?.(data as CachedSection[]);
  } catch {
    // offline
  }
}

// ─── Questions: Offline-First ─────────────────────────────────────────────────

export async function addQuestionsToFirstDB(subject: string): Promise<void> {  
  syncQuestionsInBackground(subject);
}

export async function getQuestions(subject: string): Promise<Question[]> {
  return db.questions.where("subject").equals(subject).toArray();
}

async function syncQuestionsInBackground(subject: string) {
  if (!navigator.onLine) return;
  try {
    const lastSync = getLastSync(subject);
    const SELECT = `
      *,
      season:sections!season_id(id,name,value),
      year:sections!year_id(id,name,value)
    `;

    let query = supabase
      .from("questions")
      .select(SELECT)
      .eq("subject_id", subject)
      .order("updated_at");

    if (lastSync) {
      query = query.gt("updated_at", lastSync);
    }

    const { data, error } = await query;
    console.log(data);
    
    if (error || !data) return;
    if (data.length === 0) return;

    const questions = data.map((row: any) => toQuestion(row, subject));
    await db.questions.bulkPut(questions);
    saveLastSync(subject);
  } catch {
    // offline
  }
}

export function resetSync(subject: string) {
  localStorage.removeItem(SYNC_KEY(subject));
}

// ─── Answers ──────────────────────────────────────────────────────────────────

export async function addAnswersToProgress(answers: Answer[]) {
  await db.answers.bulkPut(answers);
}

// ─── Favorites ────────────────────────────────────────────────────────────────

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

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getQuestionsOrAnswersWithFilter(
  subject: string,
  type: "questions" | "answers",
  sectionType: "season_id" | "year_id",
  sectionId: number,
): Promise<Question[] | Answer[]> {
  return db[type]
    .where(`[subject+${sectionType}]`)
    .equals([subject, sectionId])
    .toArray();
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