// "Aa" format sheet, styled after Google Docs on Android: a bottom sheet
// that slides between a root list of format controls and a leaf panel
// (text style / font / color pickers) using the same sliding root+leaf
// mechanics as MenuSheet.

import {
  ArrowRight,
  ALargeSmall,
  Baseline,
  Check,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  Minus,
  PaintBucket,
  Pilcrow,
  Plus,
  Subscript,
  Superscript,
  Type,
  X,
  ChevronLeft,
} from "lucide-solid";
import {
  createEffect,
  For,
  createSignal,
  Show,
  Switch,
  Match,
  JSX,
} from "solid-js";
import type { Editor } from "@tiptap/core";
import {
  FORMAT_COLOR_GROUPS,
  FONT_FAMILY_CHOICES,
  DEFAULT_FONT_SIZE,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  type ColorSwatch,
} from "../lib/formatColors";
import {
  setSelectedCellsAttrs,
  setTableAttrs,
} from "../tiptap/extensions/table/tableTransforms";
import type {
  CellBorderStyle,
  CellBorderWidth,
} from "../tiptap/extensions/table/TableCellAttributes";
import BoxStylePanel from "./BoxStylePanel";

type PanelId =
  | "root"
  | "textStyle"
  | "fontFamily"
  | "textColor"
  | "textBackground"
  | "highlight"
  | "tableFormat"
  | "boxFormat";

type TableScope = "selected" | "table";

const BORDER_STYLE_ITEMS: { value: CellBorderStyle | null; label: string }[] = [
  { value: null, label: "افتراضي" },
  { value: "none", label: "بدون" },
  { value: "solid", label: "متصل" },
  { value: "dashed", label: "متقطع" },
  { value: "dotted", label: "منقط" },
  { value: "double", label: "مزدوج" },
];

const BORDER_WIDTH_ITEMS: { value: CellBorderWidth | null; label: string }[] = [
  { value: null, label: "افتراضي" },
  { value: "thin", label: "رفيع" },
  { value: "medium", label: "متوسط" },
  { value: "thick", label: "سميك" },
];

const TEXT_STYLE_ITEMS: {
  level: 1 | 2 | 3 | 4 | 5 | 6 | null;
  label: string;
  icon: any;
}[] = [
  { level: null, label: "نص عادي", icon: Pilcrow },
  { level: 1, label: "عنوان 1", icon: Heading1 },
  { level: 2, label: "عنوان 2", icon: Heading2 },
  { level: 3, label: "عنوان 3", icon: Heading3 },
  { level: 4, label: "عنوان 4", icon: Heading4 },
  { level: 5, label: "عنوان 5", icon: Heading5 },
  { level: 6, label: "عنوان 6", icon: Heading6 },
];

const LEAF_TITLES: Record<Exclude<PanelId, "root">, string> = {
  textStyle: "نوع النص",
  fontFamily: "الخط",
  textColor: "لون النص",
  textBackground: "لون خلفية النص",
  highlight: "التظليل",
  tableFormat: "تنسيق الجدول",
  boxFormat: "تنسيق الصندوق",
};

