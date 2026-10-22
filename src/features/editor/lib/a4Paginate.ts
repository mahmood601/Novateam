// A4 mode that matches the PRINTED PDF.
//
// Why not just draw a line every N centimetres?  Paged.js does not cut a
// page at a fixed height. It moves whole blocks (callouts, boxes, table
// rows, images) to the next page, splits paragraphs line by line
// (orphans/widows), and restarts at manual page breaks. Every such shift
// moves all later pages, so a fixed grid drifts away from the real print.
//
// So instead we ask Paged.js itself:
//   1. take the editor's HTML, tag every top-level block with data-a4-i,
//   2. paginate it in a hidden container with the SAME stylesheet the print
//      page uses,
//   3. read which block (and, for split blocks, which character) ends each
//      page  ->  "break anchors",
//   4. find those blocks in the editor and draw the red line there.
//
// Anchors refer to blocks/characters, not pixels, so lines follow the text
// instantly while you type; the slow Paged.js run only refreshes the anchors.

import type { Editor } from "@tiptap/core";

import { renderDiagramToSvg, sectionColorOf } from "./diagram-renderer";
import {
  PAGE_BREAK_CSS,
  PAGED_PRINT_CSS_URL,
  stampPageBreaks,
} from "./pagedShared";
import { CONTENT_H, MARGIN_TOP, setA4Lines } from "./a4Lines";

/** Where one printed page ends, in editor terms. */
export type A4Break = {
  /** Index of the top-level block that holds the page end. */
  block: number;
  /** null = the page ends right after this block.
   *  number = the block is split; this many characters stay on this page. */
  chars: number | null;
  /** Total characters of that block across all its pieces (for splits). */
  total: number;
};

// Rendering diagrams is the slowest part; the same code gives the same SVG.
const svgCache = new Map<string, string>();

async function renderDiagrams(root: ParentNode) {
  const els = root.querySelectorAll<HTMLElement>('[data-type="diagram"], [data-type="mermaid"]');
  for (const el of els) {
    const code = el.getAttribute("data-content") || el.textContent || "";
    if (!code.trim()) continue;
    // Color follows the section heading, so it is part of the cache key.
    const accent = sectionColorOf(el);
    const key = `${accent ?? ""}|${code}`;
    let svg = svgCache.get(key);
    if (svg === undefined) {
      svg = await renderDiagramToSvg(code, true, accent); // same print mode as LecturePrint
      svgCache.set(key, svg);
    }
    el.innerHTML = svg;
    el.classList.add("diagram-rendered");
  }
}

/** Runs Paged.js on the editor content and returns where every page ends. */
export async function computeA4Breaks(editor: Editor): Promise<A4Break[] | null> {
  const doc = editor.state.doc;

  // Same HTML the print page builds from the document.
  const parsed = new DOMParser().parseFromString(editor.getHTML(), "text/html");
  const blocks = Array.from(parsed.body.children);

  // We map block i <-> doc.child(i). If the counts differ we can't do it
  // reliably, so the caller falls back to the fixed grid.
  if (blocks.length !== doc.childCount) return null;
  blocks.forEach((el, i) => el.setAttribute("data-a4-i", String(i)));

  // Same wrapper as the print page: `.lecture-body` is what paged-print.css
  // styles (14pt, line-height, RTL, `page: main` margins, ...).
  const article = document.createElement("article");
  article.className = "lecture-body text-black";
  article.append(...blocks);

  const fragment = document.createDocumentFragment();
  fragment.appendChild(article);

  stampPageBreaks(fragment);
  await renderDiagrams(fragment);
  await document.fonts?.ready; // wrong fonts = wrong line wrapping = wrong pages

  // Must be laid out (so not display:none) but never seen.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;visibility:hidden;pointer-events:none;";
  document.body.appendChild(host);

  const { Previewer } = await import("pagedjs");
  const paged = new Previewer();
  try {
    await paged.preview(
      fragment,
      [PAGED_PRINT_CSS_URL, { "nova-page-break.css": PAGE_BREAK_CSS } as any],
      host,
    );
    return readBreaks(host);
  } finally {
    // Remove the <style> tags Paged.js injected into <head>.
    try {
      (paged as any).polisher?.destroy();
    } catch {}
    host.remove();
  }
}

