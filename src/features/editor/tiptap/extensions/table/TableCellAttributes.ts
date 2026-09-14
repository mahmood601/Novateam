// Adds per-cell text alignment (horizontal) and vertical alignment to
// TableCell/TableHeader. Both attributes render as plain CSS on the
// <td>/<th> itself, so they survive HTML export, print/pagination, and
// round-trip cleanly through parseHTML.

import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

export type CellTextAlign = "left" | "center" | "right" | "justify";
export type CellVerticalAlign = "top" | "middle" | "bottom";

const alignmentAttributes = {
  textAlign: {
    default: null as CellTextAlign | null,
    parseHTML: (element: HTMLElement) =>
      (element.style.textAlign as CellTextAlign) || null,
    renderHTML: (attributes: { textAlign?: CellTextAlign | null }) => {
      if (!attributes.textAlign) return {};
      return { style: `text-align: ${attributes.textAlign}` };
    },
  },
  verticalAlign: {
    default: null as CellVerticalAlign | null,
    parseHTML: (element: HTMLElement) =>
      (element.style.verticalAlign as CellVerticalAlign) || null,
    renderHTML: (attributes: { verticalAlign?: CellVerticalAlign | null }) => {
      if (!attributes.verticalAlign) return {};
      return { style: `vertical-align: ${attributes.verticalAlign}` };
    },
  },
};

export const NovaTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...alignmentAttributes,
    };
  },
});

export const NovaTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...alignmentAttributes,
    };
  },
});
