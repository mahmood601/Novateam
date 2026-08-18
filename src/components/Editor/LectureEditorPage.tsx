// LectureEditorPage.tsx

import { createSignal } from "solid-js";
import type { Editor } from "@tiptap/core";
import TiptapEditor, { type JSONContent } from "../../pages/Editor";
import EditorToolbar from "./EditorToolbar";
import "./editor-toolbar.css";

export default function LectureEditorPage(props: { subjectId: string; initialContent?: JSONContent }) {
  // المحرر يُسلَّم للأب عبر onReady، والـ toolbar بيستخدم نفس الـ instance
  // — بهيك الأزرار بتنفذ أوامر مباشرة على نفس المحرر المعروض.
  const [editorInstance, setEditorInstance] = createSignal<Editor | undefined>(undefined);

  return (
    <div class="nova-lecture-page px-5">
      <EditorToolbar editor={editorInstance} />
      <TiptapEditor
        content={props.initialContent}
        onReady={(ed) => setEditorInstance(ed)}
        onChange={(json) => {
          // TODO: احفظ json بجدول formatted_lectures (subjectId + debounce) — لسا ما وصلنا لهاي المرحلة
          console.log("content changed for subject", props.subjectId, json);
        }}
      />
    </div>
  );
}