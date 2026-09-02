// The review editor itself: loads AI-generated content (already
// converted to Tiptap JSON via novaToTiptap) and lets the team edit it
// like a Word document — no markdown syntax knowledge required.

import {
  onCleanup,
  onMount,
  createSignal,
  Match,
  Suspense,
  Switch,
} from "solid-js";
import { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import {
  Bold,
  CloudCheck,
  CloudOff,
  CloudSync,
  FileUp,
  Italic,
  Printer,
  Save,
} from "lucide-solid";

import { NovaHeading } from "./extensions/NovaHeadingExtension";
import { NovaNote } from "./extensions/NovaNote";
import { NovaQuiz } from "./extensions/NovaQuiz";
import { NavBar } from "solid-mobile";
import { debounce } from "@/features/shared/utils/debounce";
import {
  getLecture,
  upsertLecture,
} from "@/features/shared/services/lecturesUpdates";
import { useUser } from "@/features/shared/context/user";
import { useParams, useNavigate } from "@solidjs/router";
import './nova-tiptap.css'
import './editor.css'


export default function TiptapReviewEditor(props: {
  subjectId: string;
  seasonId: string;
}) {
  let containerRef: HTMLDivElement | undefined;
  let editor: Editor | undefined;
  const [tick, setTick] = createSignal(0); // forces toolbar re-render on selection/content change

  const params = useParams();
  const subjectId = params.subject;
  const seasonId = params.season;
  const navigate = useNavigate();

  const { user } = useUser();
  const [raw, setRaw] = createSignal<string>("");
  const [status, setStatus] = createSignal<
    "typing" | "saving" | "saved" | "error"
  >("typing");

  const handleFileUpload = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setRaw(content);
        editor?.commands.setContent(content, {
          contentType: "markdown",
          emitUpdate: true,
        }); // false = don't emit update event
      };
      reader.readAsText(file);
    }
  };

  const loadLecture = async () => {
    await getLecture({
      subjectId: subjectId,
      seasonId: seasonId,
    }).then(async (result) => {
      if (result.data) {
        editor?.commands.setContent(result.data[0].content?.raw, {
          contentType: "markdown",
        }); // false = don't emit update event
      }
    });
  };

  const saveToSupabase = async () => {
    setStatus("saving");
    const { data, error } = await upsertLecture({
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

  const handleInputChange = (value: string) => {
    setStatus("typing");

    if (value !== "") {
      setRaw(value);
      debounceSave();
    }
  };

  onMount(() => {
    loadLecture();

    editor = new Editor({
      element: containerRef,
      content: raw(),
      contentType: "markdown",
      extensions: [
        StarterKit.configure({ heading: false }), // replaced by NovaHeading below
        NovaHeading,
        NovaNote,
        NovaQuiz,
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        ImageExt,
        LinkExt.configure({ openOnClick: false }),
        Markdown,
      ],
      onTransaction: () => setTick((t) => t + 1),
      onUpdate: ({ editor: e }) => handleInputChange(e.getMarkdown()),
    });
  });

  onCleanup(() => editor?.destroy());

  // Reads `tick` so Solid's JSX reactivity re-evaluates this on every
  // editor transaction (selection change, formatting toggle, typing).
  const isActive = (name: string) => {
    tick(); // reactive dependency: re-check on every editor transaction
    return editor?.isActive(name) ?? false;
  };

  return (
    <div class="bg-white">
      <NavBar title="المحرر" backArrow onBack={() => history.back()} />
      <div class="bg-main-light flex flex-row-reverse justify-evenly py-5">
        <ToolbarButton
          icon={<Printer />}
          onClick={() => {
            navigate(
              "/print?subject=" + props.subjectId + "&season=" + props.seasonId,
            );
          }}
          isActive={false}
        ></ToolbarButton>

        <ToolbarButton
          icon={
            <Switch>
              <Match when={status() == "typing"}>
                <Save />
              </Match>
              <Match when={status() == "saving"}>
                <CloudSync />
              </Match>
              <Match when={status() == "saved"}>
                <CloudCheck />
              </Match>
              <Match when={status() == "error"}>
                <CloudOff />
              </Match>
            </Switch>
          }
          onClick={saveToSupabase}
          isActive={false}
        ></ToolbarButton>

        <ToolbarButton
          icon={<FileUp />}
          isActive={false}
          onClick={() => document.getElementById("mdFile")?.click()}
        >
          <label class="text-xs" htmlFor="mdFile"></label>
          <input
            class="hidden"
            onChange={handleFileUpload}
            id="mdFile"
            type="file"
            accept=".md"
          />
        </ToolbarButton>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
          <div class="nova-tiptap-review" dir="rtl">
            <div class="nova-tiptap-toolbar mb-2 flex justify-center gap-2 px-3">
              <button
                type="button"
                classList={{ active: isActive("bold") }}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold size={18} />
              </button>
              <button
                type="button"
                classList={{ active: isActive("italic") }}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Italic size={18} />
              </button>
            </div>

            <div ref={containerRef} class="nova-tiptap-content" />
          </div>
      </Suspense>
    </div>
  );
}

function ToolbarButton(props: {
  icon: any;
  onClick: () => void;
  isActive: boolean;
  children?: any;
}) {
  return (
    <button
      class="rounded p-2 hover:bg-gray-200"
      onClick={props.onClick}
      classList={{ "text-main": props.isActive }}
    >
      {props.icon}
      {props.children}
    </button>
  );
}
