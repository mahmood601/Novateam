// A4 preview = the real Paged.js output, not an approximation.
//
// The editor HTML is paginated with the SAME stylesheet, wrapper class and
// page-break handling as the print page (LecturePrint.tsx), then the finished
// `.pagedjs_pages` node is moved into a visible container. Because it is the
// same engine and the same rules, every page matches the printed PDF.

import type { Editor } from "@tiptap/core";

import { addNovaCardNumbers } from "../tiptap/extensions/NovaCards";
import { addNovaStepNumbers } from "../tiptap/extensions/NovaShapes";
import { renderDiagramToSvg, sectionColorOf } from "./diagram-renderer";
import { buildFrontMatterHtml, buildTocFromContent } from "./printFrontMatter";
import type { CoverData } from "./printFrontMatter";
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
  /** When set, the preview starts with the same cover + table of contents
   *  pages as the print. */
  cover?: CoverData & { doctorName: string };
};

export type A4PreviewHandle = {
  /** Stops the preview and removes everything it injected. */
  destroy: () => void;
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
  let contentHtml = addNovaStepNumbers(addNovaCardNumbers(editor.getHTML()));
  let tocRows = "";
  if (meta.cover) {
    // Gives every H1 an id and builds the TOC rows (same as the print page).
    ({ html: contentHtml, tocRows } = buildTocFromContent(contentHtml));
  }
  const parsed = new DOMParser().parseFromString(contentHtml, "text/html");
  const blocks = Array.from(parsed.body.children);
  // data-a4-i = index of the top-level editor block (used for click-to-jump).
  blocks.forEach((el, i) => el.setAttribute("data-a4-i", String(i)));

  // `.lecture-body` is what paged-print.css styles (font, RTL, `page: main`).
  const article = document.createElement("article");
  article.className = "lecture-body text-black";
  article.append(...blocks);

  // Paged.js duplicates the first pages when the position:running elements
  // are the very first nodes. A zero-height holder paragraph avoids it.
  // (Added after the data-a4-i indexing, so the holder has no index.)
  const holder = document.createElement("p");
  holder.style.cssText =
    "margin:0;padding:0;height:0;line-height:0;font-size:0;overflow:hidden";
  holder.append(...buildRunning(meta));
  article.prepend(holder);

  const fragment = document.createDocumentFragment();
  if (meta.cover) {
    const front = new DOMParser().parseFromString(
      buildFrontMatterHtml(meta.cover, tocRows, meta.cover.doctorName, ""),
      "text/html",
    );
    // The preview is read-only: the cover's editable fields stay plain text.
    front.body
      .querySelectorAll("[contenteditable]")
      .forEach((el) => el.removeAttribute("contenteditable"));
    fragment.append(...Array.from(front.body.childNodes));
  }
  fragment.append(article);

  stampPageBreaks(fragment);
  await renderDiagrams(fragment);
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
    const flow = await paged.preview(
      fragment,
      [PAGED_PRINT_CSS_URL, { "nova-page-break.css": PAGE_BREAK_CSS } as any],
      host,
    );
    host
      .querySelectorAll(".footer-pages-count")
      .forEach((el) => (el.textContent = String(flow.total)));
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
