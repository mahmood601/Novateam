// The review editor itself: loads AI-generated content (already
// converted to Tiptap JSON via novaToTiptap) and lets the team edit it
// like a Word document — no markdown syntax knowledge required.

import {
  onCleanup,
  onMount,
  createSignal,
  createEffect,
  For,
  Match,
  Show,
  Suspense,
  Switch,
} from "solid-js";
import { Editor, JSONContent } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { Dynamic } from "solid-js/web";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowRight,
  Bold,
  CaseSensitive,
  Check,
  CloudCheck,
  CloudOff,
  CloudSync,
  Columns3,
  Copy,
  Eraser,
  FileText,
  Grid2x2Check,
  ImagePlus,
  Images,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  List,
  ListOrdered,
  Plus,
  Redo2,
  Rows3,
  Save,
  SeparatorHorizontal,
  Strikethrough,
  Table2,
  TableCellsMerge,
  TableProperties,
  Trash2,
  Underline,
  Undo2,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-solid";

import { debounce } from "@/features/shared/utils/debounce";
import {
  getLecture,
  upsertLecture,
  updateDoctorName,
} from "@/features/shared/services/lecturesUpdates";
import { useUser } from "@/features/shared/context/user";
import { useParams, useNavigate } from "@solidjs/router";

import "../styles/editor.css";
import "../styles/a4-mode.css";
import "../../../../public/print/paged-print.css";
import { extensionsArr } from "../tiptap/extensions/extensionsArr";
import Menu from "./DropdownMenu";
import { useKeyboardToolbar } from "../hooks/usekeyboardToolbar";
import MenuSheet, { type MenuSheetItem } from "./MenuSheet";
import FormatSheet from "./FormatSheet";
import InputSheet, { type InputField, type InputRequest } from "./InputSheet";
import TableGripOverlay from "../tiptap/extensions/table/TableGripOverlay";
import {
  clearSelectedCellsContent,
  duplicateCurrentColumn,
  duplicateCurrentRow,
  findEnclosingCellPos,
  selectCellRange,
  setSelectedCellsAttrs,
} from "../tiptap/extensions/table/tableTransforms";
import type {
  CellTextAlign,
  CellVerticalAlign,
} from "../tiptap/extensions/table/TableCellAttributes";
import { TablePickerPanel } from "../tiptap/extensions/table/TableGridPicker";

