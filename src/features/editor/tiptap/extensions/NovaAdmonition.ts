import {
  Node,
  mergeAttributes,
} from "@tiptap/core";

export const SUPPORTED_ADMONITION_TYPES = [
  "note",
  "warning",
  "tip",
  "danger",
  "info",
  "important",
] as const;

export type AdmonitionType = (typeof SUPPORTED_ADMONITION_TYPES)[number];

function defaultTitleForType(type: string): string {
  if (!type) return "Note";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export const NovaAdmonition = Node.create({
  name: "novaNote",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attrs) =>
          attrs.color ? { "data-color": attrs.color } : {},
      },
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-type") || "note",
        renderHTML: (attrs) => (attrs.type ? { "data-type": attrs.type } : {}),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attrs) =>
          attrs.title ? { "data-title": attrs.title } : {},
      },
    };
  },

  // تم استبدال addInputRules بـ addKeyboardShortcuts
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        // التأكد من أن المؤشر داخل فقرة نصية (paragraph) وأنه لا يوجد تظليل للنص
        if (!empty || $from.parent.type.name !== "paragraph") {
          return false;
        }

        const text = $from.parent.textContent;
        const typesGroup = SUPPORTED_ADMONITION_TYPES.join("|");
        // التعبير النمطي الآن لا يشترط مسافة في النهاية، بل يعتمد على نهاية السطر $
        const regex = new RegExp(`^\\s*:::(${typesGroup})(?:\\s+(.*))?$`);
        const match = text.match(regex);

        if (match) {
          const type = match[1] as AdmonitionType;
          const title = match[2]?.trim() || null;

          editor
            .chain()
            .focus()
            // 1. حذف النص المكتوب (مثل: :::warning انتبه هنا)
            .deleteRange({ from: $from.start(), to: $from.end() })
            // 2. تغليف السطر الفارغ الجديد بمكون الملاحظة مع إعطائه الخصائص
            .wrapIn(this.name, { type, title })
            .run();

          return true; // تم الاعتراض بنجاح وإيقاف النزول لسطر جديد عادي
        }

        return false; // إذا لم يطابق Regex، يتم تنفيذ الـ Enter بشكل طبيعي
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-nova-block="note"]',
        contentElement: ".nova-note-content",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type as string) || "note";
    const title = node.attrs.title as string | null;
    const displayTitle = title || defaultTitleForType(type);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-block": "note",
        class: "nova-note",
      }),
      [
        "div",
        { class: "nova-note-header", contenteditable: "false" },
        ["span", { class: "nova-note-icon" }],
        ["span", { class: "nova-note-title" }, displayTitle],
      ],
      ["div", { class: "nova-note-content" }, 0],
    ];
  },

  // Custom tokenizer keeps the optional title round-trippable.
//
// Written on purpose in the SAME style as the layout-shape tokenizers in
// NovaShapes.ts, which import correctly: one anchored regex, no `y`/`m`
// flags (so no regex state or line-anchor behaviour to depend on), closing
// fence found with an explicit "\n:::" instead of a multiline `^`.
markdownTokenizer: {
  name: "novaNote",
  level: "block" as const,
  start(src: string) {
    const match = /^:::(?:note|warning|tip|danger|info|important)(?:[ \t]|\n)/m.exec(src);
    return match ? (match.index ?? -1) : -1;
  },
  tokenize(src: string, _tokens: unknown, lexer: { blockTokens: (value: string) => unknown[] }) {
    const match =
      /^:::(note|warning|tip|danger|info|important)(?:[ \t]+\{([^}\n]*)\})?(?:[ \t]+([^\n]*))?[ \t]*\n([\s\S]*?)\n[ \t]*:::[ \t]*(?:\n|$)/.exec(
        src,
      );
    if (!match) return undefined;

    // TEMP DIAGNOSTIC (remove once import is confirmed): one line per callout.
    // eslint-disable-next-line no-console
    console.debug("[novaNote tokenize]", { srcLen: src.length, rawLen: match[0].length, type: match[1] });

    const attrs: Record<string, string> = { type: match[1] };
    const titleAttr = /\btitle\s*=\s*"([^"]*)"/.exec(match[2] || "");
    if (titleAttr?.[1]) attrs.title = titleAttr[1];
    else if (match[3]?.trim()) attrs.title = match[3].trim();

    return {
      type: "novaNote",
      raw: match[0],
      attrs,
      tokens: lexer.blockTokens((match[4] || "").trim()),
    };
  },
},

parseMarkdown: (token, helpers) => {
  return helpers.createNode("novaNote", token.attrs ||  { type: "note" }, helpers.parseChildren(token.tokens || []));
},

renderMarkdown: (node, helpers) => {
  const type = node.attrs?.type || "note";
  const title = node.attrs?.title;
  const content = helpers.renderChildren(node.content || [], "\n\n");
  const attrs = title
    ? ` {title="${String(title).replace(/"/g, '\\"')}"}`
    : "";
  return `:::${type}${attrs}\n${content}\n:::`;
},
});