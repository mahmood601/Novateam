// A4 preview = the real Paged.js output, not an approximation.
//
// The editor HTML is paginated with the SAME stylesheet, wrapper class and
// page-break handling as the print page (LecturePrint.tsx), then the finished
// `.pagedjs_pages` node is moved into a visible container. Because it is the
// same engine and the same rules, every page matches the printed PDF.

import type { Editor } from "@tiptap/core";

import { renderMermaidToSvg } from "./mermaid-renderer";
import {
  PAGE_BREAK_CSS,
  PAGED_PRINT_CSS_URL,
  stampPageBreaks,
} from "./pagedShared";

export type A4PreviewMeta = {
  /** Text of the running header bar (subject name). */
  headerTitle?: string;
  /** Text of the running footer bar. */
  footerTitle?: string;
};

export type A4PreviewHandle = {
  /** Stops the preview and removes everything it injected. */
  destroy: () => void;
};

// Rendering Mermaid is the slowest part; the same code gives the same SVG.
const svgCache = new Map<string, string>();

async function renderMermaids(root: ParentNode) {
  const els = root.querySelectorAll<HTMLElement>('[data-type="mermaid"]');
  for (const el of els) {
    const code = el.getAttribute("data-content") || el.textContent || "";
    if (!code.trim()) continue;
    let svg = svgCache.get(code);
    if (svg === undefined) {
      svg = await renderMermaidToSvg(code, true); // same print mode as LecturePrint
      svgCache.set(code, svg);
    }
    el.innerHTML = svg;
    el.classList.add("mermaid-rendered");
  }
}

/** Running header/footer, same markup as LecturePrint's buildDocument(). */
function buildRunning(meta: A4PreviewMeta): HTMLElement[] {
  const header = document.createElement("div");
  header.className = "running-header";
  header.innerHTML = `<div class="header-flex-content">
    <img src="/print/image1.png" alt="" />
    <div class="title-bar" dir="rtl"></div>
  </div>`;
  header.querySelector(".title-bar")!.textContent = meta.headerTitle ?? "";

  const footer = document.createElement("div");
  footer.className = "running-footer";
  footer.innerHTML = `<div class="footer-flex-content">
    <div class="number"></div>
    <div class="info-bar" dir="rtl"></div>
  </div>`;
  footer.querySelector(".info-bar")!.textContent = meta.footerTitle ?? "";

  return [header, footer];
}

/**
 * Paginates the editor content with Paged.js.
 * Returns the finished pages node and a cleanup function, or null if the
 * run was cancelled (`isStale()` became true) before it finished.
 */
export async function renderA4Pages(
  editor: Editor,
  meta: A4PreviewMeta,
  isStale: () => boolean,
): Promise<{ pages: HTMLElement; destroy: () => void } | null> {
  const parsed = new DOMParser().parseFromString(editor.getHTML(), "text/html");
  const blocks = Array.from(parsed.body.children);
  // data-a4-i = index of the top-level editor block (used for click-to-jump).
  blocks.forEach((el, i) => el.setAttribute("data-a4-i", String(i)));

  // `.lecture-body` is what paged-print.css styles (font, RTL, `page: main`).
  const article = document.createElement("article");
  article.className = "lecture-body text-black";
  article.append(...blocks);

  const fragment = document.createDocumentFragment();
  fragment.append(...buildRunning(meta), article);

  stampPageBreaks(fragment);
  await renderMermaids(fragment);
  await document.fonts?.ready; // wrong fonts = wrong wrapping = wrong pages
  if (isStale()) return null;

  // Must be laid out (not display:none) but never seen.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;visibility:hidden;pointer-events:none;";
  document.body.appendChild(host);

  const { Previewer } = await import("pagedjs");
  const paged = new Previewer();
  const destroy = () => {
    // Removes the <style> tags Paged.js injected into <head>.
    try {
      (paged as any).polisher?.destroy();
    } catch {}
  };

  try {
    await paged.preview(
      fragment,
      [PAGED_PRINT_CSS_URL, { "nova-page-break.css": PAGE_BREAK_CSS } as any],
      host,
    );
    const pages = host.querySelector<HTMLElement>(".pagedjs_pages");
    if (!pages || isStale()) {
      destroy();
      return null;
    }
    return { pages, destroy };
  } catch (err) {
    destroy();
    throw err;
  } finally {
    host.remove(); // `pages` was either moved out by the caller or is discarded
  }
}
