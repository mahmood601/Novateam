// src/extensions/mermaid/MermaidView.tsx
import {
  Component,
  createSignal,
  createEffect,
  onCleanup,
  Show,
} from "solid-js";
import { NodeViewWrapper } from "tiptap-solid";
import type { MermaidNodeViewProps } from "./types";
import { renderMermaidToSvg } from "@/features/editor/lib/mermaid-renderer";

const MermaidView: Component<MermaidNodeViewProps> = (props) => {
  const [isEditing, setIsEditing] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isRendering, setIsRendering] = createSignal(false);

  let containerRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const content = () => props.node.attrs.content || "";

  const renderDiagram = async (code: string) => {
    if (!containerRef || !code.trim()) return;

    setIsRendering(true);
    setError(null);

    try {
      const svg = await renderMermaidToSvg(code);

      if (containerRef) {
        containerRef.innerHTML = svg;
      }
    } catch (err: any) {
      const message = err?.message || "فشل في رسم المخطط";
      setError(message);

      if (containerRef) {
        containerRef.innerHTML = `
          <pre style="
            color: var(--destructive);
            background: color-mix(in srgb, var(--destructive) 12%, var(--card));
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            white-space: pre-wrap;
            overflow-x: auto;
          ">${code}</pre>
        `;
      }
    } finally {
      setIsRendering(false);
    }
  };

  createEffect(() => {
    const code = content();
    if (!isEditing() && code) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        renderDiagram(code);
      }, props.extension.options.debounceMs ?? 350);
    }
  });

  onCleanup(() => {
    clearTimeout(debounceTimer);
  });

  const handleSave = () => {
    const newContent = textareaRef?.value ?? "";
    props.updateAttributes({ content: newContent });
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <NodeViewWrapper
      class="nova-mermaid"
      data-drag-handle
      style={{
        "border-radius": "10px",
        border: props.selected ? "2px solid var(--primary)" : "1px solid var(--border)",
        background: "var(--card)",
        margin: "1.25rem 0",
        overflow: "hidden",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          padding: "8px 12px",
          background: "var(--muted)",
          "border-bottom": "1px solid var(--border)",
          "font-size": "12px",
          color: "var(--muted-foreground)",
          "user-select": "none",
        }}
      >
        <span style={{ "font-weight": "500" }}>Mermaid Diagram</span>
        <div style={{ display: "flex", gap: "6px" }}>
          <Show when={!isEditing()}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: "3px 10px",
                "font-size": "12px",
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                "border-radius": "5px",
                cursor: "pointer",
              }}
            >
              تعديل
            </button>
          </Show>
        </div>
      </div>

      {/* Edit Mode */}
      <Show when={isEditing()}>
        <div style={{ padding: "12px" }}>
          <textarea
            ref={textareaRef}
            value={content()}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              "min-height": "180px",
              "font-size": "13.5px",
              padding: "10px",
              border: "1px solid var(--border)",
              "border-radius": "6px",
              resize: "vertical",
              outline: "none",
              "line-height": "1.5",
              background: "var(--card)",
              color: "var(--foreground)",
            }}
            autofocus
          />
          <div
            style={{
              "margin-top": "10px",
              display: "flex",
              gap: "8px",
              "align-items": "center",
            }}
          >
            <button
              onClick={handleSave}
              style={{
                padding: "6px 14px",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                border: "none",
                "border-radius": "6px",
                cursor: "pointer",
                "font-size": "13px",
                "font-weight": "500",
              }}
            >
              حفظ (⌘↵)
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: "6px 14px",
                background: "var(--muted)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                "border-radius": "6px",
                cursor: "pointer",
                "font-size": "13px",
              }}
            >
              إلغاء (Esc)
            </button>
            <span style={{ "font-size": "12px", color: "var(--muted-foreground)" }}>
              Cmd/Ctrl + Enter للحفظ
            </span>
          </div>
        </div>
      </Show>

      {/* Preview Mode */}
      <Show when={!isEditing()}>
        <div
          style={{
            padding: "16px",
            "text-align": "center",
            position: "relative",
          }}
        >
          <Show when={isRendering()}>
            <div
              style={{
                position: "absolute",
                inset: "0",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                background: "color-mix(in srgb, var(--card) 70%, transparent)",
                "z-index": "1",
                "font-size": "13px",
                color: "var(--muted-foreground)",
              }}
            >
              جاري الرسم...
            </div>
          </Show>

          <div
            ref={containerRef}
            style={{
              display: "flex",
              "justify-content": "center",
              "overflow-x": "auto",
              "min-height": "60px",
            }}
            onDblClick={() => setIsEditing(true)}
          />

          <Show when={error()}>
            <div
              style={{
                "margin-top": "10px",
                padding: "8px 12px",
                background: "color-mix(in srgb, var(--destructive) 12%, var(--card))",
                color: "var(--destructive)",
                "border-radius": "6px",
                "font-size": "13px",
                "text-align": "right",
              }}
            >
              {error()}
            </div>
          </Show>
        </div>
      </Show>
    </NodeViewWrapper>
  );
};

export default MermaidView;
