// Low-level table transforms built directly on ProseMirror, since
// @tiptap/extension-table doesn't ship row/column drag-reorder or
// duplicate commands out of the box. Every function here takes the
// live `Editor` instance, does its own bounds/safety checks, and
// dispatches a single transaction (or bails out returning `false`).
//
// Row/column *reordering* is intentionally refused for tables that
// contain merged cells (colspan/rowspan > 1): naively slicing rows or
// per-row cell arrays around a rowspan/colspan would desync the grid.
// Add/remove/duplicate/align/clear all remain safe and are never
// blocked, since they don't reorder existing geometry.

import type { Editor } from "@tiptap/core";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { CellSelection, TableMap } from "@tiptap/pm/tables";

export type TableLocation = { node: PMNode; pos: number };

/** Walk up from the current selection to find the enclosing table node. */
export function findTable(editor: Editor): TableLocation | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      return { node, pos: $from.before(depth) };
    }
  }
  return null;
}

/** True if any cell in the table spans more than one row or column. */
export function tableHasMergedCells(table: PMNode): boolean {
  let merged = false;
  table.descendants((node) => {
    if (merged) return false;
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      if ((node.attrs.colspan ?? 1) > 1 || (node.attrs.rowspan ?? 1) > 1) {
        merged = true;
      }
    }
    return true;
  });
  return merged;
}

/** Whether the table under the current selection can be safely drag-reordered. */
export function canReorderTable(editor: Editor): boolean {
  const table = findTable(editor);
  if (!table) return false;
  return !tableHasMergedCells(table.node);
}

function rowsOf(table: PMNode): PMNode[] {
  const rows: PMNode[] = [];
  table.forEach((row) => rows.push(row));
  return rows;
}

function replaceTable(editor: Editor, tablePos: number, table: PMNode, newTable: PMNode) {
  const tr = editor.state.tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}

/** Move row `from` to index `to` (0-based, within the same table). */
export function moveRow(editor: Editor, from: number, to: number): boolean {
  const table = findTable(editor);
  if (!table || from === to) return false;
  if (tableHasMergedCells(table.node)) return false;

  const rows = rowsOf(table.node);
  if (from < 0 || from >= rows.length || to < 0 || to >= rows.length) return false;

  const [moved] = rows.splice(from, 1);
  rows.splice(to, 0, moved);

  const newTable = table.node.type.create(
    table.node.attrs,
    Fragment.fromArray(rows),
    table.node.marks,
  );
  replaceTable(editor, table.pos, table.node, newTable);
  return true;
}

/** Move column `from` to index `to` (0-based, within the same table). */
export function moveColumn(editor: Editor, from: number, to: number): boolean {
  const table = findTable(editor);
  if (!table || from === to) return false;
  if (tableHasMergedCells(table.node)) return false;

  const rows = rowsOf(table.node);
  const newRows = rows.map((row) => {
    const cells: PMNode[] = [];
    row.forEach((cell) => cells.push(cell));
    if (from < 0 || from >= cells.length || to < 0 || to >= cells.length) return row;
    const [moved] = cells.splice(from, 1);
    cells.splice(to, 0, moved);
    return row.type.create(row.attrs, Fragment.fromArray(cells), row.marks);
  });

  const newTable = table.node.type.create(
    table.node.attrs,
    Fragment.fromArray(newRows),
    table.node.marks,
  );
  replaceTable(editor, table.pos, table.node, newTable);
  return true;
}

/** Insert a copy of row `index` directly below it. */
export function duplicateRow(editor: Editor, index: number): boolean {
  const table = findTable(editor);
  if (!table) return false;

  const rows = rowsOf(table.node);
  if (index < 0 || index >= rows.length) return false;

  const clone = rows[index].copy(rows[index].content);
  rows.splice(index + 1, 0, clone);

  const newTable = table.node.type.create(
    table.node.attrs,
    Fragment.fromArray(rows),
    table.node.marks,
  );
  replaceTable(editor, table.pos, table.node, newTable);
  return true;
}

/** Insert a copy of column `index` directly after it. */
export function duplicateColumn(editor: Editor, index: number): boolean {
  const table = findTable(editor);
  if (!table) return false;

  const rows = rowsOf(table.node);
  const newRows = rows.map((row) => {
    const cells: PMNode[] = [];
    row.forEach((cell) => cells.push(cell));
    if (index < 0 || index >= cells.length) return row;
    const clone = cells[index].copy(cells[index].content);
    cells.splice(index + 1, 0, clone);
    return row.type.create(row.attrs, Fragment.fromArray(cells), row.marks);
  });

  const newTable = table.node.type.create(
    table.node.attrs,
    Fragment.fromArray(newRows),
    table.node.marks,
  );
  replaceTable(editor, table.pos, table.node, newTable);
  return true;
}

