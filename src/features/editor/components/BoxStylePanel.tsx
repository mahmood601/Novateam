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
import WordColorPicker from "./WordColorPicker";

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

  // Border color needs a visible border to mean anything: if the box has
  // no border yet, give it a thin solid one when a color is picked.
  const setBorderColor = (value: string | null) => {
    let next = withStyleProp(styleText(), "border-color", value ?? "");
    const p = parseStyleString(next);
    const hasBorder =
      p["border"] || p["border-style"] || p["border-width"];
    if (value && !hasBorder) {
      next = withStyleProp(next, "border-style", "solid");
      next = withStyleProp(next, "border-width", "1px");
    }
    commit(next);
  };

  const isFlex = () => parsed()["display"] === "flex";

  // Which color field's palette is open (only one at a time keeps the
  // sheet short on phones).
  const [openField, setOpenField] = createSignal<
    "bg" | "text" | "border" | null
  >(null);
  const toggle = (f: "bg" | "text" | "border") =>
    setOpenField(openField() === f ? null : f);

  return (

        <div
          dir="rtl"
          class="dark:bg-lighter-dark-1 w-full max-w-md rounded-t-3xl bg-white p-4 pb-6 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <p class="mb-3 text-sm font-bold dark:text-white">تنسيق الصندوق</p>

          {/* ألوان — Word-style palette, one field open at a time */}
          <div class="mb-3 flex flex-col gap-1">
            <ColorField
              label="لون الخلفية"
              value={parsed()["background-color"] ?? null}
              open={openField() === "bg"}
              onToggle={() => toggle("bg")}
            >
              <WordColorPicker
                current={parsed()["background-color"] ?? null}
                resetLabel="بلا لون"
                onSelect={(v) => setProp("background-color", v ?? "")}
              />
            </ColorField>
            <ColorField
              label="لون النص"
              value={parsed()["color"] ?? null}
              open={openField() === "text"}
              onToggle={() => toggle("text")}
            >
              <WordColorPicker
                current={parsed()["color"] ?? null}
                resetLabel="افتراضي"
                onSelect={(v) => setProp("color", v ?? "")}
              />
            </ColorField>
            <ColorField
              label="لون الحدود"
              value={parsed()["border-color"] ?? null}
              open={openField() === "border"}
              onToggle={() => toggle("border")}
            >
              <WordColorPicker
                current={parsed()["border-color"] ?? null}
                resetLabel="افتراضي"
                onSelect={setBorderColor}
              />
            </ColorField>
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

// A tappable row (label + current color dot) that expands the palette
// inline below it — full-width rows are easy touch targets on mobile.
function ColorField(props: {
  label: string;
  value: string | null;
  open: boolean;
  onToggle: () => void;
  children: any;
}) {
  return (
    <div class="border-darker-light-2 dark:border-lighter-dark-2 rounded-lg border">
      <button
        type="button"
        class="flex min-h-11 w-full touch-manipulation items-center gap-3 px-3 py-2 text-xs font-bold dark:text-gray-200"
        aria-expanded={props.open}
        onClick={props.onToggle}
      >
        <span class="flex-1 text-right">{props.label}</span>
        <span
          class="border-darker-light-2 dark:border-lighter-dark-2 h-5 w-5 shrink-0 rounded-full border"
          style={{ "background-color": props.value || "transparent" }}
        />
      </button>
      <Show when={props.open}>
        <div class="border-darker-light-2 dark:border-lighter-dark-2 border-t">
          {props.children}
        </div>
      </Show>
    </div>
  );
}
