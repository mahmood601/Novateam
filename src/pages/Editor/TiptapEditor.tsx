// TiptapEditor.tsx
// SolidJS wrapper around Tiptap core (framework-agnostic editor engine).
// Usage:
//   <TiptapEditor content={initialJSON} onChange={(json) => save(json)} />

import { onMount, onCleanup, createEffect, createSignal } from "solid-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { InfoBox } from "./extensions/InfoBox";
import { ColorTable } from "./extensions/ColorTable";
import { NovaHeading } from "./extensions/NovaHeading";

// A JSONContent is Tiptap's own doc shape — this is what gets stored
// in Supabase (e.g. formatted_lectures.content_json), same philosophy
// as the passage/question JSON architecture already used in Nova.
export type JSONContent = Record<string, any>;

interface TiptapEditorProps {
  content?: JSONContent;
  editable?: boolean; // false for read-only render (e.g. inside PagedExport)
  onChange?: (json: JSONContent) => void;
  onReady?: (editor: Editor) => void;
}

export default function TiptapEditor(props: TiptapEditorProps) {
  let containerEl: HTMLDivElement | undefined;
  const [editor, setEditor] = createSignal<Editor | undefined>(undefined);

  onMount(() => {
    const ed = new Editor({
      element: containerEl,
      editable: props.editable ?? true,
      extensions: [
        StarterKit,
        InfoBox,
        ColorTable,
        NovaHeading,
      ],
      content: props.content ?? "",
      onUpdate: ({ editor }) => {
        props.onChange?.(editor.getJSON());
      },
    });

    setEditor(ed);
    props.onReady?.(ed);
  });

  // If content prop changes from outside (e.g. loading a different
  // lecture), resync the editor without destroying it.
  createEffect(() => {
    const next = props.content;
    const ed = editor();
    if (ed && next && JSON.stringify(ed.getJSON()) !== JSON.stringify(next)) {
      ed.commands.setContent(next, false);
    }
  });

  onCleanup(() => {
    editor()?.destroy();
  });

  return <div ref={(el) => (containerEl = el)} class="mt-16 p-5" dir="rtl" />;
}

