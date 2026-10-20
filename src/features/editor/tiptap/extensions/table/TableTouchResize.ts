// Column resizing for BOTH finger and mouse, behaving like MS Word:
//
//  • Grab a column border and drag: the border stays under your pointer.
//  • The table keeps its width (100 % or whatever % you set). Only the two
//    columns beside the border change: one gains exactly what the other loses.
//  • A guide line + knob shows where the border will land while you drag.
//  • The document is only touched when you let go, as ONE undo step.
//  • Esc (mouse) / a second finger (touch) cancels and restores everything.
//  • A plain tap/click near a border still just puts the caret there.
//
// Why this replaces prosemirror-tables' own column resizing:
//  1. During a mouse drag it writes `table.style.width = <px>` and only
//     snaps back to 100 % afterwards — the "table width jumps, then returns"
//     glitch. Here the table element is never resized during a drag.
//  2. Its math is left-to-right only (width += dx); this editor is RTL, so
//     the border moved the wrong way / wrong column. Everything here comes
//     from on-screen geometry, so it is direction-agnostic.
//  3. prosemirror-view registers `touchstart` as PASSIVE, so preventDefault()
//     there can't stop the page from scrolling. We attach our own non-passive
//     listener.
//
// (extensionsArr.ts sets handleWidth: 0 so the library's resize never starts.)

import { Extension } from "@tiptap/core";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { TableMap, cellAround } from "@tiptap/pm/tables";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { MIN_COL_PX, readColumns, writeColumnWidths } from "./novaTable";
import {
  pickBorder,
  resizeBorder,
  toInlineDelta,
  toScreenShift,
  type BorderHit,
} from "./tableResizeMath";

/** Grab zone either side of a border, in screen px. */
const TOUCH_ZONE_PX = 14;
const MOUSE_ZONE_PX = 6;
/** Movement below this counts as a tap/click, not a drag. */
const TAP_SLOP_PX = 4;

type Located = {
  hit: BorderHit;
  tableEl: HTMLTableElement;
  table: PMNode;
  tablePos: number;
  rtl: boolean;
};

/** Is (x, y) on a column border of the table under `target`? */
function locateBorder(
  view: EditorView,
  target: EventTarget | null,
  x: number,
  zone: number,
): Located | null {
  const cellEl = (target as HTMLElement | null)?.closest?.(
    "td, th",
  ) as HTMLElement | null;
  const tableEl = cellEl?.closest("table") as HTMLTableElement | null;
  if (!cellEl || !tableEl || !view.dom.contains(cellEl)) return null;

  let $cell;
  try {
    $cell = cellAround(view.state.doc.resolve(view.posAtDOM(cellEl, 0)));
  } catch {
    return null;
  }
  if (!$cell?.nodeAfter) return null;

  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const rtl = getComputedStyle(tableEl).direction === "rtl";
  const r = cellEl.getBoundingClientRect();

  const hit = pickBorder({
    touchX: x,
    rectLeft: r.left,
    rectRight: r.right,
    firstCol: map.colCount($cell.pos - $cell.start(-1)),
    colspan: $cell.nodeAfter.attrs.colspan ?? 1,
    colCount: map.width,
    rtl,
    zone,
  });
  if (!hit) return null;
  return { hit, tableEl, table, tablePos: $cell.before(-1), rtl };
}

type Drag = {
  move: (x: number, y: number) => void;
  end: () => void;
  cancel: () => void;
};

/** Starts a drag at (x, y). Pointer-agnostic: callers feed it move/end/cancel. */
function beginDrag(
  view: EditorView,
  loc: Located,
  x: number,
  y: number,
  cellMinWidth: number,
): Drag {
  const { hit, tableEl, table, tablePos, rtl } = loc;

  // Widths as currently DRAWN, in layout px. (Columns are drawn from
  // percentages, so derive them exactly as novaTable.ts does.)
  const layoutW = tableEl.offsetWidth || 1;
  const rect = tableEl.getBoundingClientRect();
  const scale = rect.width / layoutW || 1; // ≠ 1 under CSS zoom/transform
  const proportions = readColumns(table, cellMinWidth).widths;
  const propSum = proportions.reduce((a, b) => a + b, 0) || 1;
  const start = proportions.map((w) => (w / propSum) * layoutW);
  const minPx = Math.min(MIN_COL_PX, layoutW / start.length);

  const cols = Array.from(
    tableEl.querySelectorAll(":scope > colgroup > col"),
  ) as HTMLElement[];
  const original = cols.map((c) => c.style.width);

  const guide = document.createElement("div");
  guide.className = "nova-col-guide";
  guide.style.top = `${rect.top}px`;
  guide.style.height = `${rect.height}px`;
  guide.style.setProperty("--knob-y", `${y - rect.top}px`);
  guide.style.transform = `translateX(${hit.x}px)`;
  document.body.appendChild(guide);

  let current = start;
  let moved = false;

  // Only the two columns beside the border are touched; the table element
  // itself (width, min-width) is never changed during the drag.
  const draw = (w: number[]) => {
    for (const i of [hit.border - 1, hit.border]) {
      if (cols[i]) cols[i].style.width = `${((w[i] / layoutW) * 100).toFixed(3)}%`;
    }
  };
  const restore = () => cols.forEach((c, i) => (c.style.width = original[i]));

  return {
    move(px, py) {
      if (
        !moved &&
        Math.abs(px - x) < TAP_SLOP_PX &&
        Math.abs(py - y) < TAP_SLOP_PX
      )
        return;
      moved = true;
      const r = resizeBorder(start, hit.border, toInlineDelta(px - x, scale, rtl), minPx);
      current = r.widths;
      draw(current);
      guide.style.transform = `translateX(${hit.x + toScreenShift(r.delta, scale, rtl)}px)`;
      guide.style.setProperty("--knob-y", `${py - rect.top}px`);
    },

    cancel() {
      guide.remove();
      restore();
    },

    end() {
      guide.remove();

      if (!moved) {
        // A tap/click: we swallowed the event, so place the caret ourselves.
        restore();
        const at = view.posAtCoords({ left: x, top: y });
        if (at) {
          const sel = TextSelection.near(view.state.doc.resolve(at.pos));
          view.dispatch(view.state.tr.setSelection(sel));
        }
        view.focus();
        return;
      }

      const changed = current.some((w, i) => Math.abs(w - start[i]) > 0.5);
      const node = view.state.doc.nodeAt(tablePos);
      if (!changed || !node || node.type !== table.type) {
        restore();
        return;
      }
      // ONE transaction → ONE undo step. Saved widths = what's on screen, so
      // the re-render lands exactly where the pointer left the border.
      const px = current.map((w) => Math.max(1, Math.round(w)));
      view.dispatch(writeColumnWidths(view.state.tr, node, tablePos + 1, px));
    },
  };
}

