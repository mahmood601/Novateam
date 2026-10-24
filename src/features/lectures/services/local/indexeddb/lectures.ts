import { db } from "../../../../quizzes/services/local/indexeddb/db";
import { getLecture, getLectureUpdatedAt, listLectures } from "../../../../shared/services/lecturesUpdates";
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

// Bump this whenever the Tiptap extensions / HTML output change, so every
// device throws away its pre-rendered HTML and rebuilds it once.
export const LECTURE_HTML_VERSION = 1;

/** The marker a pre-rendered HTML is tied to (changes when the lecture does). */
export const lectureHtmlSource = (rec: CachedLectureContent) =>
  rec.updated_at ?? rec.cached_at;

/** True when `rec.html` can be shown as-is, with no Tiptap involved. */
export const hasFreshHtml = (rec: CachedLectureContent | null | undefined) =>
  !!rec?.html &&
  rec.html_ver === LECTURE_HTML_VERSION &&
  rec.html_src === lectureHtmlSource(rec);

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
    // Show the cached copy right away; revalidate quietly in the background.
    void revalidateLectureContent(subjectId, seasonId, cached, onUpdate);
    return cached;
  }

  // Nothing cached: the caller waits for the first download.
  return fetchLectureContent(subjectId, seasonId);
}

async function fetchLectureContent(
  subjectId: string,
  seasonId: number,
): Promise<CachedLectureContent | null> {
  if (!navigator.onLine) return null;
  try {
    const { data, error } = await getLecture({
      subjectId,
      seasonId,
      status: "published",
    });
    // getLecture selects without .single(), so data is an array.
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return null;

    const record: CachedLectureContent = {
      id: row.id,
      content: row.content?.raw ?? null,
      cached_at: new Date().toISOString(),
      updated_at: row.updated_at ?? undefined,
    };

    await db.lectureContents.put(record);
    // The body cache is looked up through this metadata row. Nothing else
    // fills `db.lectures` while the sidebar is not mounted, so without this
    // row every open missed the cache and waited on the network.
    await db.lectures.put({
      id: row.id,
      subject_id: row.subject_id,
      season_id: row.season_id,
      doctor_name: row.doctor_name ?? null,
      status: row.status,
      updated_at: row.updated_at,
    });
    return record;
  } catch {
    return null;
  }
}

// Stale-while-revalidate WITHOUT the cost: a tiny `updated_at` query decides
// whether anything changed. Only a real change downloads the body and
// notifies the UI (which then rebuilds the HTML). An unchanged lecture does
// no download and no re-render.
async function revalidateLectureContent(
  subjectId: string,
  seasonId: number,
  cached: CachedLectureContent,
  onUpdate?: (content: CachedLectureContent | null) => void,
) {
  if (!navigator.onLine) return;
  try {
    if (cached.updated_at) {
      const { data } = await getLectureUpdatedAt({
        subjectId,
        seasonId,
        status: "published",
      });
      // Offline-ish failure or unpublished: keep showing the cached copy.
      if (!data || data.updated_at === cached.updated_at) return;
    }

    const fresh = await fetchLectureContent(subjectId, seasonId);
    if (!fresh) return;

    // Legacy cache entry (saved before updated_at existed): upgrade it in
    // place and only notify the UI if the body actually differs.
    if (!cached.updated_at && fresh.updated_at) {
      if (JSON.stringify(fresh.content) === JSON.stringify(cached.content)) {
        await db.lectureContents.put({ ...cached, ...fresh, html: undefined });
        return;
      }
    }

    onUpdate?.(fresh);
  } catch {
    // offline / transient error — keep the cached copy
  }
}

/** Stores the pre-rendered reading HTML next to the lecture body. */
export async function saveLectureHtml(rec: CachedLectureContent, html: string) {
  try {
    await db.lectureContents.update(rec.id, {
      html,
      html_src: lectureHtmlSource(rec),
      html_ver: LECTURE_HTML_VERSION,
    });
  } catch {
    // storage full / blocked — next open just rebuilds
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
