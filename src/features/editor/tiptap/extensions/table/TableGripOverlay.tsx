// Floating grip handles rendered alongside whatever table currently has
// the selection. Built on the Pointer Events API so the same code path
// drives mouse hover/drag *and* a finger drag on Android — there's no
// separate touchstart/touchmove branch to keep in sync.
//
// - Tap a grip  -> select that whole row/column (CellSelection), which
//   lights up the existing `.selectedCell` overlay styling in editor.css.
// - Drag a grip -> reorder that row/column, live-highlighting the drop
//   target grip as you move.
// - Trailing "+" grips append a row/column at the end.
//
// Reordering is disabled (grips still select, but don't drag) whenever
// the table contains merged cells, since a naive slice/splice of rows or
// per-row cell arrays would desync a rowspan/colspan grid.

import { GripHorizontal, GripVertical, Plus } from "lucide-solid";
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { Editor } from "@tiptap/core";

import {
  appendColumn,
  appendRow,
  canReorderTable,
  findTable,
  moveColumn,
  moveRow,
  selectTableColumn,
  selectTableRow,
} from "./tableTransforms";

const GRIP_SIZE = 22;
const DRAG_THRESHOLD = 6;

function resolveTableElement(dom: Node | null | undefined): HTMLTableElement | null {
  if (!dom) return null;
  const el = dom as HTMLElement;
  if (el.tagName === "TABLE") return el as HTMLTableElement;
  if (typeof el.querySelector === "function") {
    const found = el.querySelector("table");
    if (found) return found as HTMLTableElement;
  }
  return null;
}

export default function TableGripOverlay(props: {
  editor: () => Editor | undefined;
  tick: () => number;
  visible: () => boolean;
}) {
  const [tableRect, setTableRect] = createSignal<DOMRect | null>(null);
  const [rowRects, setRowRects] = createSignal<DOMRect[]>([]);
  const [colRects, setColRects] = createSignal<DOMRect[]>([]);
  const [reorderable, setReorderable] = createSignal(false);

  const [dragAxis, setDragAxis] = createSignal<"row" | "col" | null>(null);
  const [dragFrom, setDragFrom] = createSignal<number | null>(null);
  const [dragTo, setDragTo] = createSignal<number | null>(null);

  let activeCleanup: (() => void) | null = null;

  const recompute = () => {
    const ed = props.editor();
    if (!ed || !ed.isActive("table")) {
      setTableRect(null);
      setRowRects([]);
      setColRects([]);
      return;
    }

    const table = findTable(ed);
    if (!table) {
      setTableRect(null);
      setRowRects([]);
      setColRects([]);
      return;
    }

    const tableEl = resolveTableElement(ed.view.nodeDOM(table.pos));
    if (!tableEl) {
      setTableRect(null);
      setRowRects([]);
      setColRects([]);
      return;
    }

    setReorderable(canReorderTable(ed));
    setTableRect(tableEl.getBoundingClientRect());
    setRowRects(Array.from(tableEl.rows).map((r) => r.getBoundingClientRect()));
    const refRow = tableEl.rows[0];
    setColRects(refRow ? Array.from(refRow.cells).map((c) => c.getBoundingClientRect()) : []);
  };

  createEffect(() => {
    props.tick();
    recompute();
  });

  onMount(() => {
    const onScrollOrResize = () => recompute();
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    onCleanup(() => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      activeCleanup?.();
    });
  });

  const startDrag = (e: PointerEvent, axis: "row" | "col", index: number) => {
    e.preventDefault();
    activeCleanup?.();

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    setDragAxis(axis);
    setDragFrom(index);
    setDragTo(index);

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD) {
        moved = true;
      }
      if (!moved) return;

      const rects = axis === "row" ? rowRects() : colRects();
      if (!rects.length) return;
      const point = axis === "row" ? ev.clientY : ev.clientX;

      let nearest = 0;
      let nearestDist = Infinity;
      rects.forEach((r, i) => {
        const center = axis === "row" ? r.top + r.height / 2 : r.left + r.width / 2;
        const dist = Math.abs(point - center);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = i;
        }
      });
      setDragTo(nearest);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      activeCleanup = null;

      const from = dragFrom();
      const to = dragTo();
      setDragAxis(null);
      setDragFrom(null);
      setDragTo(null);

      const ed = props.editor();
      if (!ed) return;

      if (moved && from !== null && to !== null && from !== to && reorderable()) {
        if (axis === "row") moveRow(ed, from, to);
        else moveColumn(ed, from, to);
      } else if (!moved && from !== null) {
        if (axis === "row") selectTableRow(ed, from);
        else selectTableColumn(ed, from);
      }
      recompute();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    activeCleanup = onUp;
  };

  const gripStyle = (highlighted: boolean) => ({
    position: "fixed" as const,
    width: `${GRIP_SIZE}px`,
    height: `${GRIP_SIZE}px`,
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    "touch-action": "none",
    "border-radius": "6px",
    "background-color": highlighted
      ? "var(--color-main)"
      : "var(--editor-chrome-bg)",
    color: highlighted ? "white" : "var(--editor-chrome-icon)",
    border: "1px solid var(--editor-chrome-border)",
    "z-index": "30",
    cursor: "grab",
  });

  return (
    <Show when={props.visible() && tableRect()}>
      {/* Row grips: one per row, pinned just left of the table, vertically centered on the row */}
      <For each={rowRects()}>
        {(rect, i) => (
          <button
            type="button"
            class="nova-table-grip"
            title="اسحب لإعادة ترتيب الصف، اضغط لتحديده"
            style={{
              ...gripStyle(dragAxis() === "row" && dragTo() === i()),
              top: `${rect.top + rect.height / 2 - GRIP_SIZE / 2}px`,
              left: `${Math.max(2, tableRect()!.left - GRIP_SIZE - 6)}px`,
            }}
            onPointerDown={(e) => startDrag(e, "row", i())}
          >
            <GripVertical size={14} />
          </button>
        )}
      </For>

      {/* Column grips: one per column, pinned just above the table, horizontally centered on the column */}
      <For each={colRects()}>
        {(rect, i) => (
          <button
            type="button"
            class="nova-table-grip"
            title="اسحب لإعادة ترتيب العمود، اضغط لتحديده"
            style={{
              ...gripStyle(dragAxis() === "col" && dragTo() === i()),
              top: `${Math.max(2, tableRect()!.top - GRIP_SIZE - 6)}px`,
              left: `${rect.left + rect.width / 2 - GRIP_SIZE / 2}px`,
            }}
            onPointerDown={(e) => startDrag(e, "col", i())}
          >
            <GripHorizontal size={14} />
          </button>
        )}
      </For>

      {/* Trailing "+" grips to append a row / column */}
      <button
        type="button"
        class="nova-table-grip"
        title="إضافة صف"
        style={{
          ...gripStyle(false),
          top: `${tableRect()!.bottom + 6}px`,
          left: `${Math.max(2, tableRect()!.left)}px`,
        }}
        onClick={() => {
          const ed = props.editor();
          if (ed) {
            appendRow(ed);
            recompute();
          }
        }}
      >
        <Plus size={14} />
      </button>

      <button
        type="button"
        class="nova-table-grip"
        title="إضافة عمود"
        style={{
          ...gripStyle(false),
          top: `${Math.max(2, tableRect()!.top) + 5}px`,
          left: `${tableRect()!.right - 8 }px`,
        }}
        onClick={() => {
          const ed = props.editor();
          if (ed) {
            appendColumn(ed);
            recompute();
          }
        }}
      >
        <Plus size={14} />
      </button>
    </Show>
  );
}
