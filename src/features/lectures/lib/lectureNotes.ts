// ============================================
// Personal reading notes (per lecture, per device)
// ============================================
// Stored in localStorage only — nothing is sent to the server, so notes are
// private to this browser. Same storage approach as lectureResume.ts.
//
// A note is anchored to a TOP-LEVEL block of the rendered lecture
// (direct child of the lecture container). Two things are saved so the note
// survives edits to the lecture by the team:
//   idx  = DOM child index when the note was written
//   snip = the block's first ~80 chars of text
// On open we look for the block with the same snippet (nearest to idx).
// If the paragraph was rewritten, the note is kept as "orphan" and still
// listed in the notes sheet, so the user never silently loses what they wrote.

export type LectureNote = {
  id: string;
  idx: number;
  snip: string;
  text: string;
  updatedAt: number;
};

const key = (subjectId: string, seasonId: number) =>
  `nova:lecture-notes:${subjectId}:${seasonId}`;

function isNote(v: unknown): v is LectureNote {
  const n = v as LectureNote;
  return (
    !!n &&
    typeof n.id === "string" &&
    typeof n.idx === "number" &&
    typeof n.snip === "string" &&
    typeof n.text === "string" &&
    typeof n.updatedAt === "number"
  );
}

export function loadNotes(subjectId: string, seasonId: number): LectureNote[] {
  try {
    const raw = localStorage.getItem(key(subjectId, seasonId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isNote) : [];
  } catch {
    return [];
  }
}

/** Returns false when the browser refused to store (full / blocked). */
export function saveNotes(
  subjectId: string,
  seasonId: number,
  notes: LectureNote[],
): boolean {
  try {
    if (notes.length === 0) localStorage.removeItem(key(subjectId, seasonId));
    else localStorage.setItem(key(subjectId, seasonId), JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

export function newNoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const DIAGRAM_SELECTOR =
  '[data-type="diagram"], [data-type="mermaid"], .diagram-rendered';

/** Blocks that get a note button (not page breaks / empty paragraphs). */
export function isNoteBlock(el: Element): boolean {
  if (el.matches(".nova-page-break, hr, br")) return false;
  if ((el.textContent ?? "").trim()) return true;
  return (
    !!el.querySelector("img, svg, table, video, iframe, canvas") ||
    el.hasAttribute("data-type")
  );
}

/**
 * Stable text fingerprint of a block. Diagrams get a constant value because
 * their text changes once they finish rendering (code → SVG labels).
 */
export function blockSnippet(el: Element): string {
  if (el.matches(DIAGRAM_SELECTOR) || el.querySelector(DIAGRAM_SELECTOR)) {
    return "[مخطط]";
  }
  const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (t) return t.slice(0, 80);
  if (el.querySelector("img")) return "[صورة]";
  return "[عنصر]";
}

/** Index of the block this note belongs to, or -1 if it can't be found. */
export function resolveAnchor(note: LectureNote, snippets: string[]): number {
  const nearest = (match: (s: string) => boolean) => {
    let best = -1;
    let bestDist = Infinity;
    snippets.forEach((s, i) => {
      if (!match(s)) return;
      const d = Math.abs(i - note.idx);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    return best;
  };

  const exact = nearest((s) => s === note.snip);
  if (exact !== -1) return exact;

  // Paragraph lightly edited at its end: match on the beginning.
  const head = note.snip.slice(0, 25);
  return head.length >= 15 ? nearest((s) => s.startsWith(head)) : -1;
}
