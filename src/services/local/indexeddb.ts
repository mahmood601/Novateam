import { supabase } from "../supabase";
import { Dexie, Table } from "dexie";
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
  image_url?: string | null; // ← جاهز للصور مستقبلاً
  passage_id?: string | null; // ← مقالة مرتبطة (اختياري)
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
  id: string;
  name: string;
  year_keys: string[];
};

export type CachedYear = {
  id: string;
  name: string;
  subjects: string[];
};

export type Passage = {
  $id: string;
  subject_id: string;
  season_id: number | null;
  year_id: number | null;
  content: string;
  image_url?: string | null;
};

// ─── Dexie DB ─────────────────────────────────────────────────────────────────

class AppDB extends Dexie {
  questions!: Table<Question, string>;
  answers!: Table<Answer, string>;
  favorites!: Table<Favorite, string>;
  sections!: Table<CachedSection, number>;
  subjects!: Table<CachedSubject, string>;
  years!: Table<CachedYear, string>;
  passages!: Table<Passage, string>;

  constructor() {
    super("db");

    // ← الإصدار القديم يبقى دون تغيير لضمان migration صحيح
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
      subjects: `id, *year_keys`,
      years: `id`,
    });

    // v3: أضفنا *subjects على years لتمكين index lookup بدل full scan
    this.version(3).stores({
      years: `id, *subjects`,
    });

    // v4: جدول passages + passage_id على questions
    this.version(4).stores({
      questions: `
        $id,
        subject,
        season_id,
        year_id,
        passage_id,
        [subject+season_id],
        [subject+year_id]
      `,
      passages: `
        $id,
        subject_id,
        season_id,
        year_id,
        [subject_id+season_id],
        [subject_id+year_id]
      `,
    });
  }
}

// ✅ instance واحدة فقط — يُصدَّر ليُستخدَم في باقي الملفات مباشرة
const db = new AppDB();
export { db };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYNC_KEY = (subject: string) => `sync_${subject}`;

function saveLastSync(subject: string) {
  localStorage.setItem(SYNC_KEY(subject), new Date().toISOString());
}

function getLastSync(subject: string): string | null {
  return localStorage.getItem(SYNC_KEY(subject));
}

// ✅ spread-safe: أي حقل جديد في Supabase يُحفظ تلقائياً (image_url مثلاً)
function toQuestion(row: any, subject: string): Question {
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
    passage_id: row.passage_id ?? null, // ← صريح لضمان الحفظ في Dexie
  };
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

// ✅ إصلاح: تستخدم IDB index مباشرة بدل جلب الكل + تنتظر الشبكة عند الحاجة
export async function getSubjectsOfflineFirst(
  yearKey: string,
): Promise<CachedSubject[]> {
  const cached = await db.subjects.where("year_keys").equals(yearKey).toArray();

  if (cached.length > 0) {
    // زامن في الخلفية بدون انتظار
    syncSubjectsInBackground(yearKey);
    return cached;
  }

  // أول تشغيل — انتظر الشبكة مرة واحدة
  return new Promise((resolve) => {
    syncSubjectsInBackground(yearKey, resolve);
  });
}

export async function getSubjectsByYear(
  yearKey: string,
): Promise<CachedSubject[]> {
  if (!yearKey) return [];

  return db.subjects.where("year_keys").anyOf(yearKey).toArray();
}

// ✅ إصلاح: أضيف onUpdate callback لإبلاغ الـ UI عند التحديث
async function syncSubjectsInBackground(
  year_key: string,
  onUpdate?: (subjects: CachedSubject[]) => void,
) {
  if (!navigator.onLine) {
    onUpdate?.([]);
    return;
  }
  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, year_key")
      .eq("year_key", year_key);

    if (!error && data && data.length > 0) {
      const subjects = (data as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        year_keys: Array.isArray(row.year_key)
          ? row.year_key
          : row.year_key
            ? [row.year_key]
            : [],
      }));

      await db.subjects.bulkPut(subjects as CachedSubject[]);
      onUpdate?.(subjects as CachedSubject[]);
      return;
    }
  } catch {
    // offline
  }
  onUpdate?.([]);
}

// ─── Years ────────────────────────────────────────────────────────────────────

// subjectId اختياري — لو مُرِّر يستخدم الـ index مباشرة بدل جلب الكل
export async function getYearsOfflineFirst(
  subjectId?: string,
): Promise<CachedYear[]> {
  if (subjectId) {
    // O(log n) بفضل الـ multi-entry index بدل full scan
    const cached = await db.years.where("subjects").equals(subjectId).toArray();
    if (cached.length > 0) return cached;
  } else {
    const cached = await db.years.toArray();
    if (cached.length > 0) return cached;
  }
  return buildYearsFallback();
}

