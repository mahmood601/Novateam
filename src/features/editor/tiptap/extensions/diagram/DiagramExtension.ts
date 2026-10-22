// src/features/editor/tiptap/extensions/diagram/DiagramExtension.ts
import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import { SolidNodeViewRenderer } from "tiptap-solid";
import DiagramView from "./DiagramView";
import type { DiagramOptions } from "./types";

export const Diagram = Node.create<DiagramOptions>({
  name: "diagram",

  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  // أولوية أعلى من CodeBlock حتى يُفحص أولاً
  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
      debounceMs: 350,
    };
  },

  addAttributes() {
    return {
      content: {
        default: `graph TD
    A[البداية] --> B{هل يعمل؟}
    B -->|نعم| C[تم]
    B -->|لا| D[إصلاح]`,
        parseHTML: (element) =>
          element.getAttribute("data-content") || element.textContent,
        renderHTML: (attributes) => ({
          "data-content": attributes.content,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="diagram"]' },
      // legacy markup saved before the rename
      { tag: 'div[data-type="mermaid"]' },
      {
        tag: "pre",
        preserveWhitespace: "full",
        getAttrs: (node) => {
          if (typeof node === "string") return false;

          const code = (node as HTMLElement).querySelector("code");
          const lang = code?.getAttribute("class") || "";

          if (/(?:^|[\s-])(mermaid|mmd|pele|diagram)\b/.test(lang)) {
            return {
              content: code?.textContent || (node as HTMLElement).textContent,
            };
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "diagram",
      }),
    ];
  },

  // ─────────────────────────────────────────────
  // Markdown support
  // ─────────────────────────────────────────────

  // Tokenizer مخصص يلتقط ```mermaid / ```diagram ... ``` قبل أن يصل إلى CodeBlock
  // (the fence is still written back as ```mermaid: that is the stored/Obsidian-compatible form)
  markdownTokenizer: {
    name: "diagram",
    level: "block" as const,
    start(src: string) {
      const match = src.match(/^```(?:mermaid|mmd|pele|diagram)\s*\n/m);
      return match ? (match.index ?? -1) : -1;
    },
    tokenize(src: string, _tokens: any, _lexer: any) {
      const rule =
        /^```(?:mermaid|mmd|pele|diagram)[ \t]*\n([\s\S]*?)(?:\n```[ \t]*\n?|\n```[ \t]*$)/;
      const match = rule.exec(src);

      if (!match) return undefined;

      return {
        type: "diagram",
        raw: match[0],
        text: match[1] ?? "",
        content: match[1] ?? "",
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode("diagram", {
      content: token.content || token.text || "",
    });
  },

  renderMarkdown: (node) => {
    const code = node?.attrs?.content || "";
    return `\`\`\`mermaid\n${code.trim()}\n\`\`\``;
  },

  // ─────────────────────────────────────────────
  // NodeView + Commands + InputRules
  // ─────────────────────────────────────────────

  addNodeView() {
    return SolidNodeViewRenderer(DiagramView);
  },

  addCommands() {
    return {
      setDiagram:
        (content = "") =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              content:
                content.trim() ||
                `graph TD
    A[Start] --> B[End]`,
            },
          });
        },

      updateDiagram:
        (content: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { content });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^```(?:mermaid|diagram)[\s\n]$/,
        type: this.type,
        getAttributes: () => ({
          content: `graph TD
    A[Start] --> B[End]`,
        }),
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-m": () => this.editor.commands.setDiagram(),
    };
  },
});

export default Diagram;
