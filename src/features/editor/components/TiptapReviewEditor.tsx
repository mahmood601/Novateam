// The review editor itself: loads AI-generated content (already
// converted to Tiptap JSON via novaToTiptap) and lets the team edit it
// like a Word document — no markdown syntax knowledge required.

import {
  onCleanup,
  onMount,
  createSignal,
  For,
  Match,
  Show,
  Suspense,
  Switch,
} from "solid-js";
import { Editor, JSONContent } from "@tiptap/core";
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
  ArrowLeft,
  Bold,
  CaseSensitive,
  Check,
  CloudCheck,
  CloudOff,
  CloudSync,
  Columns3,
  Copy,
  Eraser,
  ImagePlus,
  Images,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Plus,
  Redo2,
  Rows3,
  Save,
  Strikethrough,
  Table2,
  TableCellsMerge,
  TableProperties,
  Trash2,
  Underline,
  Undo2,
  Workflow,
  X,
} from "lucide-solid";

import { debounce } from "@/features/shared/utils/debounce";
import {
  getLecture,
  upsertLecture,
} from "@/features/shared/services/lecturesUpdates";
import { useUser } from "@/features/shared/context/user";
import { useParams, useNavigate } from "@solidjs/router";

import "../styles/editor.css";
import "../../../../public/print/paged-print.css";
import { extensionsArr } from "../tiptap/extensions/extensionsArr";
import Menu from "./DropdownMenu";
import { useKeyboardToolbar } from "../hooks/usekeyboardToolbar";
import MenuSheet, { type MenuSheetItem } from "./MenuSheet";
import FormatSheet from "./FormatSheet";
import TableGripOverlay from "../tiptap/extensions/table/TableGripOverlay";
import {
  clearSelectedCellsContent,
  duplicateCurrentColumn,
  duplicateCurrentRow,
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
  const { offset } = useKeyboardToolbar();
  const [tick, setTick] = createSignal(0); // forces toolbar re-render on selection/content change

  // MS Word–style "insert table" grid picker
  const TABLE_PICKER_MAX_ROWS = 8;
  const TABLE_PICKER_MAX_COLS = 10;

  const [insertActive, setInsertActive] = createSignal(false);
  const [formatActive, setFormatActive] = createSignal(false);
  const [tableRowColActive, setTableRowColActive] = createSignal(false);

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
      doctorName: "",
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

  const addFigure = () => {
    const url = window.prompt("URL");
    const caption = window.prompt("caption");

    if (url) {
      editor
        ?.chain()
        .focus()
        .setImage({ src: url, caption: caption || "" } as any)
        .run();
    }
  };

  /** Build the insert-menu items. Editor must already exist. */
  const getInsertItems = (): MenuSheetItem[] => [
    {
      id: "image",
      label: "صورة",
      icon: ImagePlus,
      onClick: () => {
        addFigure();
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
  ];

  onMount(() => {
    loadLecture();

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

  const toolbarButtons = [
    {
      icon: Plus,
      title: "Insert",
      activeKey: "insert",
      onClick: () => setInsertActive(!insertActive()),
    },
    {
      icon: CaseSensitive,
      title: "Format",
      activeKey: "format",
      onClick: () => setFormatActive(!formatActive()),
    },
    {
      icon: Bold,
      title: "Bold",
      activeKey: "bold",
      onClick: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      title: "Italic",
      activeKey: "italic",
      onClick: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      icon: Underline,
      title: "Underline",
      activeKey: "underline",
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      icon: Strikethrough,
      title: "Strikethrough",
      activeKey: "strike",
      onClick: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      icon: List,
      title: "Bullet list",
      activeKey: "bulletList",
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      title: "Numbered list",
      activeKey: "orderedList",
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: IndentIncrease,
      title: "Indent (nest list level)",
      activeKey: "indent",
      onClick: () => editor?.chain().focus().liftListItem("listItem").run(),
    },
    {
      icon: IndentDecrease,
      title: "Outdent (lift list level)",
      activeKey: "outdent",
      onClick: () => editor?.chain().focus().sinkListItem("listItem").run(),
    },
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
      label: "+Row ↑",
      onClick: () => editor?.chain().focus().addRowBefore().run(),
    },
    {
      id: "add-row-after",
      icon: Plus,
      label: "+Row ↓",
      onClick: () => editor?.chain().focus().addRowAfter().run(),
    },
    {
      id: "delete-row",
      icon: Trash2,
      label: "−Row",
      onClick: () => editor?.chain().focus().deleteRow().run(),
    },
    {
      id: "add-col-before",
      icon: Plus,
      label: "+Col ←",
      onClick: () => editor?.chain().focus().addColumnBefore().run(),
    },
    {
      id: "add-col-after",
      icon: Plus,
      label: "+Col →",
      onClick: () => editor?.chain().focus().addColumnAfter().run(),
    },
    {
      id: "delete-col",
      icon: Trash2,
      label: "−Col",
      onClick: () => editor?.chain().focus().deleteColumn().run(),
    },
    {
      id: "merge-split",
      icon: TableCellsMerge,
      label: "Merge/Split",
      onClick: () => editor?.chain().focus().mergeOrSplit().run(),
    },
    {
      id: "duplicate-row",
      icon: Copy,
      label: "Duplicate row",
      onClick: () => editor && duplicateCurrentRow(editor),
    },
    {
      id: "duplicate-col",
      icon: Copy,
      label: "Duplicate col",
      onClick: () => editor && duplicateCurrentColumn(editor),
    },
    {
      id: "clear-content",
      icon: Eraser,
      label: "Clear content",
      onClick: () => editor && clearSelectedCellsContent(editor),
    },
    {
      id: "header-row",
      icon: Rows3,
      label: "Header row",
      onClick: () => editor?.chain().focus().toggleHeaderRow().run(),
    },
    {
      id: "header-col",
      icon: Columns3,
      label: "Header col",
      onClick: () => editor?.chain().focus().toggleHeaderColumn().run(),
    },
    {
      id: "header-cell",
      icon: TableProperties,
      label: "Header cell",
      onClick: () => editor?.chain().focus().toggleHeaderCell().run(),
    },
    {
      id: "delete-table",
      icon: Trash2,
      label: "Delete Table",
      onClick: () => editor?.chain().focus().deleteTable().run(),
    },
  ];

  const cellAlignCommands: {
    icon: any;
    title: string;
    align: CellTextAlign;
  }[] = [
    { icon: AlignLeft, title: "Align left", align: "left" },
    { icon: AlignCenter, title: "Align center", align: "center" },
    { icon: AlignRight, title: "Align right", align: "right" },
    { icon: AlignJustify, title: "Justify", align: "justify" },
  ];

  const cellVerticalAlignCommands: {
    icon: any;
    title: string;
    align: CellVerticalAlign;
  }[] = [
    { icon: AlignVerticalJustifyStart, title: "Align top", align: "top" },
    {
      icon: AlignVerticalJustifyCenter,
      title: "Align middle",
      align: "middle",
    },
    { icon: AlignVerticalJustifyEnd, title: "Align bottom", align: "bottom" },
  ];

  return (
    <div class="relative bg-white">
      <EditorHeader
        seasonId={seasonId}
        status={status}
        onBack={() => navigate(-1)}
        onSave={saveToSupabase}
        onUndo={() => editor?.chain().focus().undo().run()}
        onRedo={() => editor?.chain().focus().redo().run()}
        onInsert={() => setInsertActive(true)}
        subjectId={props.subjectId}
        handleFileUpload={handleFileUpload}
      />

      <div class="nova-tiptap-review mt-6" dir="rtl">
        <Suspense fallback={<div>Loading...</div>}>
          <div ref={containerRef} class="nova-tiptap-content mb-6" />
        </Suspense>

        {/* Floating formatting toolbar (hidden while a sheet is open) */}
        <Show when={!insertActive() && !formatActive() && !tableRowColActive()}>
          <div
            style={{ transform: `translate(-50%, -${offset()}px)` }}
            class="fixed bottom-0 left-1/2 z-50 w-screen flex flex-row-reverse gap-2 overflow-scroll bg-white px-3 py-2 shadow-md"
          >
            <For each={toolbarButtons}>
              {(button) => (
                <button
                  type="button"
                  class="hover:bg-darker-light-1 rounded p-2"
                  title={button.title}
                  classList={{ active: isActive(button.activeKey) }}
                  onClick={button.onClick}
                >
                  <button.icon size={18} />
                </button>
              )}
            </For>

            {/* Text alignment (heading/paragraph) — Kobalte dropdown, same
                library as the "⋮" menu in DropdownMenu.tsx */}
            <DropdownMenu>
              <DropdownMenu.Trigger
                type="button"
                class="hover:bg-darker-light-1 rounded p-2"
                title="Text alignment"
              >
                <Dynamic component={currentAlignIcon()} size={18} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  class="z-50 min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                  dir="rtl"
                >
                  <For each={textAlignCommands}>
                    {(item) => (
                      <DropdownMenu.Item
                        class="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-right text-sm text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
                        onSelect={() =>
                          editor
                            ?.chain()
                            .focus()
                            .toggleTextAlign(item.align)
                            .run()
                        }
                      >
                        <item.icon size={16} />
                        <span class="flex-1">{item.label}</span>
                        <Show when={isTextAlign(item.align)}>
                          <Check size={14} style={{ color: "var(--color-main)" }} />
                        </Show>
                      </DropdownMenu.Item>
                    )}
                  </For>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>

            {/* Only shown while the selection is inside a table */}
            <Show when={isActive("table")}>
              <button
                type="button"
                class="hover:bg-darker-light-1 rounded p-2"
                title="Rows & columns"
                classList={{ active: tableRowColActive() }}
                onClick={() => setTableRowColActive(!tableRowColActive())}
              >
                <TableProperties size={18} />
              </button>
            </Show>
          </div>
        </Show>

        {/* Insert sheet driven by reusable MenuSheet */}
        <Show when={insertActive()}>
          <div class="fixed bottom-0 left-0 z-40 flex max-h-[80vh] w-screen flex-col overflow-hidden bg-white pb-1 shadow-lg">
            <MenuSheet
              title="ادراج"
              onClose={() => setInsertActive(false)}
              items={getInsertItems()}
            />
          </div>
        </Show>

        {/* Rows/columns sheet: everything that used to be inline in the
            table context toolbar below (add/delete row & column, merge,
            duplicate, clear, header toggles) */}
        <Show when={tableRowColActive()}>
          <div class="fixed bottom-0 left-0 z-40 flex max-h-[80vh] w-screen flex-col overflow-hidden bg-white pb-1 shadow-lg">
            <MenuSheet
              title="صفوف وأعمدة"
              onClose={() => setTableRowColActive(false)}
              items={tableCommands}
            />
          </div>
        </Show>

        {/* "Aa" format sheet: text style, font, color, highlight, sub/superscript */}
        <Show when={formatActive()}>
          <div
            style={{ transform: `translate(0, -${offset()}px)` }}
            class="fixed bottom-0 left-0 z-50 flex max-h-[80vh] w-screen flex-col overflow-hidden bg-white pb-1 shadow-lg"
          >
            <FormatSheet
              editor={() => editor}
              tick={tick}
              onClose={() => setFormatActive(false)}
            />
          </div>
        </Show>

        {/* Table context toolbar: delete table + cell alignment. Row/column
            add-delete-merge-etc. commands moved to the sheet above,
            reachable via the "Rows & columns" button. */}
        <Show when={isActive("table")}>
          <div
            style={{ transform: `translate(-50%, -${offset() + 50}px)` }}
            class={`fixed bottom-0 left-1/2  flex items-center justify-center gap-1 px-3 text-xs`}
          >
            <For each={cellAlignCommands}>
              {(item) => (
                <button
                  type="button"
                  class="rounded p-1.5 hover:opacity-80"
                  title={item.title}
                  style={{
                    "background-color": "var(--color-darker-light-1)",
                    color: "var(--color-header)",
                  }}
                  onClick={() =>
                    editor &&
                    setSelectedCellsAttrs(editor, { textAlign: item.align })
                  }
                >
                  <item.icon size={14} />
                </button>
              )}
            </For>

            <For each={cellVerticalAlignCommands}>
              {(item) => (
                <button
                  type="button"
                  class="rounded p-1.5 hover:opacity-80"
                  title={item.title}
                  style={{
                    "background-color": "var(--color-darker-light-1)",
                    color: "var(--color-header)",
                  }}
                  onClick={() =>
                    editor &&
                    setSelectedCellsAttrs(editor, { verticalAlign: item.align })
                  }
                >
                  <item.icon size={14} />
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Row/column grip overlay: drag to reorder, tap to select */}
        <TableGripOverlay
          editor={() => editor}
          tick={tick}
          visible={() =>
            !insertActive() && !formatActive() && !tableRowColActive()
          }
        />
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
  onInsert: () => void;
  subjectId: string;
  handleFileUpload: (event: Event) => void;
}) {
  return (
    <div class="border-darker-light-2 fixed top-0 left-0 z-50 w-full border-b bg-white/80 shadow-sm backdrop-blur-sm">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <button
          class="hover:bg-darker-light-1 flex items-center rounded p-2"
          title="Back"
          onClick={props.onBack}
        >
          <ArrowLeft size={20} />
        </button>

        <div class="text-header flex-1 text-center text-[18px] font-medium">
          <span>{props.seasonId}</span>
        </div>

        <div class="flex items-center gap-2">
          <div
            class="cursor-pointer rounded p-1"
            title="Save"
            onClick={props.onSave}
          >
            <Switch>
              <Match when={props.status() == "typing"}>
                <Save size={18} />
              </Match>
              <Match when={props.status() == "saving"}>
                <CloudSync size={18} />
              </Match>
              <Match when={props.status() == "saved"}>
                <CloudCheck class="text-green-700" size={18} />
              </Match>
              <Match when={props.status() == "error"}>
                <CloudOff class="text-red-700" size={18} />
              </Match>
            </Switch>
          </div>

          <button
            class="hover:bg-darker-light-1 rounded-full p-2"
            title="Undo"
            onClick={props.onUndo}
          >
            <Undo2 size={20} />
          </button>
          <button
            class="hover:bg-darker-light-1 rounded-full p-2"
            title="Redo"
            onClick={props.onRedo}
          >
            <Redo2 size={20} />
          </button>

          <button
            class="hover:bg-darker-light-1 rounded-full p-2"
            title="Insert"
            onClick={props.onInsert}
          >
            <Plus size={20} />
          </button>

          <Menu
            subjectId={props.subjectId}
            seasonId={props.seasonId}
            handleFileUpload={props.handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
}