function buildYearsFallback(): CachedYear[] {
  return Object.entries(yearsFallback).map(([id, data]) => ({
    id,
    name: data.name,
    subjects: data.subjects,
  }));
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function syncAndGetSections(
  subjectId: string,
  onUpdate?: (sections: CachedSection[]) => void,
): Promise<CachedSection[]> {
  const cached = await db.sections
    .where("subject_id")
    .equals(subjectId)
    .toArray();

  if (cached.length === 0) {
    // ✅ إصلاح: استدعاء واحد فقط (كان يُستدعى مرتين سابقاً)
    return new Promise((resolve) => {
      syncSectionsInBackground(subjectId, (fresh) => {
        onUpdate?.(fresh);
        resolve(fresh);
      });
    });
  }

  // زامن في الخلفية فقط عند وجود كاش
  syncSectionsInBackground(subjectId, onUpdate);
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

// ─── Questions ────────────────────────────────────────────────────────────────

// ✅ إصلاح: ترجع boolean لإعلام الـ caller بنجاح أو فشل المزامنة
export async function addQuestionsToFirstDB(
  subject: string,
  wait = false,
): Promise<boolean> {
  if (wait) {
    return await syncQuestionsInBackground(subject);
  }
  syncQuestionsInBackground(subject);
  return true;
}

export async function getQuestions(subject: string): Promise<Question[]> {
  return db.questions.where("subject").equals(subject).toArray();
}

// ✅ إصلاح: ترجع boolean + حد أولي للطلب الأول
async function syncQuestionsInBackground(subject: string): Promise<boolean> {
  if (!navigator.onLine) return false;
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
      .select("*")
      .eq("subject_id", subject)
      .order("updated_at")
      .limit(lastSync ? 500 : 200); // ✅ حد مؤقت للأول تشغيل

    if (lastSync) {
      // query = query.gt("updated_at", lastSync);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) return false;

    const questions = data.map((row: any) => toQuestion(row, subject));
    await db.questions.bulkPut(questions);
    saveLastSync(subject);

    return true;
  } catch {
    return false;
  }
}

export function resetSync(subject: string) {
  localStorage.removeItem(SYNC_KEY(subject));
}

// ─── Answers ──────────────────────────────────────────────────────────────────

export async function addAnswersToProgress(answers: Answer[]) {
  await db.answers.bulkPut(answers);
}

// ✅ إصلاح: كل دوال clear تُرجع boolean مع error handling
export async function clearAnswers(): Promise<boolean> {
  try {
    await db.answers.clear();
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

export async function clearSubjects(): Promise<boolean> {
  try {
    await db.subjects.clear();
    return true;
  } catch {
    return false;
  }
}

export async function clearSections(): Promise<boolean> {
  try {
    await db.sections.clear();
    return true;
  } catch {
    return false;
  }
}

export async function clearAllSyncKeys(): Promise<boolean> {
  try {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith("sync_"),
    );
    keys.forEach((key) => localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

export async function clearDBAfterChangeYear() {
  try {
    await clearAnswers();
    await clearQuestions();
    await clearSections();
    await clearSubjects();
    await clearAllSyncKeys();

    return true;
  } catch {
    return false;
  }
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
      image_url: question.image_url,
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

export async function getSeasons(subject: string): Promise<CachedSection[]> {
  return db.sections
    .where(`[subject_id+type]`)
    .equals([subject, "season"])
    .toArray();
}

export async function getSeasonName(
  subject: string,
  seasonId: number | null,
): Promise<string | null> {
  if (!seasonId) return null;
  const sections = await getSeasons(subject);
  return sections.find((s) => s.id === seasonId)?.name ?? null;
}

export async function getYearName(
  subject: string,
  yearId: number | null,
): Promise<string | null> {
  if (!yearId) return null;
  const sections = await db.sections
    .where(`[subject_id+type]`)
    .equals([subject, "year"])
    .toArray();
  return sections.find((s) => s.id === yearId)?.name ?? null;
}

// ─── Passages ─────────────────────────────────────────────────────────────────

export async function getPassagesForSubject(subject: string): Promise<Passage[]> {
  return db.passages.where("subject_id").equals(subject).toArray();
}

export async function getPassageById(passageId: string): Promise<Passage | undefined> {
  return db.passages.get(passageId);
}

export async function syncPassagesOfflineFirst(subject: string): Promise<boolean> {
  try {
    const existing = await db.passages.where("subject_id").equals(subject).count();
    if (existing > 0) return true;

    const { data, error } = await supabase
      .from("passages")
      .select("*")
      .eq("subject_id", subject);

    if (error || !data || data.length === 0) return false;

    const passages: Passage[] = data.map((row: any) => ({
      $id: row.id,
      subject_id: row.subject_id,
      season_id: row.season_id ?? null,
      year_id: row.year_id ?? null,
      content: row.content,
      image_url: row.image_url ?? null,
    }));

    await db.passages.bulkPut(passages);
    return true;
  } catch {
    return false;
  }
}

export async function clearPassages(): Promise<boolean> {
  try {
    await db.passages.clear();
    return true;
  } catch {
    return false;
  }
}