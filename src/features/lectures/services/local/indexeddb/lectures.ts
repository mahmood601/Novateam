import { db } from "../../../../quizzes/services/local/indexeddb/db";
import { getLecture, listLectures } from "../../../../shared/services/lecturesUpdates";
import type {
  CachedLecture,
  CachedLectureContent,
} from "../../../types/cached-lecture";

// ============================================
// قائمة المحاضرات (metadata فقط) — نفس نمط syncAndGetSections
// ============================================
export async function syncAndGetLectures(
  subjectId: string,
  onUpdate?: (lectures: CachedLecture[]) => void,
): Promise<CachedLecture[]> {
  const cached = await db.lectures.where("subject_id").equals(subjectId).toArray();

  if (cached.length === 0) {
    return new Promise((resolve) => {
      syncLecturesInBackground(subjectId, (fresh) => {
        onUpdate?.(fresh);
        resolve(fresh);
      });
    });
  }

  syncLecturesInBackground(subjectId, onUpdate);
  return cached;
}

async function syncLecturesInBackground(
  subjectId: string,
  onUpdate?: (lectures: CachedLecture[]) => void,
) {
  if (!navigator.onLine) return;
  try {
    const { data, error } = await listLectures({
      subjectId,
      status: "published",
    });
    if (error || !data) return;

    const metadata: CachedLecture[] = (data as any[]).map((row) => ({
      id: row.id,
      subject_id: row.subject_id,
      season_id: row.season_id,
      doctor_name: row.doctor_name ?? null,
      status: row.status,
      updated_at: row.updated_at,
    }));

    await db.lectures.where("subject_id").equals(subjectId).delete();
    await db.lectures.bulkPut(metadata);
    onUpdate?.(metadata);
  } catch {
    // offline
  }
}

// ============================================
// محتوى محاضرة واحدة — يُجلب ويُخزَّن فقط عند الفتح الفعلي (Lazy)
// ============================================
export async function getLectureContentCached(
  subjectId: string,
  seasonId: number,
  onUpdate?: (content: CachedLectureContent | null) => void,
): Promise<CachedLectureContent | null> {
  const meta = await db.lectures
    .where("[subject_id+season_id]")
    .equals([subjectId, seasonId])
    .first();

  const cached = meta ? await db.lectureContents.get(meta.id) : undefined;

  if (cached) {
    syncLectureContentInBackground(subjectId, seasonId, onUpdate);
    return cached;
  }

  return new Promise((resolve) => {
    syncLectureContentInBackground(subjectId, seasonId, (fresh) => {
      onUpdate?.(fresh);
      resolve(fresh);
    });
  });
}

async function syncLectureContentInBackground(
  subjectId: string,
  seasonId: number,
  onUpdate?: (content: CachedLectureContent | null) => void,
) {
  if (!navigator.onLine) {
    onUpdate?.(null);
    return;
  }
  try {
    const { data, error } = await getLecture({
      subjectId,
      seasonId,
      status: "published",
    });
    // getLecture selects without .single(), so data is an array.
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      onUpdate?.(null);
      return;
    }

    const record: CachedLectureContent = {
      id: row.id,
      content: row.content?.raw ?? null,
      cached_at: new Date().toISOString(),
    };

    await db.lectureContents.put(record);
    onUpdate?.(record);
  } catch {
    onUpdate?.(null);
  }
}

// ============================================
// تنظيف (لتغيير السنة/تسجيل الخروج، بنفس نمط clearSections/clearSubjects)
// ============================================
export async function clearLectures(): Promise<boolean> {
  try {
    await db.lectures.clear();
    await db.lectureContents.clear();
    return true;
  } catch {
    return false;
  }
}
