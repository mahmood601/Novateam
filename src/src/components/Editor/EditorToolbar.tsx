// EditorToolbar.tsx
// شريط أدوات سفلي فوق لوحة مفاتيح الأندرويد + مستويات عناوين 1–6 + ألوان دورية

import { For, createSignal, onMount, onCleanup, Show } from "solid-js";
import type { Editor } from "@tiptap/core";
import {
  HEADING_COLOR_CYCLE,
  type HeadingLevel,
} from "./extensions/NovaHeading";

interface EditorToolbarProps {
  editor: () => Editor | undefined;
}

type Panel = "none" | "headings" | "boxes";

export default function EditorToolbar(props: EditorToolbarProps) {
  const [panel, setPanel] = createSignal<Panel>("none");
  let wrapEl: HTMLDivElement | undefined;

  const run = (fn: (editor: Editor) => void) => {
    const ed = props.editor();
    if (ed) fn(ed);
  };

  const isActive = (name: string, attrs?: Record<string, unknown>) => {
    const ed = props.editor();
    return ed?.isActive(name, attrs) ?? false;
  };

  // ——— وضع الشريط فوق لوحة المفاتيح عبر visualViewport ———
  onMount(() => {
    const vv = window.visualViewport;
    if (!vv || !wrapEl) return;

    const syncPosition = () => {
      if (!wrapEl) return;
      const keyboardOffset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );
      wrapEl.style.bottom = `${keyboardOffset}px`;
    };

    vv.addEventListener("resize", syncPosition);
    vv.addEventListener("scroll", syncPosition);
    window.addEventListener("resize", syncPosition);
    syncPosition();

    onCleanup(() => {
      vv.removeEventListener("resize", syncPosition);
      vv.removeEventListener("scroll", syncPosition);
      window.removeEventListener("resize", syncPosition);
    });
  });

  const togglePanel = (p: Panel) => {
    setPanel((cur) => (cur === p ? "none" : p));
  };

  /** تطبيق عنوان مع الألوان الدورية */
  const applyHeading = (level: HeadingLevel) => {
    run((e) => {
      const cmds = e.commands as any;
      if (cmds.toggleNovaHeading) {
        cmds.toggleNovaHeading(level);
      } else if (cmds.insertNovaHeading) {
        cmds.insertNovaHeading(level);
      } else {
        // fallback للأمر الرسمي
        e.chain().focus().toggleHeading({ level }).run();
      }
    });
    setPanel("none");
  };

  return (
    <div class="nova-toolbar-wrap" ref={(el) => (wrapEl = el)}>
      {/* الصف الرئيسي */}
      <div class="nova-toolbar" role="toolbar" aria-label="أدوات التنسيق">
        <button
          class={`nova-tb-btn ${isActive("bold") ? "is-active" : ""}`}
          onClick={() => run((e) => e.chain().focus().toggleBold().run())}
          aria-label="عريض"
          aria-pressed={isActive("bold")}
        >
          <b>B</b>
        </button>

        <button
          class={`nova-tb-btn ${isActive("italic") ? "is-active" : ""}`}
          onClick={() => run((e) => e.chain().focus().toggleItalic().run())}
          aria-label="مائل"
          aria-pressed={isActive("italic")}
        >
          <i>I</i>
        </button>

        <button
          class={`nova-tb-btn ${isActive("underline") ? "is-active" : ""}`}
          onClick={() =>
            run((e) => e.chain().focus().toggleUnderline?.().run())
          }
          aria-label="تحت الخط"
          aria-pressed={isActive("underline")}
        >
          <u>U</u>
        </button>

        <div class="nova-tb-sep" />

        {/* عناوين — يفتح لوحة المستويات */}
        <button
          class={`nova-tb-btn nova-tb-wide ${panel() === "headings" ? "is-active" : ""}`}
          onClick={() => togglePanel("headings")}
          aria-label="عناوين"
          aria-expanded={panel() === "headings"}
        >
          عنوان
        </button>

        {/* صناديق ملاحظة */}
        <button
          class={`nova-tb-btn nova-tb-wide ${panel() === "boxes" ? "is-active" : ""}`}
          onClick={() => togglePanel("boxes")}
          aria-label="صندوق ملاحظة"
          aria-expanded={panel() === "boxes"}
        >
          صندوق
        </button>

        <div class="nova-tb-sep" />

        <button
          class={`nova-tb-btn ${isActive("bulletList") ? "is-active" : ""}`}
          onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}
          aria-label="قائمة نقطية"
          aria-pressed={isActive("bulletList")}
        >
          ≡
        </button>

        <button
          class="nova-tb-btn"
          onClick={() => run((e) => e.chain().focus().undo().run())}
          aria-label="تراجع"
        >
          ↶
        </button>

        <button
          class="nova-tb-btn"
          onClick={() => run((e) => e.chain().focus().redo().run())}
          aria-label="إعادة"
        >
          ↷
        </button>
      </div>

      {/* لوحة مستويات العناوين H1–H6 */}
      <Show when={panel() === "headings"}>
        <div class="nova-toolbar-panel" role="group" aria-label="مستوى العنوان">
          <For each={[1, 2, 3, 4, 5, 6] as HeadingLevel[]}>
            {(level) => (
              <button
                class={`nova-level-btn ${isActive("heading", { level }) ? "is-active" : ""}`}
                onClick={() => applyHeading(level)}
                aria-label={`عنوان مستوى ${level}`}
                aria-pressed={isActive("heading", { level })}
              >
                H{level}
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* لوحة ألوان الصناديق */}
      <Show when={panel() === "boxes"}>
        <div class="nova-toolbar-panel" role="group" aria-label="لون الصندوق">
          <For each={[...HEADING_COLOR_CYCLE]}>
            {(color) => (
              <button
                class="nova-color-swatch"
                data-color={color}
                aria-label={`صندوق ${color}`}
                onClick={() => {
                  run((e) => {
                    if ((e.commands as any).setInfoBox) {
                      (e.commands as any).setInfoBox(color);
                    }
                  });
                  setPanel("none");
                }}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
