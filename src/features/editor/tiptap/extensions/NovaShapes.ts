import { Node, mergeAttributes } from "@tiptap/core";

type ShapeName = "steps" | "compare" | "chips" | "case" | "summary";

const SHAPES: Record<ShapeName, { className: string; content: string }> = {
  steps: { className: "nova-steps", content: "block+" },
  compare: { className: "nova-compare", content: "block+" },
  chips: { className: "nova-chips", content: "block+" },
  case: { className: "nova-case", content: "block+" },
  summary: { className: "nova-summary", content: "block+" },
};

function shapeTokenizer(name: ShapeName): any {
  return {
    name: `nova${name[0].toUpperCase()}${name.slice(1)}`,
    level: "block" as const,
    start(src: string) {
      const match = new RegExp(`^:::${name}\\b`, "m").exec(src);
      return match ? (match.index ?? -1) : -1;
    },
    tokenize(src: string, _tokens: unknown, lexer: { blockTokens: (value: string) => unknown[] }) {
      const match = new RegExp(
        `^:::${name}(?:[ \\t]+([^\\n]+))?[ \\t]*\\n([\\s\\S]*?)\\n:::[ \\t]*(?:\\n|$)`,
      ).exec(src);
      if (!match) return undefined;
      return {
        type: `nova${name[0].toUpperCase()}${name.slice(1)}`,
        raw: match[0],
        attrs: { title: match[1]?.trim() || null },
        tokens: lexer.blockTokens(match[2] || ""),
      };
    },
  };
}

function createShape(name: ShapeName) {
  const shape = SHAPES[name];
  const nodeName = `nova${name[0].toUpperCase()}${name.slice(1)}`;

  return Node.create({
    name: nodeName,
    group: "block",
    content: shape.content,
    defining: true,

    addAttributes() {
      return {
        color: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("data-color"),
          renderHTML: (attrs: { color?: string | null }) =>
            attrs.color ? { "data-color": attrs.color } : {},
        },
        title: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("data-title"),
          renderHTML: (attrs: { title?: string | null }) =>
            attrs.title ? { "data-title": attrs.title } : {},
        },
      };
    },

    parseHTML() {
      return [{ tag: `div[data-nova-block="${name}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-nova-block": name,
          class: shape.className,
        }),
        0,
      ];
    },

    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          const { $from, empty } = editor.state.selection;
          if (!empty || $from.parent.type.name !== "paragraph") return false;
          const match = $from.parent.textContent.match(
            new RegExp(`^\\s*:::${name}(?:[ \\t]+(.+))?$`),
          );
          if (!match) return false;

          const chain = editor
            .chain()
            .focus()
            .deleteRange({ from: $from.start(), to: $from.end() })
            .wrapIn(nodeName, { title: match[1]?.trim() || null });
          if (name === "steps") chain.toggleOrderedList();
          if (name === "chips") chain.toggleBulletList();
          return chain.run();
        },
      };
    },

    markdownTokenizer: shapeTokenizer(name),
    parseMarkdown: (token: any, helpers: any) =>
      helpers.createNode(nodeName, token.attrs || { title: null }, helpers.parseChildren(token.tokens || [])),
    renderMarkdown: (node: any, helpers: any) => {
      const title = node.attrs?.title ? ` ${node.attrs.title}` : "";
      const content = helpers.renderChildren(node.content || [], "\n\n");
      return `:::${name}${title}\n${content}\n:::`;
    },
  });
}

export const NovaSteps = createShape("steps");
export const NovaCompare = createShape("compare");
export const NovaChips = createShape("chips");
export const NovaCase = createShape("case");
export const NovaSummary = createShape("summary");
