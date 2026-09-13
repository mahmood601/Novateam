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
import {
  ArrowLeft,
  Bold,
  CaseSensitive,
  CloudCheck,
  CloudOff,
  CloudSync,
  ImagePlus,
  Images,
  Italic,
  Plus,
  Redo2,
  Save,
  Strikethrough,
  Table2,
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
  ];

  const tableCommands = [
    {
      label: "+Row ↑",
      title: "Add row above",
      onClick: () => editor?.chain().focus().addRowBefore().run(),
    },
    {
      label: "+Row ↓",
      title: "Add row below",
      onClick: () => editor?.chain().focus().addRowAfter().run(),
    },
    {
      label: "−Row",
      title: "Delete row",
      onClick: () => editor?.chain().focus().deleteRow().run(),
    },
    {
      label: "+Col ←",
      title: "Add column before",
      onClick: () => editor?.chain().focus().addColumnBefore().run(),
    },
    {
      label: "+Col →",
      title: "Add column after",
      onClick: () => editor?.chain().focus().addColumnAfter().run(),
    },
    {
      label: "−Col",
      title: "Delete column",
      onClick: () => editor?.chain().focus().deleteColumn().run(),
    },
    {
      label: "Merge/Split",
      title: "Merge selected cells, or split a merged cell",
      onClick: () => editor?.chain().focus().mergeOrSplit().run(),
    },
    {
      label: "Header row",
      title: "Toggle header row",
      onClick: () => editor?.chain().focus().toggleHeaderRow().run(),
    },
    {
      label: "Header col",
      title: "Toggle header column",
      onClick: () => editor?.chain().focus().toggleHeaderColumn().run(),
    },
    {
      label: "Header cell",
      title: "Toggle header cell",
      onClick: () => editor?.chain().focus().toggleHeaderCell().run(),
    },
  ];

  return (
    <div class="relative bg-white">
      <EditorHeader
        seasonId={seasonId}
        status={status}
        onBack={() => navigate(-1)}
        onSave={saveToSupabase}
        onUndo={() => editor?.chain().focus().undo()}
        onRedo={() => editor?.chain().focus().redo()}
        onInsert={() => setInsertActive(true)}
        subjectId={props.subjectId}
        handleFileUpload={handleFileUpload}
      />

      <div class="nova-tiptap-review mt-6" dir="rtl">
        <Suspense fallback={<div>Loading...</div>}>
          <div ref={containerRef} class="nova-tiptap-content mb-6" />
        </Suspense>

        {/* Floating formatting toolbar (hidden while a sheet is open) */}
        <Show when={!insertActive() && !formatActive()}>
          <div
            style={{ transform: `translate(-50%, -${offset()}px)` }}
            class="fixed bottom-0 left-1/2 z-50 flex flex-row-reverse gap-2 overflow-visible bg-white px-3 py-2 shadow-md"
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
          </div>
        </Show>

        {/* Insert sheet driven by reusable MenuSheet */}
        <Show when={insertActive()}>
          <div class="fixed bottom-0 left-0 z-40 flex max-h-[80vh] w-screen flex-col overflow-hidden bg-white pb-1 shadow-lg">
            <MenuSheet
              onClose={() => setInsertActive(false)}
              items={getInsertItems()}
              setInsertActive={setInsertActive}
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

        {/* Table context toolbar */}
        <Show when={isActive("table")}>
          <div class="nova-tiptap-table-toolbar mb-2 flex flex-wrap items-center justify-center gap-1 px-3 text-xs">
            <For each={tableCommands}>
              {(item) => (
                <TableCmdButton
                  label={item.label}
                  title={item.title}
                  onClick={item.onClick}
                />
              )}
            </For>

            <button
              type="button"
              class="flex items-center gap-1 rounded px-2 py-1"
              title="Delete table"
              style={{ color: "var(--color-warn)" }}
              onClick={() => editor?.chain().focus().deleteTable().run()}
            >
              <Trash2 size={14} />
              Delete table
            </button>
          </div>
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

/** Self-contained table size picker used as a MenuSheet panel. */
function TablePickerPanel(props: {
  maxRows: number;
  maxCols: number;
  onSelect: (rows: number, cols: number) => void;
}) {
  const [rows, setRows] = createSignal(3);
  const [cols, setCols] = createSignal(3);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  return (
    <div class="bg-main-light border-darker-light-2 w-full overflow-y-scroll min-w-50 rounded-lg border p-3 shadow-lg">
      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1 text-sm">
          <span>صفوف (Rows)</span>
          <input
            type="number"
            min={1}
            max={props.maxRows}
            value={rows()}
            class="border-darker-light-2 rounded border px-2 py-1.5 text-center"
            onInput={(e) =>
              setRows(clamp(Number(e.currentTarget.value) || 1, 1, props.maxRows))
            }
          />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          <span>أعمدة (Columns)</span>
          <input
            type="number"
            min={1}
            max={props.maxCols}
            value={cols()}
            class="border-darker-light-2 rounded border px-2 py-1.5 text-center"
            onInput={(e) =>
              setCols(clamp(Number(e.currentTarget.value) || 1, 1, props.maxCols))
            }
          />
        </label>

        <button
          type="button"
          class="mt-1 rounded bg-main px-3 py-2 text-sm text-white hover:opacity-90"
          onClick={() => props.onSelect(rows(), cols())}
        >
          إدراج جدول ({rows()} × {cols()})
        </button>
      </div>
    </div>
  );
}

function TableCmdButton(props: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class="rounded px-2 py-1 hover:opacity-80"
      title={props.title}
      style={{
        "background-color": "var(--color-darker-light-1)",
        color: "var(--color-header)",
      }}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}
