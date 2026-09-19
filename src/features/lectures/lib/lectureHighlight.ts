import { normalizeArabic } from "./arabicNormalize";

// ============================================
// Scroll to + highlight a search term inside an already-rendered lecture
// ============================================
// Deliberately DOM-based rather than tied to blockIndex from the search
// index: the search index and the rendered HTML come from two independent
// paths (JSON walk vs. jsonToLectureHtml), so matching by index would be
// fragile. Walking the live text nodes is slower but always correct
// against whatever actually got rendered.
//
// Matching strategy:
// 1. Exact (raw, case-insensitive) substring match first — this is the
//    common case and gives a precise Range for the highlight.
// 2. If nothing matches exactly (diacritics / alef-form differences),
//    fall back to normalized matching, but only to locate and scroll to
//    the containing element — no attempt to highlight the exact
//    characters, since normalization can change string length and the
//    offset mapping back to the original text isn't reliable.

const HIGHLIGHT_CLASS = "nova-search-highlight";
const HIGHLIGHT_DURATION_MS = 2500;

function clearExistingHighlights(container: HTMLElement) {
  container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
    parent.normalize();
  });
}

function tryExactHighlight(container: HTMLElement, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  const qLower = q.toLowerCase();

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  // eslint-disable-next-line no-cond-assign
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent ?? "";
    const idx = text.toLowerCase().indexOf(qLower);
    if (idx === -1) continue;

    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + q.length);

    const mark = document.createElement("mark");
    mark.className = HIGHLIGHT_CLASS;
    range.surroundContents(mark);

    mark.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      mark.classList.add(`${HIGHLIGHT_CLASS}--fade`);
    }, HIGHLIGHT_DURATION_MS);

    return true;
  }
  return false;
}

function tryNormalizedFallback(container: HTMLElement, query: string): boolean {
  const q = normalizeArabic(query);
  if (!q) return false;

  const blocks = Array.from(
    container.querySelectorAll<HTMLElement>("p, h1, h2, h3, li, blockquote, td, th"),
  );
  const target = blocks.find((el) => normalizeArabic(el.textContent ?? "").includes(q));
  if (!target) return false;

  target.classList.add(HIGHLIGHT_CLASS);
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    target.classList.remove(HIGHLIGHT_CLASS);
  }, HIGHLIGHT_DURATION_MS);
  return true;
}

// Returns whether a match was found and scrolled to.
export function highlightInLecture(container: HTMLElement, query: string): boolean {
  clearExistingHighlights(container);
  if (tryExactHighlight(container, query)) return true;
  return tryNormalizedFallback(container, query);
}
