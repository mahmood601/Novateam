import type { JSONContent } from "@tiptap/core";

// ============================================
// Tiptap JSON → flat list of searchable text blocks
// ============================================
// Deliberately independent from jsonToLectureHtml/extensionsArr (see the
// warning in lectureContentHtml.ts about that being a shared source of
// truth with print/review). This only reads the raw JSON — it never
// touches the editor or the render pipeline, so it can't drift from or
// affect what those already do.
//
// We only collect "paragraph" and "heading" nodes, wherever they occur
// (including nested inside list items, table cells, blockquotes). That
// covers effectively all lecture prose without needing a case for every
// container node type (bulletList, listItem, table, tableRow, tableCell,
// blockquote, ...) — we just recurse through their `content` arrays.

export type LectureBlock = {
  blockIndex: number;
  nodeType: string;
  text: string;
  // Nearest preceding heading text, in document order — used as context
  // for the result snippet ("الاستقلاب الكبدي › الخطوة الثانية").
  headingText: string | null;
};

function collectText(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(collectText).join("");
}

export function extractLectureBlocks(
  content: JSONContent | null | undefined,
): LectureBlock[] {
  if (!content || content.type !== "doc" || !content.content) return [];

  const blocks: LectureBlock[] = [];
  const state = { index: 0, heading: null as string | null };

  function walk(node: JSONContent) {
    if (node.type === "heading" || node.type === "paragraph") {
      const text = collectText(node).trim();
      if (node.type === "heading" && text) state.heading = text;
      if (text) {
        blocks.push({
          blockIndex: state.index,
          nodeType: node.type,
          text,
          headingText: node.type === "heading" ? null : state.heading,
        });
      }
      state.index++;
      return; // paragraphs/headings don't nest further text blocks
    }
    node.content?.forEach(walk);
  }

  content.content.forEach(walk);
  return blocks;
}
