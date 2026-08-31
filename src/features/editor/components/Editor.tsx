import { Show, Suspense } from "solid-js";
import { EditorToolbar } from "./EditorToolbar";
import { EditorOutline } from "./EditorOutline";
import { EditorSource } from "./EditorSource";
import { NovaRenderer } from "./NovaRenderer";
import { createEditorStore } from "../stores/editorStore";

export function Editor() {
  const { raw, setRaw, document } = createEditorStore();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div class="flex h-full flex-col">
      <EditorToolbar title={document()?.title} onPrint={handlePrint} />

      <div class="flex min-h-0 flex-1">
        {/* <EditorOutline document={document()} /> */}

        {/* Source + Preview side by side */}
        <main class="flex min-w-0 flex-1 flex-col divide-y divide-slate-200 dark:divide-slate-800 lg:flex-row lg:divide-x lg:divide-y-0">
          {/* Markdown source — لا يُطبع */}
          <div class="no-print min-h-0 flex-1 overflow-auto lg:w-1/2">
            <EditorSource value={raw()} onInput={setRaw} />
          </div>

          {/* Preview — هاد الجزء يُطبع */}
          <div class="print-area min-h-0 flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 lg:w-1/2">
          <Suspense>
            <Show when={document()} fallback={<p class="p-6 text-sm text-slate-400">...جاري المعالجة</p>}>
              {(doc) => (
                <div class="mx-auto max-w-3xl bg-white shadow-sm dark:bg-slate-950">
                  <NovaRenderer document={doc()} />
                </div>
              )}
            </Show>
          </Suspense>

          </div>
        </main>
      </div>
    </div>
  );
}

import { useUser } from "@/features/shared/context/user";
import { parseMarkdown } from "@/features/lectures/lib/parseMarkdown";
import { upsertLecture, getLecture } from "@/features/shared/services/lecturesUpdates";
import { useNavigate, useParams } from "@solidjs/router";
import {
  createResource,
  createSignal,
  onMount,
  Show,
  Suspense,
} from "solid-js";
import { Button, NavBar } from "solid-mobile";
import PrintTemplate from "./Print/PrintTemplate";

// text for testing
// ---
// title: Test
// tags: [test]
// ---

// # Hello World

// This is a test of the **markdown parser**.

// > This is a callout.

// > [!note]
// > This is a note callout.

// - Item 1
// - Item 2
// - Item 3

export default function Editor(props: { subjectId: string; seasonId: string }) {
  const params = useParams();
  const subjectId = params.subject;
  const seasonId = params.season;
  const navigate = useNavigate()

  const { user } = useUser();
  const [raw, setRaw] = createSignal<string>("");
  const [html] = createResource(raw, parseMarkdown);
  const [mode, setMode] = createSignal("edit"); // "edit" | "preview"

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
    const saved = localStorage.getItem(
      `draft-${props.subjectId}-${props.seasonId}`,
    );
    await getLecture({
      subjectId: props.subjectId,
      seasonId: props.seasonId,
    }).then(async (result) => {
      if (result.data) {
        console.log("Loaded lecture:", result.data);
        setRaw(result.data[0].content?.raw ?? "");
      } else {
        console.error("Failed to load lecture:", result.error);
        if (saved) setRaw(saved);
      }
    });
    if (saved == "") {
      localStorage.removeItem(`draft-${props.subjectId}-${props.seasonId}`);
    }
  };

  const saveLocal = () => {
    localStorage.setItem(`draft-${props.subjectId}-${props.seasonId}`, raw());
  };

  const saveToSupabase = async () => {
    console.log(user());

    await upsertLecture({
      subjectId: props.subjectId,
      seasonId: props.seasonId,
      rawContent: raw(),
      userId: user()?.id,
      doctorName: "",
    });
  };

  onMount(() => {
    loadLecture();
  });

  return (
    <div class="bg-main-light">
      <NavBar title="المحرر" backArrow onBack={() => history.back()} />
      <div class="bg-main-light flex flex-row-reverse justify-evenly py-5">
        <Button
          class=""
          size="sm"
          classList={{ active: mode() === "edit" }}
          onClick={() => setMode("edit")}
        >
          تحرير
        </Button>
        <Button
          size="sm"
          classList={{ active: mode() === "preview" }}
          onClick={() => setMode("preview")}
        >
          معاينة
        </Button>
        <Button
          size="sm"
          classList={{ active: mode() === "print" }}
          onClick={() => {
            navigate("/print?subject=" + props.subjectId + "&season=" + props.seasonId);
          }}
        >
          معاينة للطباعة
        </Button>
        <Button size="sm" onClick={saveLocal}>
          حفظ محلي
        </Button>
        <Button size="sm" onClick={saveToSupabase}>
          حفظ على قاعدة البيانات
        </Button>
        <Button
          class=""
          size="sm"
          classList={{ active: mode() === "edit" }}
          onClick={() => setMode("edit")}
        >
          <label class="text-xs" for="mdFile">
            {" "}
            رفع ملف
          </label>
          <input
            class="hidden"
            onChange={handleFileUpload}
            id="mdFile"
            type="file"
            accept=".md"
          />
        </Button>
      </div>
      <Show when={mode() === "edit"}>
        <textarea
          class="h-screen w-screen overflow-y-scroll p-2 outline-none"
          dir="auto"
          value={raw()}
          onInput={(e) => setRaw(e.target.value)}
        ></textarea>
      </Show>
      <Show when={mode() === "preview"}>
        <Suspense fallback={<div>Loading...</div>}>
          <RenderedContent html={html() ?? ""} />
        </Suspense>
      </Show>
      <Show when={mode() === "print"}>
        <Suspense fallback={<div>Loading...</div>}>
          <PrintTemplate
            subjectName="فيزيويوجيا"
            lectureNumber="1"
            lectureTitle="الهضم"
            doctorName="ربا غانم"
            year="الثانية"
            semester="الثاني"
            contentHtml={html() ?? ""}
          />
        </Suspense>
      </Show>
    </div>
  );
}

function RenderedContent(props: { html: string }) {
  return <div class="nova-content" innerHTML={props.html}></div>;
}
