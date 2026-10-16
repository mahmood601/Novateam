// Shared by the print page (LecturePrint.tsx) and the editor's A4 mode
// (a4Paginate.ts), so both paginate with EXACTLY the same rules.

/** Manual page break: `:::pagebreak :::` renders as <div class="nova-page-break">. */
export const PAGE_BREAK_CSS = `.nova-page-break {
  break-after: page;
  height: 0;
  margin: 0;
  padding: 0;
  border: 0;
}`;

/** Same stylesheet the print page uses. */
export const PAGED_PRINT_CSS_URL = new URL("/print/paged-print.css", import.meta.url).href;

/**
 * Paged.js only starts a new page on the element carrying
 * data-previous-break-after (normally stamped from the CSS rule). Stamp it
 * ourselves so manual page breaks don't depend on CSS parsing succeeding.
 */
export function stampPageBreaks(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".nova-page-break").forEach((el) => {
    el.setAttribute("data-break-after", "page");
    el.nextElementSibling?.setAttribute("data-previous-break-after", "page");
  });
}
