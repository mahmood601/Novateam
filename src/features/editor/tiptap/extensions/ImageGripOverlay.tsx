// Floating resize handles + a width bar for the selected image.
//
// Same idea (and same Pointer Events approach) as TableGripOverlay, so a
// finger and a mouse use ONE code path:
//
//  - Tap an image         -> it is selected: 6 handles + a width bar appear.
//  - Drag any handle      -> resize live. The image keeps its proportions and
//                            snaps to 25/50/75/100 %. Nothing is written to
//                            the document until you let go (ONE undo step).
//  - Width bar            -> type an exact %, use -/+ (5 % steps) or a preset.
//
// The saved value is `widthPct`: the image's width as a percentage of its
// container (the page's text column for a normal paragraph, the gallery's
// width for an image inside a gallery: the gallery only arranges its images). The same value
// is rendered by the reading view, the A4 preview and the print page, so
// "50 %" really prints as half of the page's text width.
//
// Handles are `position: fixed` buttons outside the document, so they are
// never saved or printed.

import { Minus, Plus, RotateCcw, Trash2 } from "lucide-solid";
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

import { IMAGE_MAX_PCT, IMAGE_MIN_PCT, clampImagePct } from "./ImageWithCaption";

type Handle = {
  id: string;
  /** -1 = left edge, 0 = middle, 1 = right edge (screen coordinates) */
  x: -1 | 0 | 1;
  /** -1 = top edge, 0 = middle, 1 = bottom edge */
  y: -1 | 0 | 1;
  cursor: string;
};

const HANDLES: Handle[] = [
  { id: "tl", x: -1, y: -1, cursor: "nwse-resize" },
  { id: "tr", x: 1, y: -1, cursor: "nesw-resize" },
  { id: "bl", x: -1, y: 1, cursor: "nesw-resize" },
  { id: "br", x: 1, y: 1, cursor: "nwse-resize" },
  { id: "l", x: -1, y: 0, cursor: "ew-resize" },
  { id: "r", x: 1, y: 0, cursor: "ew-resize" },
];

const PRESETS = [25, 50, 75, 100];
const SNAP = 2; // snap to a preset when within this many %
const BAR_W = 300;
const BAR_H = 104;

/** Nearest block-level ancestor: the box the image's % width is measured against. */
function containerOf(dom: HTMLElement): HTMLElement | null {
  let el = dom.parentElement;
  while (el && getComputedStyle(el).display.startsWith("inline")) el = el.parentElement;
  return el;
}

/** Content-box width of `el` in SCREEN pixels (padding removed, zoom included). */
function contentWidthOnScreen(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const border = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  return Math.max(1, rect.width - (pad + border) * scale);
}

