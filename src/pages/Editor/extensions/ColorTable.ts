// extensions/ColorTable.ts
// Custom Tiptap node for the two/three-column comparison table with a
// colored header row (e.g. "الجهاز العصبي الودي | نظير الودي").
//
// Deliberately NOT using Tiptap's generic Table extension here: that
// produces raw <table>/<tr>/<td> nodes edited cell-by-cell, which is
// harder to keep consistent with the fixed visual style. Instead this
// node stores structured rows as attrs — matching the "structured JSON,
// no raw HTML" approach already used for Nova's question content.
//
// Doc JSON shape:
// {
//   type: "colorTable",
//   attrs: {
//     headerColor: "#c9a227",
//     columns: ["الجهاز العصبي الودي نظير الودي", "الجهاز العصبي الودي"],
//     rows: [
//       ["في الدماغ والناحية العجزية", "في الناحيتين الصدرية والقطنية..."],
//       ...
//     ]
//   }
// }
//
// This node has no editable rich-text content — editing happens through
// a dedicated side-panel form (table icon → edit rows), not inline
// contentEditable, since the layout must stay fixed. That form is a
// separate UI piece to build later; this file only defines the node +
// its static render (used by both the live preview and Paged.js).

import { Node, mergeAttributes } from "@tiptap/core";

export interface ColorTableAttrs {
  headerColor: string;
  columns: string[];
  rows: string[][];
}

export const ColorTable = Node.create({
  name: "colorTable",
  group: "block",
  atom: true, // opaque leaf node — no child content, edited via NodeView UI instead

  addAttributes() {
    return {
      headerColor: { default: "#c9a227" },
      columns: { default: ["", ""] },
      rows: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-color-table]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { headerColor, columns, rows } = node.attrs as ColorTableAttrs;

    const headerCells = columns.map((c) => [
      "th",
      { style: `background:${headerColor};color:#fff;padding:8px 12px;text-align:right;` },
      c,
    ]);

    const bodyRows = rows.map((row: string[]) => [
      "tr",
      {},
      ...row.map((cell) => [
        "td",
        { style: "border:1px solid #e2e2e2;padding:8px 12px;text-align:right;" },
        cell,
      ]),
    ]);

    return [
      "table",
      mergeAttributes(HTMLAttributes, {
        "data-color-table": "",
        style: "width:100%;border-collapse:collapse;margin:10px 0;",
      }),
      ["tr", {}, ...headerCells],
      ...bodyRows,
    ] as any;
  },
});
