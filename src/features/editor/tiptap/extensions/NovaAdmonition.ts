import {
  Node,
  mergeAttributes,
  createBlockMarkdownSpec,
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
    return [{ tag: 'div[data-nova-block="note"]' }];
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

  ...createBlockMarkdownSpec({
    nodeName: "novaNote",
    name: "note",
    content: "block",
    defaultAttributes: { type: "note" },
    allowedAttributes: ["type", "title", "color"],
  }),
});