export default function ImageGripOverlay(props: {
  editor: () => Editor | undefined;
  tick: () => number;
  visible: () => boolean;
}) {
  const [imgRect, setImgRect] = createSignal<DOMRect | null>(null);
  const [area, setArea] = createSignal<DOMRect | null>(null);
  const [pct, setPct] = createSignal<number | null>(null); // saved value (null = original size)
  const [measured, setMeasured] = createSignal(100); // what is drawn right now, in %
  const [dragging, setDragging] = createSignal(false);
  const [coarse, setCoarse] = createSignal(false);

  let activeCleanup: (() => void) | null = null;

  const clear = () => {
    setImgRect(null);
    setPct(null);
  };

  /** The selected image's node DOM, or null. */
  const selected = () => {
    const ed = props.editor();
    if (!ed) return null;
    const sel = ed.state.selection;
    if (!(sel instanceof NodeSelection) || sel.node.type.name !== "image") return null;
    const dom = ed.view.nodeDOM(sel.from) as HTMLElement | null;
    if (!dom || dom.nodeType !== 1) return null;
    const img = dom.tagName === "IMG" ? dom : dom.querySelector("img");
    if (!img) return null;
    return { ed, sel, dom, img: img as HTMLElement };
  };

  const measure = (dom: HTMLElement, img: HTMLElement) => {
    const parent = containerOf(dom);
    if (!parent) return;
    const w = img.getBoundingClientRect().width;
    setMeasured(clampImagePct((w / contentWidthOnScreen(parent)) * 100));
  };

  const recompute = () => {
    const s = selected();
    if (!s) return clear();
    setImgRect(s.img.getBoundingClientRect());
    setArea(
      (s.ed.view.dom.closest(".nova-tiptap-content") as HTMLElement | null)?.getBoundingClientRect() ??
        null,
    );
    setPct(s.sel.node.attrs.widthPct ?? null);
    measure(s.dom, s.img);
  };

  createEffect(() => {
    props.tick();
    recompute();
    // Once the image has loaded / the layout has settled.
    requestAnimationFrame(recompute);
  });

  onMount(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const onMq = () => setCoarse(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);

    const onScrollOrResize = () => recompute();
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    // Layout changes that are not transactions (image finished loading,
    // keyboard opened, sheet docked...).
    let ro: ResizeObserver | undefined;
    const ed = props.editor();
    if (ed && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => recompute());
      ro.observe(ed.view.dom);
    }

    onCleanup(() => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      ro?.disconnect();
      activeCleanup?.();
    });
  });

  // ── Commit ────────────────────────────────────────────────────────
  const commit = (value: number | null) => {
    const ed = props.editor();
    if (!ed) return;
    ed.commands.setImageWidthPct(value);
  };

  // ── Drag a handle ─────────────────────────────────────────────────
  const startDrag = (e: PointerEvent, h: Handle) => {
    const s = selected();
    if (!s) return;
    e.preventDefault();
    e.stopPropagation();
    activeCleanup?.();

    const parent = containerOf(s.dom);
    if (!parent) return;
    const containerW = contentWidthOnScreen(parent);

    const startRect = s.img.getBoundingClientRect();
    const startW = startRect.width;
    const aspect = startRect.height ? startRect.width / startRect.height : 1;
    const align = (s.sel.node.attrs.align as string | null) ?? null;
    // A centred image grows on BOTH sides, so its edge moves half as fast as
    // the width changes. Doubling keeps the edge under the finger.
    // Inside a gallery the row is centred too (space-evenly), same thing.
    const inGallery = s.sel.$from.parent.type.name === "imageGallery";
    const factor = align === "center" || inGallery ? 2 : 1;

    const startX = e.clientX;
    const startY = e.clientY;
    const originalWidthStyle = s.dom.style.width;
    const originalImgWidth = s.img.style.width;
    const originalImgHeight = s.img.style.height;
    let last: number | null = null;
    let moved = false;

    setDragging(true);

    const widthAt = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) * h.x;
      // Corners can also be dragged vertically; use whichever way the finger moved most.
      const dy = (ev.clientY - startY) * h.y * aspect;
      const d = h.y === 0 ? dx : h.x === 0 ? dy : Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      return startW + d * factor;
    };

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 3) return;
      moved = true;
      ev.preventDefault();

      let p = clampImagePct((widthAt(ev) / containerW) * 100);
      for (const preset of PRESETS) if (Math.abs(p - preset) <= SNAP) p = preset;
      if (p === last) return;
      last = p;

      // Live preview straight on the DOM (the node view's own update()
      // restores the saved value when the transaction lands).
      s.dom.style.width = `${p}%`;
      s.img.style.width = "100%"; // an old pixel-sized image must follow too
      s.img.style.height = "auto";
      const fresh = selected();
      if (fresh) {
        setImgRect(fresh.img.getBoundingClientRect());
        setMeasured(p);
      }
    };

    const finish = (apply: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      activeCleanup = null;
      setDragging(false);

      if (apply && moved && last !== null) commit(last);
      else {
        // cancelled / just a tap: put everything back
        s.dom.style.width = originalWidthStyle;
        s.img.style.width = originalImgWidth;
        s.img.style.height = originalImgHeight;
      }
      recompute();
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") finish(false);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    activeCleanup = () => finish(false);
  };

  // ── Layout of handles / bar ───────────────────────────────────────
  const HIT = () => (coarse() ? 40 : 24); // finger-sized hit area
  const DOT = () => (coarse() ? 16 : 11);

  // The image can be scrolled out of the writing area: then hide everything.
  const onScreen = () => {
    const r = imgRect();
    const a = area();
    if (!r) return false;
    if (!a) return true;
    return r.bottom > a.top + 8 && r.top < a.bottom - 8;
  };

  const handleStyle = (h: Handle, r: DOMRect) => {
    const cx = h.x === -1 ? r.left : h.x === 1 ? r.right : r.left + r.width / 2;
    const cy = h.y === -1 ? r.top : h.y === 1 ? r.bottom : r.top + r.height / 2;
    return {
      position: "fixed" as const,
      left: `${cx - HIT() / 2}px`,
      top: `${cy - HIT() / 2}px`,
      width: `${HIT()}px`,
      height: `${HIT()}px`,
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      "touch-action": "none",
      "z-index": "30",
      cursor: h.cursor,
      background: "transparent",
      border: "0",
      padding: "0",
    };
  };

  const barStyle = (r: DOMRect) => {
    const a = area();
    const vw = window.innerWidth;
    const w = Math.min(BAR_W, vw - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);

    const gap = HIT() / 2 + 6;
    let top = r.bottom + gap;
    const limitBottom = a ? a.bottom : window.innerHeight;
    if (top + BAR_H > limitBottom) {
      const above = r.top - gap - BAR_H;
      top = above >= (a?.top ?? 0) + 4 ? above : Math.max((a?.top ?? 0) + 4, limitBottom - BAR_H - 8);
    }
    return { left: `${left}px`, top: `${top}px`, width: `${w}px` };
  };

  const shown = () => (pct() ?? measured());

  const btn =
    "flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--editor-chrome-border)] bg-[var(--editor-chrome-bg)] text-[var(--editor-chrome-icon)] active:bg-[var(--color-main)] active:text-white";

  // Keep the editor's selection/focus when pressing bar buttons.
  const keepFocus = (e: MouseEvent) => e.preventDefault();

  return (
    <Show when={props.visible() && onScreen() && imgRect()}>
      {/* Resize handles */}
      <For each={HANDLES}>
        {(h) => (
          <button
            type="button"
            class="nova-img-handle"
            aria-label="تغيير حجم الصورة"
            style={handleStyle(h, imgRect()!)}
            onPointerDown={(e) => startDrag(e, h)}
          >
            <span
              class="nova-img-handle-dot"
              style={{ width: `${DOT()}px`, height: `${DOT()}px` }}
            />
          </button>
        )}
      </For>

      {/* Live % badge while dragging */}
      <Show when={dragging()}>
        <div
          class="nova-img-badge"
          style={{
            position: "fixed",
            left: `${imgRect()!.left + imgRect()!.width / 2}px`,
            top: `${imgRect()!.top + imgRect()!.height / 2}px`,
          }}
        >
          {shown()}%
        </div>
      </Show>

      {/* Width bar */}
      <div
        class="nova-img-bar"
        dir="rtl"
        style={{ position: "fixed", "z-index": "31", ...barStyle(imgRect()!) }}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest("input")) keepFocus(e);
        }}
      >
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class={btn}
            title="تصغير 5%"
            aria-label="تصغير الصورة"
            onClick={() => commit(clampImagePct(shown() - 5))}
          >
            <Minus size={18} />
          </button>

          <label class="nova-img-pct">
            <input
              type="number"
              inputmode="numeric"
              min={IMAGE_MIN_PCT}
              max={IMAGE_MAX_PCT}
              step="1"
              aria-label="عرض الصورة بالنسبة المئوية"
              value={shown()}
              onChange={(e) => {
                const n = parseFloat(e.currentTarget.value);
                if (Number.isFinite(n)) commit(clampImagePct(n));
                else e.currentTarget.value = String(shown());
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <span>%</span>
          </label>

          <button
            type="button"
            class={btn}
            title="تكبير 5%"
            aria-label="تكبير الصورة"
            onClick={() => commit(clampImagePct(shown() + 5))}
          >
            <Plus size={18} />
          </button>

          <button
            type="button"
            class={btn}
            title="الحجم الأصلي"
            aria-label="الحجم الأصلي"
            onClick={() => commit(null)}
          >
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            class={btn}
            title="حذف الصورة"
            aria-label="حذف الصورة"
            onClick={() => props.editor()?.chain().focus().deleteSelection().run()}
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div class="mt-1.5 flex items-center gap-1.5">
          <For each={PRESETS}>
            {(p) => (
              <button
                type="button"
                class="nova-img-preset"
                classList={{ active: pct() === p }}
                onClick={() => commit(p)}
              >
                {p}%
              </button>
            )}
          </For>
          <span class="nova-img-hint">من عرض الصفحة</span>
        </div>
      </div>
    </Show>
  );
}
