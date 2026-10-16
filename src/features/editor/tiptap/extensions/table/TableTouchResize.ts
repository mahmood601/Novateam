// prosemirror-tables' column resizing only listens to mouse events, so
// dragging a column border with a finger does nothing on phones. This
// plugin bridges touch to it: a touch that starts on a column border is
// replayed as mousemove/mousedown, and the finger's movement is replayed
// as window mousemove/mouseup — exactly what the resize code listens for.

import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { columnResizingPluginKey } from "@tiptap/pm/tables";

export const TableTouchResize = Extension.create({
  name: "tableTouchResize",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            touchstart: (view, event) => {
              const e = event as TouchEvent;
              if (!view.editable || e.touches.length !== 1) return false;

              const target = e.target as HTMLElement | null;
              if (!target?.closest?.("td, th")) return false;

              const t = e.touches[0];
              const init = (type: string, x: number, y: number, buttons: number) =>
                new MouseEvent(type, {
                  bubbles: true,
                  cancelable: true,
                  button: 0,
                  buttons,
                  clientX: x,
                  clientY: y,
                  view: window,
                });

              // Let the plugin work out whether the touch is on a border.
              target.dispatchEvent(init("mousemove", t.clientX, t.clientY, 0));
              const state = columnResizingPluginKey.getState(view.state);
              if (!state || state.activeHandle < 0) return false;

              // On a border: take over (stops page scroll + caret placement).
              e.preventDefault();
              target.dispatchEvent(init("mousedown", t.clientX, t.clientY, 1));

              const onMove = (ev: TouchEvent) => {
                ev.preventDefault();
                const p = ev.touches[0];
                if (p) window.dispatchEvent(init("mousemove", p.clientX, p.clientY, 1));
              };
              const onEnd = (ev: TouchEvent) => {
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onEnd);
                window.removeEventListener("touchcancel", onEnd);
                const p = ev.changedTouches[0] ?? t;
                window.dispatchEvent(init("mouseup", p.clientX, p.clientY, 0));
              };
              window.addEventListener("touchmove", onMove, { passive: false });
              window.addEventListener("touchend", onEnd);
              window.addEventListener("touchcancel", onEnd);
              return true;
            },
          },
        },
      }),
    ];
  },
});
