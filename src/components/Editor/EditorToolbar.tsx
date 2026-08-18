// EditorToolbar.tsx
// شريط أدوات تنسيق مخصص للهاتف: أزرار كبيرة (44px+ لسهولة اللمس)،
// قابل للتمرير أفقياً بدل ما يتكسر لأسطر متعددة، ثابت (sticky) فوق
// المحرر أثناء التمرير — نفس منطق شريط أدوات Word/Docs بالموبايل.

import { For, createSignal } from "solid-js";
import type { Editor } from "@tiptap/core";
import { HEADING_COLOR_CYCLE } from "./extensions/NovaHeading";

interface EditorToolbarProps {
  editor: () => Editor | undefined;
}

export default function EditorToolbar(props: EditorToolbarProps) {
  const [showColorPicker, setShowColorPicker] = createSignal(false);

  const run = (fn: (editor: Editor) => void) => {
    const ed = props.editor();
    if (ed) fn(ed);
  };

  return (
    <div class="nova-toolbar-wrap">
      <div class="nova-toolbar">
        {/* تنسيق نص أساسي */}
        <button
          class="nova-tb-btn"
          onClick={() => run((e) => e.chain().focus().toggleBold().run())}
          aria-label="عريض"
        >
          <b>B</b>
        </button>
        <button
          class="nova-tb-btn"
          onClick={() => run((e) => e.chain().focus().toggleItalic().run())}
          aria-label="مائل"
        >
          <i>I</i>
        </button>
        <button
          class="nova-tb-btn"
          onClick={() => run((e) => e.chain().focus().toggleUnderline?.().run())}
          aria-label="تحت الخط"
        >
          <u>U</u>
        </button>

        <div class="nova-tb-sep" />

        {/* عنوان رئيسي — يأخذ اللون التالي بالدورة تلقائياً */}
        <button
          class="nova-tb-btn nova-tb-wide"
          onClick={() => run((e) => (e.commands as any).insertNovaHeading("main"))}
        >
          + عنوان رئيسي
        </button>

        {/* عنوان فرعي — يرث لون آخر عنوان رئيسي */}
        <button
          class="nova-tb-btn nova-tb-wide"
          onClick={() => run((e) => (e.commands as any).insertNovaHeading("sub"))}
        >
          + عنوان فرعي
        </button>

        <div class="nova-tb-sep" />

        {/* صندوق ملاحظة (InfoBox) — منتقي لون بسيط بضغطة مطولة أو زر ثاني */}
        <button
          class="nova-tb-btn nova-tb-wide"
          onClick={() => setShowColorPicker(!showColorPicker())}
        >
          + صندوق ملاحظة
        </button>

        <div class="nova-tb-sep" />

        <button
          class="nova-tb-btn"
          onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}
          aria-label="قائمة نقطية"
        >
          •≡
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

      {/* شريط ثاني لاختيار لون الصندوق يظهر عند الحاجة فقط،
          بدل تحميل الشريط الأساسي بكل الألوان دايماً */}
      {showColorPicker() && (
        <div class="nova-toolbar nova-color-row">
          <For each={HEADING_COLOR_CYCLE}>
            {(color) => (
              <button
                class="nova-color-swatch"
                data-color={color}
                onClick={() => {
                  run((e) =>
                    (e.commands as any).setInfoBox
                      ? (e.commands as any).setInfoBox(color)
                      : undefined
                  );
                  setShowColorPicker(false);
                }}
              />
            )}
          </For>
        </div>
      )}
    </div>
  );
}
