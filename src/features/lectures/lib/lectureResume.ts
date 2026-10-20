import type { LectureTocEntry } from "./lectureContentHtml";

// Reading position = nearest h1/h2 at/above the viewport top + pixel offset
// into it. Heading-relative, so it survives font-size/image-load changes.
export type SavedPosition = { id: string; offset: number };

const key = (subjectId: string, seasonId: number) =>
  `nova:lecture-pos:${subjectId}:${seasonId}`;

export function loadPosition(
  subjectId: string,
  seasonId: number,
): SavedPosition | null {
  try {
    const raw = localStorage.getItem(key(subjectId, seasonId));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v?.id === "string" && typeof v?.offset === "number" ? v : null;
  } catch {
    return null;
  }
}

export function savePosition(
  subjectId: string,
  seasonId: number,
  pos: SavedPosition,
) {
  try {
    localStorage.setItem(key(subjectId, seasonId), JSON.stringify(pos));
  } catch {
    /* storage full / blocked: ignore */
  }
}

/** Current anchor of the scroller, or null if there are no headings. */
export function computePosition(
  scroller: HTMLElement,
  entries: LectureTocEntry[],
): SavedPosition | null {
  const top = scroller.getBoundingClientRect().top;
  let found: SavedPosition | null = null;
  for (const entry of entries) {
    const el = document.getElementById(entry.id);
    if (!el) continue;
    const rectTop = el.getBoundingClientRect().top;
    if (!found || rectTop - top <= 8) {
      found = { id: entry.id, offset: Math.round(top - rectTop) };
    }
    if (rectTop - top > 8) break;
  }
  return found;
}

/** Absolute scrollTop that corresponds to a saved position, or null. */
export function targetScrollTop(
  scroller: HTMLElement,
  pos: SavedPosition,
): number | null {
  const el = document.getElementById(pos.id);
  if (!el) return null;
  return (
    scroller.scrollTop +
    el.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    pos.offset
  );
}
