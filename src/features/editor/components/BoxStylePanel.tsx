// features/editor/components/BoxStylePanel.tsx
//
// Style editor for the currently selected NovaBox: a small set of preset
// fields (background, text color, padding, margin, flex controls) plus a
// raw "CSS متقدم" textarea for anything not covered by a preset. Both
// read/write the SAME underlying `style` string (see cssStyleString.ts)
// — there's no separate state to keep in sync.

import { createEffect, createSignal, For, Show } from "solid-js";
import type { Editor } from "@tiptap/core";
import { parseStyleString, withStyleProp } from "../lib/cssStyleString";

export default function BoxStylePanel(props: {
  editor: Editor | null;
  onClose: () => void;
}) {
  const [styleText, setStyleText] = createSignal("");

  // نحمّل ستايل الصندوق الحالي في كل مرة تنفتح فيها اللوحة (لو تغيّر
  // الصندوق المختار بين فتحة وأخرى)
  createEffect(() => {
    if ( !props.editor) return;
    const attrs = props.editor.getAttributes("novaBox");
    setStyleText((attrs.style as string) ?? "");
  });

  const parsed = () => parseStyleString(styleText());

  const commit = (next: string) => {
    setStyleText(next);
    props.editor?.chain().focus().updateBoxStyle(next).run();
  };

  const setProp = (prop: string, value: string) =>
    commit(withStyleProp(styleText(), prop, value));

  const isFlex = () => parsed()["display"] === "flex";

  return (

        <div
          dir="rtl"
          class="dark:bg-lighter-dark-1 w-full max-w-md rounded-t-3xl bg-white p-4 pb-6 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <p class="mb-3 text-sm font-bold dark:text-white">تنسيق الصندوق</p>

          {/* ألوان */}
          <div class="mb-3 grid grid-cols-2 gap-3">
            <Field label="لون الخلفية">
              <input
                type="color"
                value={toHex(parsed()["background-color"]) ?? "#ffffff"}
                onInput={(e) => setProp("background-color", e.currentTarget.value)}
                class="h-8 w-full rounded-lg"
              />
            </Field>
            <Field label="لون النص">
              <input
                type="color"
                value={toHex(parsed()["color"]) ?? "#000000"}
                onInput={(e) => setProp("color", e.currentTarget.value)}
                class="h-8 w-full rounded-lg"
              />
            </Field>
          </div>

          {/* مسافات */}
          <div class="mb-3 grid grid-cols-2 gap-3">
            <Field label="Padding">
              <input
                type="text"
                placeholder="8px"
                value={parsed()["padding"] ?? ""}
                onChange={(e) => setProp("padding", e.currentTarget.value)}
                class="dark:bg-lighter-dark-2 w-full rounded-lg border px-2 py-1.5 text-xs dark:border-gray-600"
                dir="ltr"
              />
            </Field>
            <Field label="Margin">
              <input
                type="text"
                placeholder="0"
                value={parsed()["margin"] ?? ""}
                onChange={(e) => setProp("margin", e.currentTarget.value)}
                class="dark:bg-lighter-dark-2 w-full rounded-lg border px-2 py-1.5 text-xs dark:border-gray-600"
                dir="ltr"
              />
            </Field>
          </div>

          {/* Flex */}
          <label class="mb-2 flex items-center gap-2 text-xs font-bold dark:text-gray-200">
            <input
              type="checkbox"
              checked={isFlex()}
              onChange={(e) =>
                setProp("display", e.currentTarget.checked ? "flex" : "")
              }
            />
            عرض العناصر الداخلية بجانب بعض (flex)
          </label>

          <Show when={isFlex()}>
            <div class="mb-3 grid grid-cols-2 gap-3">
              <SelectField
                label="الاتجاه"
                value={parsed()["flex-direction"] ?? "row"}
                options={[
                  ["row", "صف →"],
                  ["row-reverse", "صف ←"],
                  ["column", "عمودي ↓"],
                  ["column-reverse", "عمودي ↑"],
                ]}
                onChange={(v) => setProp("flex-direction", v)}
              />
              <SelectField
                label="محاذاة أفقية"
                value={parsed()["justify-content"] ?? "flex-start"}
                options={[
                  ["flex-start", "البداية"],
                  ["center", "الوسط"],
                  ["flex-end", "النهاية"],
                  ["space-between", "تباعد بينهم"],
                  ["space-around", "تباعد حولهم"],
                ]}
                onChange={(v) => setProp("justify-content", v)}
              />
              <SelectField
                label="محاذاة عمودية"
                value={parsed()["align-items"] ?? "stretch"}
                options={[
                  ["stretch", "تمدد"],
                  ["flex-start", "البداية"],
                  ["center", "الوسط"],
                  ["flex-end", "النهاية"],
                ]}
                onChange={(v) => setProp("align-items", v)}
              />
              <Field label="المسافة بين العناصر (gap)">
                <input
                  type="text"
                  placeholder="12px"
                  value={parsed()["gap"] ?? ""}
                  onChange={(e) => setProp("gap", e.currentTarget.value)}
                  class="dark:bg-lighter-dark-2 w-full rounded-lg border px-2 py-1.5 text-xs dark:border-gray-600"
                  dir="ltr"
                />
              </Field>
            </div>
          </Show>

          {/* CSS متقدم — نفس الستايل الكامل، مباشرة */}
          <Field label="CSS متقدم (أي خاصية إضافية)">
            <textarea
              rows={3}
              value={styleText()}
              onChange={(e) => commit(e.currentTarget.value)}
              class="dark:bg-lighter-dark-2 w-full rounded-lg border px-2 py-1.5 font-mono text-xs dark:border-gray-600"
              dir="ltr"
              placeholder="background-color: #f5f5f5; border-radius: 12px;"
            />
          </Field>
        </div>
  );
}

function Field(props: { label: string; children: any }) {
  return (
    <label class="flex flex-col gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
      {props.label}
      {props.children}
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={props.label}>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        class="dark:bg-lighter-dark-2 w-full rounded-lg border px-2 py-1.5 text-xs dark:border-gray-600"
      >
        <For each={props.options}>
          {([val, label]) => <option value={val}>{label}</option>}
        </For>
      </select>
    </Field>
  );
}

// <input type="color"> needs a hex value — if the stored style already
// has a named/rgb color we can't easily round-trip it back into the
// picker, so we just fall back to the default rather than fighting it;
// the raw CSS field below is always there for exact values.
function toHex(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : undefined;
}
