// Local cache types for the lectures feature.
//
// Split in two on purpose:
// - CachedLecture: lightweight metadata synced in bulk whenever a subject's
//   lecture list is opened (stale-while-revalidate, same as sections.ts).
// - CachedLectureContent: the full Tiptap JSON body, fetched and cached
//   lazily — only when a specific lecture is actually opened, never as
//   part of the bulk list sync.
export type LectureStatus = "draft" | "published";

export type CachedLecture = {
  id: string;
  subject_id: string;
  season_id: number;
  doctor_name: string | null;
  status: LectureStatus;
  updated_at: string;
};

export type CachedLectureContent = {
  id: string; // matches CachedLecture.id (formatted_lectures.id)
  content: unknown; // Tiptap JSONContent (formatted_lectures.content.raw)
  cached_at: string;
};