function readBreaks(host: HTMLElement): A4Break[] {
  type Piece = { i: number; len: number; splitTo: boolean };

  const pages = Array.from(host.querySelectorAll<HTMLElement>(".pagedjs_page"));
  const perPage: Piece[][] = pages.map((page) =>
    Array.from(
      page.querySelectorAll<HTMLElement>(".pagedjs_page_content [data-a4-i]"),
    ).map((el) => ({
      i: Number(el.getAttribute("data-a4-i")),
      len: el.textContent?.length ?? 0,
      // Paged.js sets data-split-to on the piece that continues on the next page.
      splitTo: el.hasAttribute("data-split-to"),
    })),
  );

  // A block split over several pages appears once per page; add the pieces up.
  const total = new Map<number, number>();
  for (const p of perPage.flat()) total.set(p.i, (total.get(p.i) ?? 0) + p.len);

  const seen = new Map<number, number>();
  const breaks: A4Break[] = [];

  perPage.forEach((pieces, k) => {
    for (const p of pieces) seen.set(p.i, (seen.get(p.i) ?? 0) + p.len);
    if (k === perPage.length - 1) return; // last page has no "end line" after it
    const last = pieces[pieces.length - 1];
    if (!last) return; // blank page
    breaks.push(
      last.splitTo
        ? { block: last.i, chars: seen.get(last.i) ?? 0, total: total.get(last.i) ?? 0 }
        : { block: last.i, chars: null, total: 0 },
    );
  });

  return breaks;
}

// ───────────────────────── drawing ─────────────────────────

/**
 * Converts break anchors to y positions in the editor and draws the lines.
 * Returns false if the anchors no longer fit the document (caller falls back).
 */
export function applyA4Breaks(editor: Editor, breaks: A4Break[]): boolean {
  const paper = editor.view.dom as HTMLElement;
  const pr = paper.getBoundingClientRect();
  // The sheet uses CSS `zoom`. getBoundingClientRect() is in zoomed pixels,
  // but the lines live in the sheet's own pixels, so divide by the zoom.
  const z = paper.offsetWidth ? pr.width / paper.offsetWidth || 1 : 1;

  const offsets: number[] = [];
  editor.state.doc.forEach((_n, off) => offsets.push(off));

  const blockEl = (i: number): HTMLElement | null => {
    const off = offsets[i];
    if (off === undefined) return null;
    const dom = editor.view.nodeDOM(off);
    return dom && dom.nodeType === 1 ? (dom as HTMLElement) : null;
  };
  const top = (el: HTMLElement) => (el.getBoundingClientRect().top - pr.top) / z;
  const bottom = (el: HTMLElement) => (el.getBoundingClientRect().bottom - pr.top) / z;

  const ys: number[] = [];
  let lastPageStart = MARGIN_TOP;

  for (const b of breaks) {
    const el = blockEl(b.block);
    if (!el) return false;

    let y: number;
    let nextStart: number;

    if (b.chars === null) {
      y = bottom(el); // page ends after this block
      const next = blockEl(b.block + 1);
      nextStart = next ? top(next) : y;
    } else {
      y =
        yInsideBlock(el, b, pr, z) ??
        // Can't map characters (e.g. block has editor-only UI): estimate.
        top(el) + (b.total ? b.chars / b.total : 1) * (bottom(el) - top(el));
      nextStart = y;
    }

    ys.push(y);
    lastPageStart = nextStart;
  }

  // Where the LAST page would end if you keep writing (so you see how much
  // room is left). Only when it falls inside the sheet.
  const capacityLine = lastPageStart + CONTENT_H;
  if (!ys.length || capacityLine < paper.offsetHeight) ys.push(capacityLine);

  setA4Lines(paper, ys);
  return true;
}

/** y (sheet px) of the line where the next page starts inside a split block. */
function yInsideBlock(
  el: HTMLElement,
  b: A4Break,
  pr: DOMRect,
  z: number,
): number | null {
  const text = el.textContent ?? "";
  // The editor and the print DOM must contain the same text for character
  // offsets to line up (small slack for whitespace differences).
  if (b.chars === null || Math.abs(text.length - b.total) > 2) return null;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const len = (node as Text).data.length;
    if (seen + len > b.chars) {
      const o = b.chars - seen;
      const range = document.createRange();
      range.setStart(node, o);
      range.setEnd(node, Math.min(o + 1, len));
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return null;

      // The glyph box is shorter than the line box; step up half the leading
      // so the line sits BETWEEN the two lines of text, not on the letters.
      const lh = parseFloat(getComputedStyle((node as Text).parentElement!).lineHeight);
      const halfLeading = Number.isFinite(lh)
        ? Math.max(0, (lh * z - rect.height) / 2)
        : 0;
      return (rect.top - halfLeading - pr.top) / z;
    }
    seen += len;
  }
  return null;
}
