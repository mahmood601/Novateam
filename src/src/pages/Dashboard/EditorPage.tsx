// LectureEditorPage.tsx

import { createSignal } from "solid-js";
import type { Editor } from "@tiptap/core";
import TiptapEditor, { type JSONContent } from "../../components/Editor/Editor";
import EditorToolbar from "../../components/Editor/EditorToolbar";
import "../../components/Editor/editor-toolbar.css";

export default function EditorPage(props: { subjectId: string; initialContent?: JSONContent }) {
  // المحرر يُسلَّم للأب عبر onReady، والـ toolbar بيستخدم نفس الـ instance
  // — بهيك الأزرار بتنفذ أوامر مباشرة على نفس المحرر المعروض.
  const [editorInstance, setEditorInstance] = createSignal<Editor | undefined>(undefined);

  return (
    <div class="nova-lecture-page px-5">
      {/* المحتوى أولاً — الشريط ثابت أسفل الشاشة فوق لوحة المفاتيح */}
      <TiptapEditor
        content={props.initialContent}
        onReady={(ed) => setEditorInstance(ed)}
        onChange={(json) => {
          // TODO: احفظ json بجدول formatted_lectures (subjectId + debounce)
          console.log("content changed for subject", props.subjectId, json);
        }}
      />
      <EditorToolbar editor={editorInstance} />
    </div>
  );
}