import { Document } from "flexsearch";
import type { JSONContent } from "@tiptap/core";
import { db, type CachedLecture } from "../../quizzes/services/local/indexeddb/db";
import { extractLectureBlocks, type LectureBlock } from "./lectureBlocks";
import { normalizeArabic } from "./arabicNormalize";

// npm install flexsearch   (add to package.json — not yet a dependency)

// ============================================
// Types
// ============================================

export type LectureSearchResult = {
  uid: string; // `${lectureId}:${blockIndex}`
  lectureId: string;
  subjectId: string;
  seasonId: number;
  blockIndex: number;
  text: string; // original (non-normalized) text, for the snippet
  headingText: string | null;
};

type IndexedDoc = LectureSearchResult & { normText: string };

// ============================================
// Index (rebuilt in memory each time the search page is opened — the
// data set is small: only *cached* lectures, i.e. ones the user already
// opened, so this stays cheap. No persistence needed.)
// ============================================

let index: Document<IndexedDoc, true> | null = null;
let lectureMetaById: Map<string, CachedLecture> = new Map();

async function buildIndex(): Promise<void> {
  const [lectures, contents] = await Promise.all([
    db.lectures.toArray(),
    db.lectureContents.toArray(),
  ]);

  lectureMetaById = new Map(lectures.map((l) => [l.id, l]));

  const doc = new Document<IndexedDoc, true>({
    document: {
      id: "uid",
      index: [{ field: "normText", tokenize: "forward" }],
      store: true,
    },
  });

  for (const record of contents) {
    const meta = lectureMetaById.get(record.id);
    if (!meta) continue; // metadata not synced (e.g. subject switched) — skip

    const blocks: LectureBlock[] = extractLectureBlocks(
      record.content as JSONContent | null,
    );

    for (const block of blocks) {
      const uid = `${record.id}:${block.blockIndex}`;
      doc.add({
        uid,
        lectureId: record.id,
        subjectId: meta.subject_id,
        seasonId: meta.season_id,
        blockIndex: block.blockIndex,
        text: block.text,
        headingText: block.headingText,
        normText: normalizeArabic(block.text),
      });
    }
  }

  index = doc;
}

// Call once when the search page mounts, and again whenever the set of
// cached lectures could have changed (e.g. the user just opened a new
// lecture in another tab of the app during this session).
export async function ensureLectureSearchIndex(forceRebuild = false): Promise<void> {
  if (index && !forceRebuild) return;
  await buildIndex();
}

// Which subjects currently have at least one cached (searchable) lecture —
// drives the "غير محملة" badge in the UI.
export async function getUncachedLectureCount(subjectId?: string): Promise<number> {
  const lectures = subjectId
    ? await db.lectures.where("subject_id").equals(subjectId).toArray()
    : await db.lectures.toArray();
  const cachedIds = new Set((await db.lectureContents.toArray()).map((c) => c.id));
  return lectures.filter((l) => !cachedIds.has(l.id)).length;
}

// Best-effort snippet centered on the match. Falls back to the start of
// the block's text if the raw (non-normalized) query can't be located
// directly — see the note in lectureHighlight.ts about why we don't try
// to map normalized offsets back onto the original string.
export function buildSnippet(text: string, query: string, radius = 50): string {
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx === -1) {
    return text.length > radius * 2 ? `${text.slice(0, radius * 2)}…` : text;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function searchLectures(query: string, limit = 50): LectureSearchResult[] {
  if (!index) return [];
  const q = normalizeArabic(query.trim());
  if (!q) return [];

  const hits = index.search(q, { limit, enrich: true });
  const results: LectureSearchResult[] = [];

  for (const fieldResult of hits) {
    for (const entry of fieldResult.result) {
      const stored = (entry as { doc?: IndexedDoc }).doc;
      if (stored) {
        const { normText, ...rest } = stored;
        results.push(rest);
      }
    }
  }

  // dedupe (a doc can match on more than one indexed field in general;
  // here we only index one field, but keep this defensive)
  const seen = new Set<string>();
  return results.filter((r) => (seen.has(r.uid) ? false : (seen.add(r.uid), true)));
}