export const TableTouchResize = Extension.create({
  name: "tableTouchResize",

  addProseMirrorPlugins() {
    const tableExt = this.editor.extensionManager.extensions.find(
      (e) => e.name === "table",
    );
    const cellMinWidth: number = tableExt?.options?.cellMinWidth ?? 40;

    return [
      new Plugin({
        view(view) {
          const dom = view.dom;

          // ── Finger ────────────────────────────────────────────────────
          const onTouchStart = (e: TouchEvent) => {
            if (!view.editable || e.touches.length !== 1) return;
            const t = e.touches[0];
            const loc = locateBorder(view, e.target, t.clientX, TOUCH_ZONE_PX);
            if (!loc) return; // not on a border → normal tap / scroll / caret

            e.preventDefault(); // effective: this listener is non-passive
            const drag = beginDrag(view, loc, t.clientX, t.clientY, cellMinWidth);
            const el = e.target as HTMLElement;

            const find = (list: TouchList) =>
              Array.from(list).find((p) => p.identifier === t.identifier);
            const unbind = () => {
              el.removeEventListener("touchmove", onMove);
              el.removeEventListener("touchend", onEnd);
              el.removeEventListener("touchcancel", onCancel);
            };
            const onMove = (ev: TouchEvent) => {
              if (ev.touches.length > 1) return onCancel(); // 2nd finger
              const p = find(ev.touches);
              if (!p) return;
              ev.preventDefault();
              drag.move(p.clientX, p.clientY);
            };
            const onEnd = (ev: TouchEvent) => {
              ev.preventDefault();
              unbind();
              drag.end();
            };
            const onCancel = () => {
              unbind();
              drag.cancel();
            };
            // Touch events always return to the element where the touch began.
            el.addEventListener("touchmove", onMove, { passive: false });
            el.addEventListener("touchend", onEnd, { passive: false });
            el.addEventListener("touchcancel", onCancel);
          };

          // ── Mouse ─────────────────────────────────────────────────────
          const onMouseDown = (e: MouseEvent) => {
            if (!view.editable || e.button !== 0) return;
            // Touch-generated compatibility events are handled above.
            if ((e as any).sourceCapabilities?.firesTouchEvents) return;
            const loc = locateBorder(view, e.target, e.clientX, MOUSE_ZONE_PX);
            if (!loc) return;

            // Capture phase + stop: prosemirror-view must not see this click.
            e.preventDefault();
            e.stopImmediatePropagation();
            const drag = beginDrag(view, loc, e.clientX, e.clientY, cellMinWidth);

            const unbind = () => {
              window.removeEventListener("mousemove", onMove, true);
              window.removeEventListener("mouseup", onUp, true);
              window.removeEventListener("keydown", onKey, true);
            };
            const onMove = (ev: MouseEvent) => {
              if (!(ev.buttons & 1)) return onUp(); // released outside the window
              drag.move(ev.clientX, ev.clientY);
            };
            const onUp = () => {
              unbind();
              drag.end();
            };
            const onKey = (ev: KeyboardEvent) => {
              if (ev.key !== "Escape") return;
              unbind();
              drag.cancel();
            };
            window.addEventListener("mousemove", onMove, true);
            window.addEventListener("mouseup", onUp, true);
            window.addEventListener("keydown", onKey, true);
          };

          // Hover: show the col-resize cursor over a border (mouse only).
          const onHover = (e: MouseEvent) => {
            if (e.buttons) return;
            const on =
              view.editable &&
              !!locateBorder(view, e.target, e.clientX, MOUSE_ZONE_PX);
            dom.classList.toggle("nova-col-resize-cursor", on);
          };
          const onLeave = () => dom.classList.remove("nova-col-resize-cursor");

          dom.addEventListener("touchstart", onTouchStart, {
            passive: false,
            capture: true,
          });
          dom.addEventListener("mousedown", onMouseDown, true);
          dom.addEventListener("mousemove", onHover);
          dom.addEventListener("mouseleave", onLeave);

          return {
            destroy() {
              dom.removeEventListener("touchstart", onTouchStart, true);
              dom.removeEventListener("mousedown", onMouseDown, true);
              dom.removeEventListener("mousemove", onHover);
              dom.removeEventListener("mouseleave", onLeave);
              dom.classList.remove("nova-col-resize-cursor");
            },
          };
        },
      }),
    ];
  },
});
