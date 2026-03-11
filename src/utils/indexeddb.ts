import { supabase } from "../services/supabase";
import { Dexie, Table } from "dexie";

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

// ─── Dexie DB ─────────────────────────────────────────────────────────────────

class AppDB extends Dexie {
  questions!: Table<Question, "$id">;
  answers!: Table<Answer, "$id">;
  favorites!: Table<Favorite, "$id">;
  sections!: Table<CachedSection, "id">;

  constructor() {
    super("db");
    this.version(1).stores({
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

// ─── Sections: Offline-First ──────────────────────────────────────────────────

/**
 * 1. اقرأ من IndexedDB فوراً (offline-first)
 * 2. زامن Supabase في الخلفية وحدّث الكاش
 * 3. أعد الـ callback بالبيانات الجديدة إن وُجدت
 */
export async function syncAndGetSections(
  subjectId: string,
  onUpdate?: (sections: CachedSection[]) => void,
): Promise<CachedSection[]> {
  // ── اقرأ من الكاش أولاً (فوري) ──────────────────────────────────────────
  const cached = await db.sections
    .where("subject_id")
    .equals(subjectId)
    .toArray();

  // زامن في الخلفية
  syncSectionsInBackground(subjectId, onUpdate);

  // إذا كان الكاش فارغاً انتظر الشبكة مرة واحدة
  if (cached.length === 0) {
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
    // offline — الكاش كافٍ
  }
}

// ─── Questions: Offline-First ─────────────────────────────────────────────────

/**
 * 1. اقرأ من IndexedDB فوراً
 * 2. زامن Supabase في الخلفية (فقط المستجد منذ آخر sync)
 */
export async function addQuestionsToFirstDB(subject: string): Promise<void> {
  // ── زامن في الخلفية دائماً ───────────────────────────────────────────────
  syncQuestionsInBackground(subject);
}

/** اقرأ الأسئلة من الكاش مباشرة — offline-first */
export async function getQuestions(subject: string): Promise<Question[]> {
  return db.questions.where("subject").equals(subject).toArray();
}

async function syncQuestionsInBackground(subject: string) {
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
      // تدريجي: فقط الجديد والمعدّل
      query = query.gt("updated_at", lastSync);
    }

    const { data, error } = await query;
    if (error || !data) return;

    if (data.length === 0) {
      console.log(`[sync] No changes for ${subject}`);
      return;
    }

    const questions = data.map((row: any) => toQuestion(row, subject));
    await db.questions.bulkPut(questions);
    saveLastSync(subject);
    console.log(
      `[sync] ${lastSync ? "Incremental" : "Full"}: ${questions.length} questions for ${subject}`,
    );
  } catch {
    // offline — لا شيء
  }
}

/** أجبر إعادة المزامنة الكاملة (مثلاً بعد حذف سؤال) */
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