export default function FormatSheet(props: {
  editor: () => Editor | undefined;
  tick: () => number;
  onClose: () => void;
}) {
  const [panel, setPanel] = createSignal<PanelId>("root");
  const [tableScope, setTableScope] = createSignal<TableScope>("selected");
  const [boxPanelOpen, setBoxPanelOpen] = createSignal(true);

  let wrapperRef: HTMLDivElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  let leafRef: HTMLDivElement | undefined;

  createEffect(() => {
    const el = panel() === "root" ? rootRef : leafRef;
    if (el && wrapperRef) {
      wrapperRef.style.height = `40vh`;
    }
  });

  // Reads props.tick() first so every reactive read below re-subscribes on
  // each selection/content change, the same trick TiptapReviewEditor uses.
  const ed = () => {
    props.tick();
    return props.editor();
  };

  const currentTextStyleLabel = () => {
    const e = ed();
    if (!e) return TEXT_STYLE_ITEMS[0].label;
    const active = TEXT_STYLE_ITEMS.find((item) =>
      item.level === null
        ? e.isActive("paragraph")
        : e.isActive("heading", { level: item.level }),
    );
    return active?.label ?? TEXT_STYLE_ITEMS[0].label;
  };

  const currentFontFamily = () =>
    (ed()?.getAttributes("textStyle").fontFamily as string | undefined) ?? null;
  const currentFontFamilyLabel = () =>
    FONT_FAMILY_CHOICES.find((f) => f.value === currentFontFamily())?.label ??
    FONT_FAMILY_CHOICES[0].label;

  const currentFontSize = () => {
    const raw = ed()?.getAttributes("textStyle").fontSize as string | undefined;
    const parsed = raw ? parseInt(raw, 10) : DEFAULT_FONT_SIZE;
    return Number.isFinite(parsed) ? parsed : DEFAULT_FONT_SIZE;
  };

  const currentColor = () =>
    (ed()?.getAttributes("textStyle").color as string | undefined) ?? null;
  const currentBackground = () =>
    (ed()?.getAttributes("textStyle").backgroundColor as string | undefined) ??
    null;
  const currentHighlight = () =>
    (ed()?.getAttributes("highlight").color as string | undefined) ?? null;

  const isSubscript = () => ed()?.isActive("subscript") ?? false;
  const isSuperscript = () => ed()?.isActive("superscript") ?? false;

  const isInTable = () => ed()?.isActive("table") ?? false;

  const isInBox = () => ed()?.isActive("novaBox") ?? false;

  // Reads whichever cell type (data cell or header cell) the selection is
  // currently anchored in — same fallback getAttributes needs since the
  // two node types carry the same style attributes independently.
  const currentCellAttrs = () => {
    const e = ed();
    if (!e) return {} as Record<string, unknown>;
    return e.isActive("tableHeader")
      ? e.getAttributes("tableHeader")
      : e.getAttributes("tableCell");
  };

  const currentCellBackground = () =>
    (currentCellAttrs().backgroundColor as string | undefined) ?? null;
  const currentBorderStyle = () =>
    (currentCellAttrs().borderStyle as CellBorderStyle | undefined) ?? null;
  const currentBorderWidth = () =>
    (currentCellAttrs().borderWidth as CellBorderWidth | undefined) ?? null;
  const currentBorderColor = () =>
    (currentCellAttrs().borderColor as string | undefined) ?? null;

  const applyTableAttrs = (attrs: Record<string, unknown>) => {
    const e = ed();
    if (!e) return;
    if (tableScope() === "table") setTableAttrs(e, attrs);
    else setSelectedCellsAttrs(e, attrs);
  };

  const setTextStyle = (level: 1 | 2 | 3 | 4 | 5 | 6 | null) => {
    const e = ed();
    if (!e) return;
    if (level === null) e.chain().focus().setParagraph().run();
    else e.chain().focus().toggleHeading({ level }).run();
    setPanel("root");
  };

  const setFontFamily = (value: string | null) => {
    const e = ed();
    if (!e) return;
    if (value === null) e.chain().focus().unsetFontFamily().run();
    else e.chain().focus().setFontFamily(value).run();
    setPanel("root");
  };

  const setFontSize = (size: number) => {
    const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
    ed()?.chain().focus().setFontSize(`${clamped}px`).run();
  };

  const applyColor = (
    target: "textColor" | "textBackground" | "highlight",
    value: string | null,
  ) => {
    const e = ed();
    if (!e) return;
    if (target === "textColor") {
      value
        ? e.chain().focus().setColor(value).run()
        : e.chain().focus().unsetColor().run();
    } else if (target === "textBackground") {
      value
        ? e.chain().focus().setBackgroundColor(value).run()
        : e.chain().focus().unsetBackgroundColor().run();
    } else {
      value
        ? e.chain().focus().toggleHighlight({ color: value }).run()
        : e.chain().focus().unsetHighlight().run();
    }
    setPanel("root");
  };

  return (
    <div
      ref={wrapperRef}
      class="format-sheet shrink-0 grow"
      style={{
        transition: "height 0.2s ease",
        display: "flex",
        "flex-direction": "column",
        "max-height": "80vh",
      }}
    >
      <div
        class="border-b-darker-light-1 dark:border-b-lighter-dark-2 flex items-center justify-between border-b-2 px-3 py-2"
        dir="rtl"
      >
        <span class="font-medium">تنسيق</span>
        <X class="cursor-pointer" onClick={props.onClose} />
      </div>

      <div
        class="sheet-track overflow-y-scroll"
        style={{
          display: "flex",
          width: "200%",
          transform: panel() === "root" ? "translateX(0%)" : "translateX(50%)",
          transition: "transform 0.25s ease",
        }}
      >
        {/* ROOT PANEL */}
        <div
          ref={rootRef}
          class="flex w-full flex-col gap-0.5 overflow-y-scroll p-2"
          dir="rtl"
        >
          <FormatRow
            icon={Heading}
            label="نوع النص"
            trailingLabel={currentTextStyleLabel()}
            onClick={() => setPanel("textStyle")}
          />
          <FormatRow
            icon={Type}
            label="الخط"
            trailingLabel={currentFontFamilyLabel()}
            onClick={() => setPanel("fontFamily")}
          />
          <FontSizeRow
            icon={ALargeSmall}
            label="حجم الخط"
            value={currentFontSize()}
            onDecrement={() => setFontSize(currentFontSize() - 1)}
            onIncrement={() => setFontSize(currentFontSize() + 1)}
          />

          <div class="border-darker-light-2 dark:border-lighter-dark-2 my-1 border-t" />

          <FormatRow
            icon={Baseline}
            label="لون النص"
            swatch={currentColor()}
            onClick={() => setPanel("textColor")}
          />
          <FormatRow
            icon={PaintBucket}
            label="لون خلفية النص"
            swatch={currentBackground()}
            onClick={() => setPanel("textBackground")}
          />
          <FormatRow
            icon={Highlighter}
            label="التظليل"
            swatch={currentHighlight()}
            onClick={() => setPanel("highlight")}
          />

          <Show when={isInTable()}>
            <div class="border-darker-light-2 dark:border-lighter-dark-2 my-1 border-t" />
            <FormatRow
              icon={PaintBucket}
              label="تنسيق الجدول"
              trailingLabel="الخلفية والحدود"
              onClick={() => setPanel("tableFormat")}
            />
          </Show>

          <Show when={isInBox()}>
            <div class="border-darker-light-2 dark:border-lighter-dark-2 my-1 border-t" />
            <FormatRow
              icon={PaintBucket}
              label="تنسيق الصندوق"
              trailingLabel="الخلفية والحدود"
              onClick={() => setPanel("boxFormat")}
            />
          </Show>

          <div class="border-darker-light-2 dark:border-lighter-dark-2 my-1 border-t" />

          <div class="flex w-full items-center gap-2 px-1 py-1.5">
            <button
              type="button"
              classList={{
                "bg-darker-light-1 dark:bg-lighter-dark-2": isSubscript(),
              }}
              class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex flex-1 items-center justify-center gap-2 rounded py-2 text-sm"
              title="نص سفلي (Subscript)"
              onClick={() => ed()?.chain().focus().toggleSubscript().run()}
            >
              <Subscript size={18} />
              <span>نص سفلي</span>
            </button>
            <button
              type="button"
              classList={{
                "bg-darker-light-1 dark:bg-lighter-dark-2": isSuperscript(),
              }}
              class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex flex-1 items-center justify-center gap-2 rounded py-2 text-sm"
              title="نص علوي (Superscript)"
              onClick={() => ed()?.chain().focus().toggleSuperscript().run()}
            >
              <Superscript size={18} />
              <span>نص علوي</span>
            </button>
          </div>
        </div>

        {/* LEAF PANEL */}
        <div
          ref={leafRef}
          class="flex w-full flex-col overflow-y-auto p-2"
          dir="rtl"
        >
          <Show when={panel() !== "root"}>
            <button
              type="button"
              class="border-b-darker-light-1 dark:border-b-lighter-dark-2 mb-1 flex w-full items-center gap-2 border-b-2 px-3 py-2"
              onClick={() => setPanel("root")}
            >
              <ArrowRight size={18} />
              <span class="flex-1 text-right">
                {LEAF_TITLES[panel() as Exclude<PanelId, "root">]}
              </span>
            </button>

            <Switch>
              <Match when={panel() === "textStyle"}>
                <For each={TEXT_STYLE_ITEMS}>
                  {(item) => (
                    <ListItemRow
                      icon={item.icon}
                      label={item.label}
                      active={
                        item.level === null
                          ? (ed()?.isActive("paragraph") ?? false)
                          : (ed()?.isActive("heading", { level: item.level }) ??
                            false)
                      }
                      onClick={() => setTextStyle(item.level)}
                    />
                  )}
                </For>
              </Match>

              <Match when={panel() === "fontFamily"}>
                <For each={FONT_FAMILY_CHOICES}>
                  {(choice) => (
                    <ListItemRow
                      label={choice.label}
                      active={currentFontFamily() === choice.value}
                      previewStyle={{ "font-family": choice.previewFont }}
                      onClick={() => setFontFamily(choice.value)}
                    />
                  )}
                </For>
              </Match>

              <Match when={panel() === "textColor"}>
                <ColorGrid
                  current={currentColor()}
                  resetLabel="افتراضي"
                  onSelect={(v) => applyColor("textColor", v)}
                />
              </Match>

              <Match when={panel() === "boxFormat"}>
                <BoxStylePanel
                  editor={ed()!}
                  open={boxPanelOpen()}
                  onClose={() => setBoxPanelOpen(false)}
                />
              </Match>

              <Match when={panel() === "textBackground"}>
                <ColorGrid
                  current={currentBackground()}
                  resetLabel="بلا لون"
                  onSelect={(v) => applyColor("textBackground", v)}
                />
              </Match>

              <Match when={panel() === "highlight"}>
                <ColorGrid
                  current={currentHighlight()}
                  resetLabel="بلا تظليل"
                  onSelect={(v) => applyColor("highlight", v)}
                />
              </Match>

              <Match when={panel() === "tableFormat"}>
                <div class="flex flex-col gap-4 px-1 py-2">
                  {/* Scope: apply the pickers below to the selected cells
                      only, or to every cell in the table at once. */}
                  <div class="bg-darker-light-1 dark:bg-lighter-dark-2 flex items-center gap-1 rounded-full p-1 text-sm">
                    <button
                      type="button"
                      class="flex-1 rounded-full py-1.5"
                      classList={{
                        "bg-main-light dark:bg-lighter-dark-1 shadow-sm":
                          tableScope() === "selected",
                      }}
                      onClick={() => setTableScope("selected")}
                    >
                      الخلايا المحددة
                    </button>
                    <button
                      type="button"
                      class="flex-1 rounded-full py-1.5"
                      classList={{
                        "bg-main-light dark:bg-lighter-dark-1 shadow-sm":
                          tableScope() === "table",
                      }}
                      onClick={() => setTableScope("table")}
                    >
                      كل الجدول
                    </button>
                  </div>

                  <div>
                    <div
                      class="mb-1 px-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      خلفية الخلية
                    </div>
                    <ColorGrid
                      current={currentCellBackground()}
                      resetLabel="بلا لون"
                      onSelect={(v) => applyTableAttrs({ backgroundColor: v })}
                    />
                  </div>

                  <div class="border-darker-light-2 dark:border-lighter-dark-2 border-t" />

                  <div>
                    <div
                      class="mb-1 px-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      شكل الحدود
                    </div>
                    <div class="flex flex-wrap gap-2 px-1">
                      <For each={BORDER_STYLE_ITEMS}>
                        {(item) => (
                          <button
                            type="button"
                            class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 rounded-full border px-3 py-1.5 text-sm"
                            classList={{
                              "border-2": currentBorderStyle() === item.value,
                            }}
                            style={{
                              "border-color":
                                currentBorderStyle() === item.value
                                  ? "var(--color-main)"
                                  : "var(--editor-chrome-border)",
                              color:
                                currentBorderStyle() === item.value
                                  ? "var(--color-main)"
                                  : "inherit",
                            }}
                            onClick={() =>
                              applyTableAttrs({ borderStyle: item.value })
                            }
                          >
                            {item.label}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="border-darker-light-2 dark:border-lighter-dark-2 border-t" />

                  <div>
                    <div
                      class="mb-1 px-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      حجم الحد
                    </div>
                    <div class="flex flex-wrap gap-2 px-1">
                      <For each={BORDER_WIDTH_ITEMS}>
                        {(item) => (
                          <button
                            type="button"
                            class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 rounded-full border px-3 py-1.5 text-sm"
                            classList={{
                              "border-2": currentBorderWidth() === item.value,
                            }}
                            style={{
                              "border-color":
                                currentBorderWidth() === item.value
                                  ? "var(--color-main)"
                                  : "var(--editor-chrome-border)",
                              color:
                                currentBorderWidth() === item.value
                                  ? "var(--color-main)"
                                  : "inherit",
                            }}
                            onClick={() =>
                              applyTableAttrs({ borderWidth: item.value })
                            }
                          >
                            {item.label}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="border-darker-light-2 dark:border-lighter-dark-2 border-t" />

                  <div>
                    <div
                      class="mb-1 px-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      لون الحدود
                    </div>
                    <ColorGrid
                      current={currentBorderColor()}
                      resetLabel="افتراضي"
                      onSelect={(v) => applyTableAttrs({ borderColor: v })}
                    />
                  </div>
                </div>
              </Match>
            </Switch>
          </Show>
        </div>
      </div>
    </div>
  );
}

function FormatRow(props: {
  icon: any;
  label: string;
  trailingLabel?: string;
  /** undefined = no swatch shown; null = empty/"unset" swatch; string = colored swatch */
  swatch?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm"
      onClick={props.onClick}
    >
      <props.icon size={18} class="text-header dark:text-main-light shrink-0" />
      <span class="flex-1 text-right">{props.label}</span>
      <Show when={props.trailingLabel}>
        <span class="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {props.trailingLabel}
        </span>
      </Show>
      <Show when={props.swatch !== undefined}>
        <span
          class="h-5 w-5 shrink-0 rounded-full border"
          style={{
            "border-color": "var(--editor-chrome-border)",
            "background-color": props.swatch || "transparent",
          }}
        />
      </Show>
      <ChevronLeft
        size={16}
        class="shrink-0"
        style={{ color: "var(--muted-foreground)" }}
      />
    </button>
  );
}

function ListItemRow(props: {
  icon?: any;
  label: string;
  active: boolean;
  previewStyle?: JSX.CSSProperties;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm"
      onClick={props.onClick}
    >
      <Show when={props.icon}>
        <props.icon size={18} class="shrink-0" />
      </Show>
      <span class="flex-1 text-right" style={props.previewStyle}>
        {props.label}
      </span>
      <Show when={props.active}>
        <Check
          size={16}
          class="shrink-0"
          style={{ color: "var(--color-main)" }}
        />
      </Show>
    </button>
  );
}

function FontSizeRow(props: {
  icon: any;
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div class="flex w-full items-center gap-3 px-3 py-2.5 text-sm">
      <props.icon size={18} class="text-header dark:text-main-light shrink-0" />
      <span class="flex-1 text-right">{props.label}</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 border-darker-light-2 dark:border-lighter-dark-2 flex h-7 w-7 items-center justify-center rounded-full border"
          title="تصغير"
          onClick={props.onDecrement}
        >
          <Minus size={14} />
        </button>
        <span class="w-7 text-center tabular-nums">{props.value}</span>
        <button
          type="button"
          class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 border-darker-light-2 dark:border-lighter-dark-2 flex h-7 w-7 items-center justify-center rounded-full border"
          title="تكبير"
          onClick={props.onIncrement}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function ColorGrid(props: {
  current: string | null;
  resetLabel: string;
  onSelect: (value: string | null) => void;
}) {
  const isCurrent = (value: string) =>
    (props.current ?? "").toLowerCase() === value.toLowerCase();

  return (
    <div class="flex flex-col gap-3 px-1 py-2">
      <button
        type="button"
        class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex items-center gap-3 rounded px-2 py-2 text-sm"
        onClick={() => props.onSelect(null)}
      >
        <span
          class="border-darker-light-2 dark:border-lighter-dark-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
          style={{ "background-color": "transparent" }}
        >
          <X size={12} style={{ color: "var(--muted-foreground)" }} />
        </span>
        <span class="flex-1 text-right">{props.resetLabel}</span>
        <Show when={props.current === null}>
          <Check size={16} style={{ color: "var(--color-main)" }} />
        </Show>
      </button>

      <For each={FORMAT_COLOR_GROUPS}>
        {(group: ColorSwatch[]) => (
          <div class="firs grid grid-cols-6 justify-items-center gap-2 overflow-scroll">
            <For each={group}>
              {(swatch) => (
                <button
                  type="button"
                  title={swatch.label}
                  class="border-darker-light-2 dark:border-lighter-dark-2 relative h-8 w-8 rounded-full border"
                  style={{ "background-color": swatch.value }}
                  onClick={() => props.onSelect(swatch.value)}
                >
                  <Show when={isCurrent(swatch.value)}>
                    <Check
                      size={14}
                      class="absolute inset-0 m-auto"
                      style={{
                        color:
                          swatch.value === "#FFFFFF" ||
                          swatch.value === "#FFFF00"
                            ? "#000"
                            : "#fff",
                      }}
                    />
                  </Show>
                </button>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
}
