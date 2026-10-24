// IMPORTANT: no static import of @tiptap/core or extensionsArr here. They
// weigh ~1.7 MB of JS; this module is imported by the reading view, which
// should only pay for them when a lecture's HTML really has to be built
// (see jsonToLectureHtml, which loads them on demand).
import type { JSONContent } from "@tiptap/core";

/** Starts downloading the Tiptap renderer without running anything. */
export function preloadLectureRenderer(): void {
  void import("@tiptap/core");
  void import("@/features/editor/tiptap/extensions/extensionsArr");
}

function migrateLegacyDiagramNodes<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => migrateLegacyDiagramNodes(item)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      next[key] = migrateLegacyDiagramNodes(child);
    }
    if (next.type === "mermaid") {
      next.type = "diagram";
    }
    return next as T;
  }

  return value;
}

// ============================================
// JSON → HTML (نفس محرك jsonToPrintHtml في LecturePrint.tsx)
// ============================================
// Same source of truth as the review editor and the print export
// (TiptapReviewEditor.tsx / LecturePrint.tsx): this MUST use the exact
// same extension set, or the read view can silently diverge from what
// the team actually reviewed.
//
// Unlike LecturePrint's version, this does NOT mutate the shared
// `extensionsArr` — that file's `extensionsArr.pop()` permanently removes
// the Markdown extension from the shared array the first time it runs
// (and a second extension on any later call). Filtered here instead,
// non-destructively, so this and the print path can't step on each other.
export async function jsonToLectureHtml(
  content: JSONContent | null,
): Promise<string> {
  if (!content) return "";
  const normalizedContent = migrateLegacyDiagramNodes(content);

  // Guard: a valid Tiptap/ProseMirror doc is always `{ type: "doc", ... }`.
  // Catches the common integration bug of passing the whole cache record
  // (`{ id, content, cached_at }`) instead of just its `.content` field —
  // fails loud in the console instead of crashing the read view.
  if (
    typeof normalizedContent !== "object" ||
    (normalizedContent as JSONContent).type !== "doc"
  ) {
    console.error(
      "[jsonToLectureHtml] Invalid content — expected a Tiptap doc ({ type: \"doc\", ... }), got:",
      normalizedContent,
    );
    return "";
  }

  const [{ Editor }, { extensionsArr }] = await Promise.all([
    import("@tiptap/core"),
    import("@/features/editor/tiptap/extensions/extensionsArr"),
  ]);

  // Let the browser paint the "building" state before the heavy
  // synchronous part below (schema + editor creation) blocks the thread.
  // The timeout covers background tabs, where rAF never fires.
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    requestAnimationFrame(() => setTimeout(done, 0));
    setTimeout(done, 150);
  });

  const readExts = extensionsArr.filter((ext) => ext.name !== "markdown");
  const editor = new Editor({
    extensions: readExts,
    content: normalizedContent,
    contentType: "json",
    editable: false,
  });

  const html = editor.getHTML();
  editor.destroy();

  return html;
}

// ============================================
// توليد id/slug لكل عنوان (h1/h2) — لأجل الفهرس (TOC)
// ============================================
// DOM traversal بسيط بعد الحقن بـ innerHTML، بدون أي تعديل على المحرر
// أو على NovaHeadingExtension (تلوين العناوين يبقى كما هو).
export type LectureTocEntry = {
  id: string;
  text: string;
  level: 1 | 2;
};

// Arabic-safe: keeps unicode letters/numbers (so Arabic headings get a
// real slug, not just stripped to nothing) instead of the usual
// ASCII-only slugify. Falls back to an index-based id for headings with
// no usable text (empty, punctuation-only, etc).
function slugify(text: string, index: number): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `heading-${index}`;
}

export function annotateHeadingsWithIds(container: HTMLElement): LectureTocEntry[] {
  const headings = Array.from(container.querySelectorAll<HTMLElement>("h1, h2"));
  const seen = new Map<string, number>();
  const toc: LectureTocEntry[] = [];

  headings.forEach((heading, index) => {
    const text = (heading.textContent ?? "").trim();
    const slug = slugify(text, index);

    // Dedupe: two headings that produce the same slug (identical text,
    // or both empty) get -1, -2... suffixes so ids stay unique.
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    const id = count === 0 ? slug : `${slug}-${count}`;

    heading.id = id;
    toc.push({
      id,
      text: text || `(بدون عنوان ${index + 1})`,
      level: heading.tagName === "H1" ? 1 : 2,
    });
  });

  return toc;
}