// Adds per-cell text alignment (horizontal) and vertical alignment to
// TableCell/TableHeader. Both attributes render as plain CSS on the
// <td>/<th> itself, so they survive HTML export, print/pagination, and
// round-trip cleanly through parseHTML.

import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

export type CellTextAlign = "left" | "center" | "right" | "justify";
export type CellVerticalAlign = "top" | "middle" | "bottom";
export type CellBorderStyle = "none" | "solid" | "dashed" | "dotted" | "double";
export type CellBorderWidth = "thin" | "medium" | "thick";

const BORDER_WIDTH_PX: Record<CellBorderWidth, string> = {
  thin: "1px",
  medium: "2px",
  thick: "4px",
};
const PX_TO_BORDER_WIDTH: Record<string, CellBorderWidth> = {
  "1px": "thin",
  "2px": "medium",
  "4px": "thick",
};

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

// Cell background color and border style/color. `null` for both border
// attributes falls back to the theme's default 1px border (set in
// editor.css) — only an explicit value overrides it, same "unset = default"
// convention the color pickers in FormatSheet already use elsewhere.
const styleAttributes = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
    renderHTML: (attributes: { backgroundColor?: string | null }) => {
      if (!attributes.backgroundColor) return {};
      return { style: `background-color: ${attributes.backgroundColor}` };
    },
  },
  borderStyle: {
    default: null as CellBorderStyle | null,
    parseHTML: (element: HTMLElement) =>
      (element.style.borderStyle as CellBorderStyle) || null,
    renderHTML: (attributes: { borderStyle?: CellBorderStyle | null }) => {
      if (!attributes.borderStyle) return {};
      return { style: `border-style: ${attributes.borderStyle}` };
    },
  },
  // Owns the `border-width` CSS property exclusively (borderStyle no
  // longer touches it) so the two never fight over the same declaration
  // when Tiptap merges each attribute's rendered style string. Falls
  // back to 3px for "double" automatically since a 1px double border is
  // visually indistinguishable from solid — an explicit width always
  // wins over that fallback.
  borderWidth: {
    default: null as CellBorderWidth | null,
    parseHTML: (element: HTMLElement) =>
      PX_TO_BORDER_WIDTH[element.style.borderWidth] ?? null,
    renderHTML: (attributes: {
      borderWidth?: CellBorderWidth | null;
      borderStyle?: CellBorderStyle | null;
    }) => {
      if (attributes.borderWidth) {
        return { style: `border-width: ${BORDER_WIDTH_PX[attributes.borderWidth]}` };
      }
      if (attributes.borderStyle === "double") {
        return { style: "border-width: 3px" };
      }
      return {};
    },
  },
  borderColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.style.borderColor || null,
    renderHTML: (attributes: { borderColor?: string | null }) => {
      if (!attributes.borderColor) return {};
      return { style: `border-color: ${attributes.borderColor}` };
    },
  },
};

export const NovaTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...alignmentAttributes,
      ...styleAttributes,
    };
  },
});

export const NovaTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...alignmentAttributes,
      ...styleAttributes,
    };
  },
});