export default function TiptapReviewEditor(props: {
  subjectId: string;
  seasonId: string;
}) {
  let containerRef: any;
  let editor: Editor | undefined;
  const { height: vvHeight, top: vvTop } = useKeyboardToolbar();
  const [tick, setTick] = createSignal(0); // forces toolbar re-render on selection/content change

  // ── A4 page mode ───────────────────────────────────────────────
  // A4 is 210mm wide; CSS defines 1in = 96px, so that's ~793.7px.
  const A4_WIDTH_PX = (210 / 25.4) * 96;
  const [a4Active, setA4Active] = createSignal(false);
  // 1 = "fit the phone width"; the +/- buttons multiply on top of that.
  const [a4Scale, setA4Scale] = createSignal(1);

  // Computes the CSS `zoom` that makes the A4 sheet exactly as wide as
  // the screen (never bigger than real size), then applies the user's
  // extra zoom. It's written as a CSS variable that a4-mode.css reads.
  const applyA4Zoom = () => {
    if (!containerRef) return;
    const fit = Math.min(1, (containerRef.clientWidth - 16) / A4_WIDTH_PX);
    const zoom = Math.min(1.5, fit * a4Scale());
    containerRef.style.setProperty("--a4-zoom", String(zoom));
  };

  createEffect(() => {
    // Re-runs whenever A4 mode or the user's zoom changes.
    const active = a4Active();
    a4Scale();
    if (active) applyA4Zoom();
    else containerRef?.style.removeProperty("--a4-zoom");
  });

  const a4ZoomIn = () => setA4Scale((s) => Math.min(3, +(s + 0.35).toFixed(2)));
  const a4ZoomOut = () => setA4Scale((s) => Math.max(1, +(s - 0.35).toFixed(2)));

  // MS Word–style "insert table" grid picker
  const TABLE_PICKER_MAX_ROWS = 8;
  const TABLE_PICKER_MAX_COLS = 10;

  const [insertActive, setInsertActive] = createSignal(false);
  const [formatActive, setFormatActive] = createSignal(false);
  const [tableRowColActive, setTableRowColActive] = createSignal(false);

  // "Select cells" mode: two-tap alternative to drag-to-select, which
  // prosemirror-tables only wires up for mouse `mousedown`+drag and
  // doesn't fire reliably from a touch drag on Android. First tap while
  // active sets the anchor cell; the next tap on a *different* cell
  // builds a rectangular CellSelection between them and turns the mode
  // back off, ready to use (e.g. with the table formatting controls in
  // FormatSheet).
  const [cellSelectActive, setCellSelectActive] = createSignal(false);
  const [cellSelectAnchor, setCellSelectAnchor] = createSignal<number | null>(
    null,
  );

  const params = useParams();
  const subjectId = params.subject ?? "";
  const seasonId = params.season ?? "";
  const navigate = useNavigate();

  const { user } = useUser();
  const [raw, setRaw] = createSignal<JSONContent | null>(null);
  const [status, setStatus] = createSignal<
    "typing" | "saving" | "saved" | "error"
  >("typing");

  const handleFileUpload = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        editor?.commands.setContent(content, {
          contentType: "markdown",
          emitUpdate: true,
        });
      };
      setRaw(editor?.getJSON() || null);
      reader.readAsText(file);
    }
  };

  // In-app replacement for window.prompt (rendered by InputSheet in the dock).
  const [inputReq, setInputReq] = createSignal<InputRequest | null>(null);
  const askInput = (
    title: string,
    fields: InputField[],
    extra?: { dangerLabel?: string; onDanger?: () => void; submitLabel?: string },
  ) =>
    new Promise<Record<string, string> | null>((resolve) => {
      setInputReq({
        title,
        fields,
        ...extra,
        resolve: (v) => {
          setInputReq(null);
          resolve(v);
        },
        onDanger: extra?.onDanger
          ? () => {
              setInputReq(null);
              extra.onDanger!();
              resolve(null);
            }
          : undefined,
      });
    });

  const anySheetOpen = () =>
    insertActive() || formatActive() || tableRowColActive() || !!inputReq();

  const handleEditDoctorName = async () => {
    const res = await askInput("اسم الدكتور", [
      { key: "name", label: "الاسم", required: true },
    ]);
    const newName = res?.name?.trim();
    if (newName) {
      await updateDoctorName(
        props.subjectId,
        props.seasonId,
        newName,
        user()?.id,
      );
    }
  };

  const loadLecture = async () => {
    const content = await getLecture({
      subjectId: subjectId,
      seasonId: seasonId,
    });

    const json = content?.data?.[0]?.content?.raw ?? null;
    if (!json) return;

    editor?.commands.setContent(json, {
      contentType: "json",
    });
  };

  const saveToSupabase = async () => {
    setStatus("saving");
    const { error } = await upsertLecture({
      subjectId: props.subjectId,
      seasonId: props.seasonId,
      rawContent: raw(),
      userId: user()?.id,
    });

    if (error) {
      setStatus("error");
    } else {
      setStatus("saved");
      debounce(() => setStatus("typing"), 700)();
    }
  };

  const debounceSave = debounce(saveToSupabase, 1000);

  const handleInputChange = (value: JSONContent) => {
    setStatus("typing");

    if (value !== null) {
      setRaw(value);
      debounceSave();
    }
  };

  const addFigure = async () => {
    const res = await askInput("إدراج صورة", [
      {
        key: "url",
        label: "رابط الصورة",
        placeholder: "https://",
        dir: "ltr",
        type: "url",
        required: true,
      },
      { key: "caption", label: "الشرح (اختياري)" },
    ]);
    const url = res?.url?.trim();
    if (url) {
      editor
        ?.chain()
        .focus()
        .setImage({ src: url, caption: res?.caption || "" } as any)
        .run();
    }
  };

  const editLink = async () => {
    if (!editor) return;
    const previousUrl = (editor.getAttributes("link").href as string) ?? "";
    const res = await askInput(
      "رابط",
      [
        {
          key: "url",
          label: "العنوان",
          placeholder: "https://",
          dir: "ltr",
          type: "url",
          value: previousUrl,
          required: true,
        },
      ],
      previousUrl
        ? {
            dangerLabel: "إزالة الرابط",
            onDanger: () =>
              editor?.chain().focus().extendMarkRange("link").unsetLink().run(),
          }
        : undefined,
    );
    const url = res?.url?.trim();
    if (!url) return;
    if (editor.state.selection.empty && !editor.isActive("link")) {
      // Nothing selected: insert the URL itself as a link.
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  /** Build the insert-menu items. Editor must already exist. */
  const getInsertItems = (): MenuSheetItem[] => [
    {
      id: "image",
      label: "صورة",
      icon: ImagePlus,
      onClick: () => {
        void addFigure();
      },
    },
    {
      id: "gallery",
      label: "مجموعة صور",
      icon: Images,
      onClick: () => {
        editor?.commands.setImageGallery();
      },
    },
    {
      id: "mermaid",
      label: "مخطط",
      icon: Workflow,
      onClick: () => {
        editor?.commands.setMermaid();
      },
    },
    {
      id: "table",
      label: "جدول",
      icon: Table2,
      panel: (panelProps) => (
        <TablePickerPanel
          maxRows={TABLE_PICKER_MAX_ROWS}
          maxCols={TABLE_PICKER_MAX_COLS}
          onSelect={(rows, cols) => {
            editor
              ?.chain()
              .focus()
              .insertTable({ rows, cols, withHeaderRow: true })
              .run();
            panelProps.onDone();
          }}
        />
      ),
    },
    {
      id: "box",
      label: "صندوق",
      icon: TableProperties,
      onClick: () => {
        editor?.chain().focus().setBox().run();
      }
    },
    {
      id: "page-break",
      label: "فاصل صفحة",
      icon: SeparatorHorizontal,
      onClick: () => {
        editor?.chain().focus().setPageBreak().run();
        setInsertActive(false);
      },
    },
  ];

  onMount(() => {
    loadLecture();

    // Recompute the A4 fit when the container's width changes (rotation, etc.)
    const a4Observer = new ResizeObserver(() => {
      if (a4Active()) applyA4Zoom();
      // The writing area shrinks when the keyboard or a docked sheet opens:
      // scroll the caret back into view so it is never hidden.
      if (editor && (anySheetOpen() || editor.isFocused)) {
        requestAnimationFrame(() => editor?.commands.scrollIntoView());
      }
    });
    a4Observer.observe(containerRef);
    onCleanup(() => a4Observer.disconnect());

    editor = new Editor({
      element: containerRef,
      content: raw(),
      extensions: [...extensionsArr],
      onTransaction: () => setTick((t) => t + 1),
      onUpdate: ({ editor: e }) => handleInputChange(e.getJSON()),
    });
  });

  onCleanup(() => {
    editor?.destroy();
  });

  const isActive = (name: string) => {
    tick();
    return editor?.isActive(name) ?? false;
  };

  // Drives "select cells" mode: runs on every transaction (which
  // includes plain cursor moves), and only acts while the mode is on.
  createEffect(() => {
    tick();
    if (!cellSelectActive() || !editor) return;

    if (!editor.isActive("table")) {
      // Selection left the table entirely — bail out of the mode rather
      // than leave a stale anchor from a different table.
      setCellSelectActive(false);
      setCellSelectAnchor(null);
      return;
    }

    // Ignore the transaction we ourselves dispatch below when the range
    // is built — it's already a CellSelection, not a fresh tap.
    if (editor.state.selection instanceof CellSelection) return;

    const cellPos = findEnclosingCellPos(editor);
    if (cellPos === null) return;

    const anchor = cellSelectAnchor();
    if (anchor === null) {
      setCellSelectAnchor(cellPos);
      return;
    }
    if (cellPos === anchor) return; // tapped the same cell again, keep waiting

    selectCellRange(editor, anchor, cellPos);
    setCellSelectAnchor(null);
    setCellSelectActive(false);
  });

  type ToolbarButton = {
    icon: any;
    title: string;
    activeKey: string;
    onClick: () => void;
  };

  // Grouped like Word's ribbon: text style / lists / extras. Groups are
  // separated by a thin divider in the bar.
  const toolbarGroups: ToolbarButton[][] = [
    [
      {
        icon: Bold,
        title: "غامق",
        activeKey: "bold",
        onClick: () => editor?.chain().focus().toggleBold().run(),
      },
      {
        icon: Italic,
        title: "مائل",
        activeKey: "italic",
        onClick: () => editor?.chain().focus().toggleItalic().run(),
      },
      {
        icon: Underline,
        title: "تسطير",
        activeKey: "underline",
        onClick: () => editor?.chain().focus().toggleUnderline().run(),
      },
      {
        icon: Strikethrough,
        title: "يتوسطه خط",
        activeKey: "strike",
        onClick: () => editor?.chain().focus().toggleStrike().run(),
      },
    ],
    [
      {
        icon: List,
        title: "قائمة نقطية",
        activeKey: "bulletList",
        onClick: () => editor?.chain().focus().toggleBulletList().run(),
      },
      {
        icon: ListOrdered,
        title: "قائمة مرقمة",
        activeKey: "orderedList",
        onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      },
      {
        icon: IndentDecrease,
        title: "تقليل المسافة البادئة",
        activeKey: "outdent",
        onClick: () => editor?.chain().focus().liftListItem("listItem").run(),
      },
      {
        icon: IndentIncrease,
        title: "زيادة المسافة البادئة",
        activeKey: "indent",
        onClick: () => editor?.chain().focus().sinkListItem("listItem").run(),
      },
    ],
    [
      {
        icon: Link,
        title: "رابط",
        activeKey: "link",
        onClick: () => void editLink(),
      },
    ],
  ];

  // Document-level text alignment (heading/paragraph), driven by the
  // @tiptap/extension-text-align extension. Shown as a Kobalte dropdown
  // in the floating toolbar rather than a row of buttons — same package
  // already used for the "⋮" menu in DropdownMenu.tsx.
  const textAlignCommands: {
    icon: any;
    label: string;
    align: "right" | "center" | "left" | "justify";
  }[] = [
    { icon: AlignRight, label: "محاذاة يمين", align: "right" },
    { icon: AlignCenter, label: "محاذاة وسط", align: "center" },
    { icon: AlignLeft, label: "محاذاة يسار", align: "left" },
    { icon: AlignJustify, label: "ضبط", align: "justify" },
  ];

  const isTextAlign = (align: string) => {
    tick();
    return editor?.isActive({ textAlign: align }) ?? false;
  };

  const currentAlignIcon = () =>
    textAlignCommands.find((item) => isTextAlign(item.align))?.icon ??
    AlignRight;

  // Row/column edit commands, shown via a dedicated sheet (see tableRowColActive
  // below) instead of inline in the table context toolbar.
  const tableCommands: MenuSheetItem[] = [
    {
      id: "add-row-before",
      icon: Plus,
      label: "+ صف أعلى",
      onClick: () => editor?.chain().focus().addRowBefore().run(),
    },
    {
      id: "add-row-after",
      icon: Plus,
      label: "+ صف أسفل",
      onClick: () => editor?.chain().focus().addRowAfter().run(),
    },
    {
      id: "delete-row",
      icon: Trash2,
      label: "− حذف الصف",
      onClick: () => editor?.chain().focus().deleteRow().run(),
    },
    {
      id: "add-col-before",
      icon: Plus,
      label: "+ عمود قبل",
      onClick: () => editor?.chain().focus().addColumnBefore().run(),
    },
    {
      id: "add-col-after",
      icon: Plus,
      label: "+ عمود بعد",
      onClick: () => editor?.chain().focus().addColumnAfter().run(),
    },
    {
      id: "delete-col",
      icon: Trash2,
      label: "− حذف العمود",
      onClick: () => editor?.chain().focus().deleteColumn().run(),
    },
    {
      id: "merge-split",
      icon: TableCellsMerge,
      label: "دمج / فصل",
      onClick: () => editor?.chain().focus().mergeOrSplit().run(),
    },
    {
      id: "duplicate-row",
      icon: Copy,
      label: "تكرار الصف",
      onClick: () => editor && duplicateCurrentRow(editor),
    },
    {
      id: "duplicate-col",
      icon: Copy,
      label: "تكرار العمود",
      onClick: () => editor && duplicateCurrentColumn(editor),
    },
    {
      id: "clear-content",
      icon: Eraser,
      label: "مسح المحتوى",
      onClick: () => editor && clearSelectedCellsContent(editor),
    },
    {
      id: "header-row",
      icon: Rows3,
      label: "صف العنوان",
      onClick: () => editor?.chain().focus().toggleHeaderRow().run(),
    },
    {
      id: "header-col",
      icon: Columns3,
      label: "عمود العنوان",
      onClick: () => editor?.chain().focus().toggleHeaderColumn().run(),
    },
    {
      id: "header-cell",
      icon: TableProperties,
      label: "خلية عنوان",
      onClick: () => editor?.chain().focus().toggleHeaderCell().run(),
    },
    {
      id: "delete-table",
      icon: Trash2,
      label: "حذف الجدول",
      onClick: () => editor?.chain().focus().deleteTable().run(),
    },
  ];

  const cellAlignCommands: {
    icon: any;
    title: string;
    align: CellTextAlign;
  }[] = [
    { icon: AlignLeft, title: "محاذاة لليسار", align: "left" },
    { icon: AlignCenter, title: "توسيط", align: "center" },
    { icon: AlignRight, title: "محاذاة لليمين", align: "right" },
    { icon: AlignJustify, title: "ضبط", align: "justify" },
  ];

  const cellVerticalAlignCommands: {
    icon: any;
    title: string;
    align: CellVerticalAlign;
  }[] = [
    { icon: AlignVerticalJustifyStart, title: "محاذاة للأعلى", align: "top" },
    {
      icon: AlignVerticalJustifyCenter,
      title: "محاذاة للمنتصف",
      align: "middle",
    },
    { icon: AlignVerticalJustifyEnd, title: "محاذاة للأسفل", align: "bottom" },
  ];

  // Shared look of a toolbar button: 44px touch target.
  const tbBtn =
    "hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex size-11 shrink-0 items-center justify-center rounded-lg";
  const divider = (
    <div class="bg-darker-light-2 dark:bg-lighter-dark-2 mx-1 h-6 w-px shrink-0 self-center" />
  );

  return (
    // Root is pinned to the visual viewport (area above the keyboard).
    // Everything inside is a normal flex column: header / writing area /
    // bottom dock. Nothing floats over the text any more.
    <div
      style={{ height: `${vvHeight()}px`, top: `${vvTop()}px` }}
      class="bg-main-light dark:bg-main-dark fixed left-0 flex w-full flex-col overflow-hidden"
    >
      <EditorHeader
        seasonId={seasonId}
        status={status}
        onBack={() => navigate(-1)}
        onSave={saveToSupabase}
        onUndo={() => editor?.chain().focus().undo().run()}
        onRedo={() => editor?.chain().focus().redo().run()}
        a4Active={a4Active()}
        onToggleA4={() => setA4Active((v) => !v)}
        subjectId={props.subjectId}
        handleFileUpload={handleFileUpload}
        handleEditDoctorName={handleEditDoctorName}
      />

      <div
        class="nova-tiptap-review relative flex min-h-0 w-full flex-1 flex-col"
        dir="rtl"
      >
        <Suspense fallback={<div class="p-4 text-center">جارٍ التحميل...</div>}>
          <div
            ref={containerRef}
            class="nova-tiptap-content dark:bg-main-dark dark:text-main-light min-h-0 flex-1 overflow-auto"
            classList={{ "a4-mode": a4Active() }}
          />
        </Suspense>

        {/* A4 mode: hint + zoom controls */}
        <Show when={a4Active()}>
          <div class="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center">
            <span class="bg-main rounded-full px-3 py-1 text-xs text-white shadow">
              A4 · الخط الأحمر المتقطع = نهاية الصفحة
            </span>
          </div>
          <div class="bg-main-light dark:bg-lighter-dark-1 absolute end-2 top-12 z-40 flex flex-col gap-1 rounded-xl p-1 shadow-md">
            <button
              class="flex size-11 items-center justify-center rounded-lg"
              title="تكبير"
              aria-label="تكبير"
              onClick={a4ZoomIn}
            >
              <ZoomIn size={20} />
            </button>
            <button
              class="flex size-11 items-center justify-center rounded-lg"
              title="تصغير"
              aria-label="تصغير"
              onClick={a4ZoomOut}
            >
              <ZoomOut size={20} />
            </button>
          </div>
        </Show>

        {/* Row/column grip overlay: drag to reorder, tap to select */}
        <TableGripOverlay
          editor={() => editor}
          tick={tick}
          visible={() => !anySheetOpen()}
        />
      </div>

      {/* Bottom dock: toolbar and sheets live IN the layout (shrink-0), so
          the writing area above is resized instead of being covered.
          mousedown on a button must not steal focus from the editor,
          otherwise the phone keyboard closes on every tap. */}
      <div
        class="bg-main-light dark:bg-lighter-dark-1 z-50 flex w-full shrink-0 flex-col shadow-[0_-1px_6px_rgb(0_0_0/0.12)]"
        style={{ "padding-bottom": "env(safe-area-inset-bottom)" }}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") && !t.closest("input,textarea")) {
            e.preventDefault();
          }
        }}
      >
        {/* Hint shown while waiting for the second tap in "select cells" mode */}
        <Show when={cellSelectActive() && cellSelectAnchor() !== null}>
          <div
            style={{ "background-color": "var(--color-main)" }}
            class="my-1 self-center rounded-full px-3 py-1 text-xs text-white"
          >
            اضغط الخلية الثانية لإتمام التحديد
          </div>
        </Show>

        {/* Table context row: cell alignment */}
        <Show when={isActive("table") && !anySheetOpen()}>
          <div
            class="border-darker-light-2 dark:border-lighter-dark-2 flex items-center gap-1 overflow-x-auto border-b px-2 py-1"
            style={{ "scrollbar-width": "none" }}
          >
            <For each={cellAlignCommands}>
              {(item) => (
                <button
                  type="button"
                  class={tbBtn}
                  title={item.title}
                  aria-label={item.title}
                  onClick={() =>
                    editor &&
                    setSelectedCellsAttrs(editor, { textAlign: item.align })
                  }
                >
                  <item.icon size={18} />
                </button>
              )}
            </For>
            {divider}
            <For each={cellVerticalAlignCommands}>
              {(item) => (
                <button
                  type="button"
                  class={tbBtn}
                  title={item.title}
                  aria-label={item.title}
                  onClick={() =>
                    editor &&
                    setSelectedCellsAttrs(editor, { verticalAlign: item.align })
                  }
                >
                  <item.icon size={18} />
                </button>
              )}
            </For>
            {divider}
            <button
              type="button"
              class={tbBtn}
              title={
                cellSelectAnchor() !== null
                  ? "اضغط الخلية الثانية"
                  : "تحديد خليتين متجاورتين"
              }
              aria-label="تحديد عدة خلايا"
              classList={{ active: cellSelectActive() }}
              onClick={() => {
                setCellSelectActive(!cellSelectActive());
                setCellSelectAnchor(null);
              }}
            >
              <Grid2x2Check size={20} />
            </button>
            <button
              type="button"
              class={tbBtn}
              title="صفوف وأعمدة"
              aria-label="صفوف وأعمدة"
              onClick={() => setTableRowColActive(true)}
            >
              <TableProperties size={20} />
            </button>
          </div>
        </Show>

        {/* Main toolbar (replaced by a sheet while one is open) */}
        <Show when={!anySheetOpen()}>
          <div
            class="flex w-full flex-row items-center gap-0.5 overflow-x-auto px-2 py-1"
            style={{ "scrollbar-width": "none" }}
          >
            <button
              type="button"
              class={tbBtn}
              title="إدراج"
              aria-label="إدراج"
              onClick={() => setInsertActive(true)}
            >
              <Plus size={22} />
            </button>
            <button
              type="button"
              class={tbBtn}
              title="تنسيق النص"
              aria-label="تنسيق النص"
              onClick={() => setFormatActive(true)}
            >
              <CaseSensitive size={24} />
            </button>

            <For each={toolbarGroups}>
              {(group) => (
                <>
                  {divider}
                  <For each={group}>
                    {(button) => (
                      <button
                        type="button"
                        class={tbBtn}
                        title={button.title}
                        aria-label={button.title}
                        classList={{ active: isActive(button.activeKey) }}
                        onClick={button.onClick}
                      >
                        <button.icon size={20} />
                      </button>
                    )}
                  </For>
                </>
              )}
            </For>

            {divider}
            {/* Text alignment (heading/paragraph) — Kobalte dropdown */}
            <DropdownMenu>
              <DropdownMenu.Trigger
                type="button"
                class={tbBtn}
                title="محاذاة النص"
                aria-label="محاذاة النص"
              >
                <Dynamic component={currentAlignIcon()} size={20} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  class="border-darker-light-2 dark:border-lighter-dark-2 bg-main-light dark:bg-lighter-dark-1 text-header dark:text-main-light z-50 min-w-44 rounded-lg border p-1 shadow-lg"
                  dir="rtl"
                >
                  <For each={textAlignCommands}>
                    {(item) => (
                      <DropdownMenu.Item
                        class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 focus:bg-darker-light-1 dark:focus:bg-lighter-dark-2 flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-right text-sm outline-none"
                        onSelect={() =>
                          editor
                            ?.chain()
                            .focus()
                            .toggleTextAlign(item.align)
                            .run()
                        }
                      >
                        <item.icon size={18} />
                        <span class="flex-1">{item.label}</span>
                        <Show when={isTextAlign(item.align)}>
                          <Check
                            size={16}
                            style={{ color: "var(--color-main)" }}
                          />
                        </Show>
                      </DropdownMenu.Item>
                    )}
                  </For>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>
          </div>
        </Show>

        {/* Sheets (all share the same max height) */}
        <Show when={insertActive()}>
          <div class="flex max-h-[45dvh] w-full flex-col overflow-hidden pb-1">
            <MenuSheet
              title="إدراج"
              onClose={() => setInsertActive(false)}
              items={getInsertItems()}
            />
          </div>
        </Show>

        <Show when={tableRowColActive()}>
          <div class="flex max-h-[45dvh] w-full flex-col overflow-hidden pb-1">
            <MenuSheet
              title="صفوف وأعمدة"
              onClose={() => setTableRowColActive(false)}
              items={tableCommands}
            />
          </div>
        </Show>

        <Show when={formatActive()}>
          <div class="flex max-h-[45dvh] w-full flex-col overflow-hidden pb-1">
            <FormatSheet
              editor={() => editor}
              tick={tick}
              onClose={() => setFormatActive(false)}
            />
          </div>
        </Show>

        <Show when={inputReq()} keyed>
          {(req) => (
            <div class="flex w-full flex-col overflow-hidden pb-1">
              <InputSheet request={req} />
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}

function EditorHeader(props: {
  seasonId: string;
  status: () => "typing" | "saving" | "saved" | "error";
  onBack: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  a4Active: boolean;
  onToggleA4: () => void;
  subjectId: string;
  handleFileUpload: (event: Event) => void;
  handleEditDoctorName: () => void;
}) {
  const iconBtn =
    "hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex size-11 shrink-0 items-center justify-center rounded-full";
  const statusLabel = () =>
    ({
      typing: "حفظ",
      saving: "جارٍ الحفظ...",
      saved: "تم الحفظ",
      error: "فشل الحفظ — اضغط للمحاولة",
    })[props.status()];

  return (
    <div
      dir="rtl"
      class="border-darker-light-2 dark:border-lighter-dark-2 bg-main-light dark:bg-main-dark relative z-50 w-full shrink-0 border-b shadow-sm"
    >
      <div class="mx-auto flex max-w-6xl items-center gap-1 px-2 py-1">
        <button
          class={iconBtn}
          title="رجوع"
          aria-label="رجوع"
          onClick={props.onBack}
        >
          <ArrowRight size={22} />
        </button>

        <div class="text-header dark:text-main-light min-w-0 flex-1 truncate px-1 text-base font-medium">
          {props.seasonId}
        </div>

        <button
          type="button"
          class={iconBtn}
          title={statusLabel()}
          aria-label={statusLabel()}
          onClick={props.onSave}
        >
          <Switch>
            <Match when={props.status() == "typing"}>
              <Save size={20} />
            </Match>
            <Match when={props.status() == "saving"}>
              <CloudSync class="animate-pulse" size={20} />
            </Match>
            <Match when={props.status() == "saved"}>
              <CloudCheck class="text-green-700" size={20} />
            </Match>
            <Match when={props.status() == "error"}>
              <CloudOff class="text-red-700" size={20} />
            </Match>
          </Switch>
        </button>

        <button
          class={iconBtn}
          title="تراجع"
          aria-label="تراجع"
          onClick={props.onUndo}
        >
          <Undo2 size={20} />
        </button>
        <button
          class={iconBtn}
          title="إعادة"
          aria-label="إعادة"
          onClick={props.onRedo}
        >
          <Redo2 size={20} />
        </button>

        <button
          class={iconBtn}
          classList={{ "bg-main/15 text-main": props.a4Active }}
          title="عرض A4"
          aria-label="عرض A4"
          onClick={props.onToggleA4}
        >
          <FileText size={20} />
        </button>

        <Menu
          subjectId={props.subjectId}
          seasonId={props.seasonId}
          handleFileUpload={props.handleFileUpload}
          handleEditDoctorName={props.handleEditDoctorName}
        />
      </div>
    </div>
  );
}
