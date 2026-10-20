import { Table, TableView } from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, type Transaction } from "@tiptap/pm/state";
import { TableMap, columnResizingPluginKey } from "@tiptap/pm/tables";
import type { EditorView } from "@tiptap/pm/view";

// ─────────────────────────────────────────────────────────────────────
// Why columns are rendered as PERCENTAGES
// ─────────────────────────────────────────────────────────────────────
// prosemirror-tables saves a dragged column's width as `colwidth` in PIXELS,
// measured on whichever screen the editor used. Rendering those pixels as-is
// gave a different table on every screen, and the editor (forced to 100%)
// disagreed with the reading view / print (px-sum width).
//
// The saved numbers are kept untouched (no data migration). We only change
// how they are DRAWN: each column's share = its px width ÷ the sum of all
// column widths, so proportions survive any screen size. Columns that never
// got a width count as `cellMinWidth`.
//
// The same helper feeds the editor view AND renderHTML (reading + print), so
// both always draw the same table.

/** Below this per-column width the table scrolls sideways instead of squeezing. */
export const MIN_COL_PX = 56;

export const MIN_TABLE_WIDTH_PCT = 10;

export function clampTableWidth(v: number): number {
  if (!Number.isFinite(v)) return 100;
  return Math.min(100, Math.max(MIN_TABLE_WIDTH_PCT, Math.round(v * 10) / 10));
}

export function tableWidthOf(node: ProseMirrorNode): number {
  return clampTableWidth(Number(node.attrs.tableWidth ?? 100));
}

type ColumnInfo = { widths: number[]; allKnown: boolean };

/**
 * Per-column widths (px), read from the first row like Tiptap does.
 * Columns that were never resized have no saved width. They share whatever
 * is left of a typical phone-width table (REF_WIDTH) equally, which is how
 * such tables looked before this change, so existing lectures keep their
 * look. A table with no saved widths at all gets equal columns.
 */
const REF_WIDTH = 360;

export function readColumns(node: ProseMirrorNode, cellMinWidth: number): ColumnInfo {
  const saved: (number | null)[] = [];
  const row = node.firstChild;
  if (!row) return { widths: [], allKnown: false };

  row.forEach((cell) => {
    const { colspan, colwidth } = cell.attrs as {
      colspan: number;
      colwidth: number[] | null;
    };
    for (let j = 0; j < colspan; j++) saved.push(colwidth?.[j] || null);
  });

  const knownSum = saved.reduce<number>((a, w) => a + (w ?? 0), 0);
  const unknown = saved.filter((w) => w === null).length;
  const fill = unknown
    ? Math.max(cellMinWidth, Math.max(0, REF_WIDTH - knownSum) / unknown)
    : 0;

  return {
    widths: saved.map((w) => w ?? fill),
    allKnown: unknown === 0,
  };
}

function toPercents(widths: number[]): string[] {
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  return widths.map((w) => `${((w / total) * 100).toFixed(3)}%`);
}

class NovaTableView extends TableView {
  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    view?: EditorView,
    HTMLAttributes: Record<string, any> = {},
  ) {
    super(node, cellMinWidth, view, HTMLAttributes);
    this.dom.classList.add("scroll-container");
    this.syncColor(node);
    this.applyColumns(node);
  }

  update(node: ProseMirrorNode) {
    const ok = super.update(node);
    if (ok) {
      this.syncColor(node);
      this.applyColumns(node);
    }
    return ok;
  }

  // Runs AFTER TableView.updateColumns, which writes px widths; we replace
  // them with percentages and make the table fill its wrapper.
  private applyColumns(node: ProseMirrorNode) {
    const { widths } = readColumns(node, this.cellMinWidth);
    const percents = toPercents(widths);
    const cols = Array.from(this.colgroup.children) as HTMLElement[];

    percents.forEach((pct, i) => {
      const col = cols[i];
      if (!col) return;
      col.style.removeProperty("min-width");
      col.style.width = pct;
    });

    // Preferred table width in % of the page (Word: Table Properties ▸ Preferred
    // width ▸ Percent). Default 100 = fill the wrapper.
    this.table.style.width = `${tableWidthOf(node)}%`;
    this.table.style.minWidth = `${widths.length * MIN_COL_PX}px`;
  }

  private syncColor(node: ProseMirrorNode) {
    if (node.attrs.color) this.dom.setAttribute("data-color", node.attrs.color);
    else this.dom.removeAttribute("data-color");
  }
}

/**
 * Saves `px` as the `colwidth` of every cell in the table, so each column
 * carries the same width in every row (what prosemirror-tables itself does).
 * `tableStart` is the position just inside the table node. Only attributes
 * change, so positions don't shift and several tables can be edited in one
 * transaction.
 */
