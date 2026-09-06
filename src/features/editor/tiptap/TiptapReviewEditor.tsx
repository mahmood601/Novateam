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
import { Editor, JSONContent } from "@tiptap/core";
import {
  Bold,
  CloudCheck,
  CloudOff,
  CloudSync,
  FileUp,
  Image,
  ImagePlus,
  Images,
  Italic,
  Printer,
  Save,
  Workflow,
} from "lucide-solid";

import { NavBar } from "solid-mobile";
import { debounce } from "@/features/shared/utils/debounce";
import {
  getLecture,
  upsertLecture,
} from "@/features/shared/services/lecturesUpdates";
import { useUser } from "@/features/shared/context/user";
import { useParams, useNavigate } from "@solidjs/router";

import "./editor.css";
import "../../../../public/print/paged-print.css";
import { extensionsArr } from "./extensions/extensionsArr";

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
        }); // false = don't emit update event
      };
      setRaw(editor?.getJSON() || null); // update raw state with the new content
      reader.readAsText(file);
    }
  };

  const loadLecture = async () => {
    const content = await getLecture({
      subjectId: subjectId,
      seasonId: seasonId,
    });

    const json = content.data[0]?.content.raw;

    editor?.commands.setContent(json, {
      contentType: "json",
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
        .setImage({ src: url, caption: caption || null })
        .run();
    }
  };

  onMount(() => {
    loadLecture();

    editor = new Editor({
      element: containerRef,
      content: raw(),
      contentType: "markdown",
      extensions: [...extensionsArr],
      onTransaction: () => setTick((t) => t + 1),
      onUpdate: ({ editor: e }) => handleInputChange(e.getJSON()),
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

            <button
              type="button"
              classList={{ active: isActive("mermaid") }}
              onClick={() => editor?.commands.setMermaid()}
            >
              <Workflow size={18} />
            </button>

            <button
              type="button"
              classList={{ active: isActive("image") }}
              onClick={addFigure}
            >
              <ImagePlus size={18} />
            </button>

            <button
              type="button"
              classList={{ active: isActive("images") }}
              onClick={() => editor?.commands.setImageGallery()}
            >
              <Images size={18} />
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