/** Select an entire row as a CellSelection (drives the .selectedCell overlay CSS). */
export function selectTableRow(editor: Editor, index: number): boolean {
  const table = findTable(editor);
  if (!table) return false;
  const map = TableMap.get(table.node);
  if (index < 0 || index >= map.height) return false;

  const start = table.pos + 1;
  const $cell = editor.state.doc.resolve(start + map.map[index * map.width]);
  const selection = CellSelection.rowSelection($cell as any) as any;
  editor.view.dispatch(editor.state.tr.setSelection(selection));
  editor.view.focus();
  return true;
}

/** Select an entire column as a CellSelection (drives the .selectedCell overlay CSS). */
export function selectTableColumn(editor: Editor, index: number): boolean {
  const table = findTable(editor);
  if (!table) return false;
  const map = TableMap.get(table.node);
  if (index < 0 || index >= map.width) return false;

  const start = table.pos + 1;
  const $cell = editor.state.doc.resolve(start + map.map[index]);
  const selection = CellSelection.colSelection($cell as any) as any;
  editor.view.dispatch(editor.state.tr.setSelection(selection));
  editor.view.focus();
  return true;
}

/** Clear the text content of every selected cell without removing the cells themselves. */
export function clearSelectedCellsContent(editor: Editor): boolean {
  const { selection, schema } = editor.state;
  const paragraph = schema.nodes.paragraph;
  const emptyContent = paragraph ? Fragment.from(paragraph.create()) : Fragment.empty;
  let tr = editor.state.tr;
  let changed = false;

  const clearCell = (pos: number, node: PMNode) => {
    const from = tr.mapping.map(pos + 1);
    const to = tr.mapping.map(pos + node.nodeSize - 1);
    tr = tr.replaceWith(from, to, emptyContent);
    changed = true;
  };

  if (selection instanceof CellSelection) {
    const cells: { pos: number; node: PMNode }[] = [];
    selection.forEachCell((node, pos) => cells.push({ pos, node }));
    cells.forEach(({ pos, node }) => clearCell(pos, node));
  } else {
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        clearCell($from.before(depth), node);
        break;
      }
    }
  }

  if (!changed) return false;
  editor.view.dispatch(tr);
  return true;
}

/** Merge extra attrs (e.g. textAlign/verticalAlign) into every selected cell. */
export function setSelectedCellsAttrs(editor: Editor, attrs: Record<string, unknown>): boolean {
  const { selection } = editor.state;
  let tr = editor.state.tr;
  let changed = false;

  const applyTo = (pos: number, node: PMNode) => {
    tr = tr.setNodeMarkup(tr.mapping.map(pos), undefined, { ...node.attrs, ...attrs });
    changed = true;
  };

  if (selection instanceof CellSelection) {
    const cells: { pos: number; node: PMNode }[] = [];
    selection.forEachCell((node, pos) => cells.push({ pos, node }));
    cells.forEach(({ pos, node }) => applyTo(pos, node));
  } else {
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        applyTo($from.before(depth), node);
        break;
      }
    }
  }

  if (!changed) return false;
  editor.view.dispatch(tr);
  return true;
}

/** Row/col index (within the table) of the cell the selection is currently in. */
function currentCellRowCol(editor: Editor): { row: number; col: number } | null {
  const table = findTable(editor);
  if (!table) return null;
  const map = TableMap.get(table.node);
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      const relative = $from.before(depth) - (table.pos + 1);
      const rect = map.findCell(relative);
      return { row: rect.top, col: rect.left };
    }
  }
  return null;
}

/** Duplicate whichever row the current selection/cursor is in. */
export function duplicateCurrentRow(editor: Editor): boolean {
  const rc = currentCellRowCol(editor);
  if (!rc) return false;
  return duplicateRow(editor, rc.row);
}

/** Duplicate whichever column the current selection/cursor is in. */
export function duplicateCurrentColumn(editor: Editor): boolean {
  const rc = currentCellRowCol(editor);
  if (!rc) return false;
  return duplicateColumn(editor, rc.col);
}

/** Append a row at the end of the table (used by the overlay's trailing "+" grip). */
export function appendRow(editor: Editor): boolean {
  const table = findTable(editor);
  if (!table) return false;
  const rowCount = rowsOf(table.node).length;
  if (!selectTableRow(editor, rowCount - 1)) return false;
  return editor.chain().focus().addRowAfter().run();
}

/** Append a column at the end of the table (used by the overlay's trailing "+" grip). */
export function appendColumn(editor: Editor): boolean {
  const table = findTable(editor);
  if (!table) return false;
  const map = TableMap.get(table.node);
  if (!selectTableColumn(editor, map.width - 1)) return false;
  return editor.chain().focus().addColumnAfter().run();
}
