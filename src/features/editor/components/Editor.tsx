import { useUser } from "@/features/shared/context/user";
import { parseMarkdownToNova } from "../lib/mdastToNova";
import NovaRenderer from "./render/NovaRenderer";
import {
  upsertLecture,
  getLecture,
} from "@/features/shared/services/lecturesUpdates";
import { useNavigate, useParams } from "@solidjs/router";
import {
  createResource,
  createSignal,
  Match,
  onMount,
  Show,
  Suspense,
  Switch,
} from "solid-js";
import {  NavBar } from "solid-mobile";

import {
  BookOpenText,
  CloudCheck,
  CloudOff,
  CloudSync,
  FileUp,
  Pencil,
  Printer,
  Save,
} from "lucide-solid";
import { debounce } from "@/features/shared/utils/debounce";
import TiptapReviewEditor from "../tiptap/TiptapReviewEditor";



export default function Editor(props: { subjectId: string; seasonId: string }) {
  const params = useParams();
  const subjectId = params.subject;
  const seasonId = params.season;
  const navigate = useNavigate();

  const { user } = useUser();
  const [raw, setRaw] = createSignal<string>("");
  const [novaDoc] = createResource(raw, parseMarkdownToNova);
  const [mode, setMode] = createSignal<"edit" | "preview">("edit");
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
      };
      reader.readAsText(file);
    }
  };

  const loadLecture = async () => {
    await getLecture({
      subjectId: props.subjectId,
      seasonId: props.seasonId,
    }).then(async (result) => {
      if (result.data) {
        setRaw(result.data[0].content?.raw ?? "");
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
  });

  return (
    <div class="bg-white">
      <NavBar title="المحرر" backArrow onBack={() => history.back()} />
      <div class="bg-main-light flex flex-row-reverse justify-evenly py-5">
        <ToolbarButton
          icon={<Pencil />}
          onClick={() => setMode("edit")}
          isActive={mode() === "edit"}
        ></ToolbarButton>

        <ToolbarButton
          icon={<BookOpenText />}
          onClick={() => setMode("preview")}
          isActive={mode() === "preview"}
        ></ToolbarButton>

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
        <Show when={mode() === "edit"}>
          {/* <textarea
            placeholder=" Type here..."
            unicode-bidi="plaintext"
            class="h-screen w-screen overflow-y-scroll p-2 outline-none"
            dir="auto"
            value={raw()}
            onInput={handleInputChange}
          ></textarea> */}
          <TiptapReviewEditor content={raw()} onChange={handleInputChange}/>
        </Show>
        <Show when={mode() === "preview"}>
          <Show when={novaDoc()}>
            <NovaRenderer document={novaDoc()!} />
          </Show>
        </Show>
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