export function writeColumnWidths(
  tr: Transaction,
  table: ProseMirrorNode,
  tableStart: number,
  px: number[],
): Transaction {
  const map = TableMap.get(table);
  const seen = new Set<number>();
  for (const pos of map.map) {
    if (seen.has(pos)) continue; // merged cells appear several times in the map
    seen.add(pos);
    const cell = table.nodeAt(pos);
    if (!cell) continue;
    const col = map.colCount(pos);
    const colwidth = px.slice(col, col + cell.attrs.colspan);
    tr.setNodeMarkup(tableStart + pos, null, { ...cell.attrs, colwidth });
  }
  return tr;
}

// ─────────────────────────────────────────────────────────────────────
// Drag-start normalizer
// ─────────────────────────────────────────────────────────────────────
// prosemirror-tables starts a drag from the column's SAVED px width. Now that
// columns are drawn as percentages, the saved px usually differs from what is
// on screen, so the column would jump the moment you touch the border.
// Right before a drag starts we rewrite every column's saved width to what
// is actually rendered, so the drag begins exactly where the finger is.
// (Not added to undo history, so Undo only undoes the real resize.)
function normalizeColumnsForDrag(view: EditorView, cellMinWidth: number) {
  const resize = columnResizingPluginKey.getState(view.state);
  if (!resize || resize.activeHandle < 0 || resize.dragging) return;

  const $cell = view.state.doc.resolve(resize.activeHandle);
  const table = $cell.node(-1);
  if (!table || table.type.spec.tableRole !== "table") return;
  const start = $cell.start(-1);

  let dom: Node | null = view.domAtPos(start).node;
  while (dom && dom.nodeName !== "TABLE") dom = dom.parentNode;
  if (!dom) return;
  const renderedWidth = (dom as HTMLElement).getBoundingClientRect().width;
  if (!renderedWidth) return;

  const { widths, allKnown } = readColumns(table, cellMinWidth);
  const total = widths.reduce((a, b) => a + b, 0);
  if (!total) return;
  // Already in sync with the screen: nothing to do.
  if (allKnown && Math.abs(total - renderedWidth) < 1.5) return;

  const px = widths.map((w) =>
    Math.max(cellMinWidth, Math.round((w / total) * renderedWidth)),
  );

  const tr = writeColumnWidths(view.state.tr, table, start, px);
  tr.setMeta("addToHistory", false);
  view.dispatch(tr);
}

export const NovaTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      View: NovaTableView,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      // Preferred width of the whole table, in percent (10–100).
      // Rendered by NovaTableView / renderHTML below, so it is not an HTML attr.
      tableWidth: {
        default: 100,
        parseHTML: (element) => {
          const m = /^(\d+(?:\.\d+)?)%$/.exec(element.style.width.trim());
          return m ? clampTableWidth(parseFloat(m[1])) : 100;
        },
        renderHTML: () => ({}),
      },
      color: {
        default: null,
        parseHTML: (element) => {
          const wrapper = element.closest(".tableWrapper");
          return (
            wrapper?.getAttribute("data-color") ||
            element.getAttribute("data-color")
          );
        },
        renderHTML: (attrs) => {
          if (!attrs.color) return {};
          return { "data-color": attrs.color };
        },
      },
    };
  },

  // Our plugin goes FIRST so it runs before columnResizing's own mousedown
  // handler (touch drags arrive here too: TableTouchResize replays them as
  // mousedown).
  addProseMirrorPlugins() {
    const cellMinWidth = this.options.cellMinWidth;
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown: (view) => {
              normalizeColumnsForDrag(view, cellMinWidth);
              return false; // never swallow the event
            },
          },
        },
      }),
      ...(this.parent?.() ?? []),
    ];
  },

  // Used by getHTML() (lecture view + print). Same percentages as the editor.
  renderHTML({ node, HTMLAttributes }) {
    const { "data-color": dataColor, ...tableAttributes } = HTMLAttributes;
    const { widths } = readColumns(node, this.options.cellMinWidth);
    const colgroup = [
      "colgroup",
      {},
      ...toPercents(widths).map((pct) => ["col", { style: `width: ${pct}` }]),
    ];

    const style = `width: ${tableWidthOf(node)}%; min-width: ${widths.length * MIN_COL_PX}px`;

    return [
      "div",
      {
        class: "tableWrapper scroll-container",
        "data-color": dataColor || null,
      },
      [
        "table",
        { ...this.options.HTMLAttributes, ...tableAttributes, style },
        colgroup,
        ["tbody", 0],
      ],
    ];
  },
});