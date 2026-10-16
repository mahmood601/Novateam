// Draws the red dashed "end of page" lines in A4 mode.
//
// updateA4Lines() below is only the FALLBACK (a fixed grid). The print-accurate
// positions come from a4Paginate.ts, which asks Paged.js where each page
// really ends. In this fallback each manual page break restarts the page
// counter: the next line is one full page-content height below the break.
// Keep these numbers equal to the margins in a4-mode.css and
// `@page main` in public/print/paged-print.css.
const MM = 96 / 25.4;
export const MARGIN_TOP = 15 * MM; // --a4-mt (1.5cm)
export const CONTENT_H = (297 - 15 - 18) * MM; // page height - top - bottom margins

/** `paper` is the `.tiptap` element. Writes --a4-lines on it. */
export function updateA4Lines(paper: HTMLElement) {
  const breaks = Array.from(
    paper.querySelectorAll<HTMLElement>(
      ':scope > [data-nova-block="page-break"]',
    ),
  );
  const ys: number[] = [];
  const end = paper.offsetHeight;

  let start = MARGIN_TOP; // top of the current page's text area
  const addLines = (limit: number) => {
    for (let y = start + CONTENT_H; y < limit; y += CONTENT_H) ys.push(y);
  };

  for (const b of breaks) {
    addLines(b.offsetTop);
    start = b.offsetTop + b.offsetHeight; // new page starts after the break
  }
  addLines(end);
  // Always show the first line, even on a short/empty document.
  if (!ys.length && !breaks.length) ys.push(MARGIN_TOP + CONTENT_H);

  setA4Lines(paper, ys);
}

/** Writes the red lines. `ys` are positions in the paper's own coordinates. */
export function setA4Lines(paper: HTMLElement, ys: number[]) {
  // ::after starts at --a4-mt, so positions are relative to that.
  const layers = ys.map(
    (y) =>
      `linear-gradient(#ef4444,#ef4444) 0 ${y - MARGIN_TOP - 2}px / 100% 2px no-repeat`,
  );
  paper.style.setProperty(
    "--a4-lines",
    layers.length ? layers.join(",") : "none",
  );
}
