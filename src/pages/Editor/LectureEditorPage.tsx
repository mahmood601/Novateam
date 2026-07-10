// LectureEditorPage.tsx
// مثال استخدام: يوضح كيف يترابط EditorToolbar مع TiptapEditor.
// انسخ هذا النمط داخل صفحة المحاضرة الفعلية بـ Nova.

import { createSignal } from "solid-js";
import type { Editor } from "@tiptap/core";
import TiptapEditor, { type JSONContent } from "./TiptapEditor";
import EditorToolbar from "./EditorToolbar";
import "./editor-toolbar.css";

export default function LectureEditorPage(props: { initialContent?: JSONContent }) {
  // المحرر يُسلَّم للأب عبر onReady، والـ toolbar بيستخدم نفس الـ instance
  // — بهيك الأزرار بتنفذ أوامر مباشرة على نفس المحرر المعروض.
  const [editorInstance, setEditorInstance] = createSignal<Editor | undefined>(undefined);

  return (
    <div class="nova-lecture-page mt-16">
      <EditorToolbar editor={editorInstance} />
      <TiptapEditor
        content={props.initialContent}
        onReady={(ed) => setEditorInstance(ed)}
        onChange={(json) => {
          // TODO: احفظ json بجدول formatted_lectures (debounce قبل الحفظ الفعلي)
          console.log("content changed", json);
        }}
      />
    </div>
  );
}
