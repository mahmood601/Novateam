import {
  Node,
  mergeAttributes,
  createBlockMarkdownSpec,
  wrappingInputRule,
} from "@tiptap/core";

export const SUPPORTED_ADMONITION_TYPES = [
  "note",
  "warning",
  "tip",
  "danger",
  "info",
  "important",
] as const;

export type AdmonitionType = typeof SUPPORTED_ADMONITION_TYPES[number];

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

  addInputRules() {
    // Matches: :::note, :::warning Title Here, :::tip Optional Custom Title
    const typesGroup = SUPPORTED_ADMONITION_TYPES.join("|");
    const typesRegex = new RegExp(`^:::(${typesGroup})(?:\\s+(.+))?\\s$`);

    return [
      wrappingInputRule({
        find: typesRegex,
        type: this.type,
        getAttributes: (match) => ({
          type: match[1] as AdmonitionType,
          title: match[2] || null, // Captures title if provided after :::type
        }),
      }),
    ];
  },

  parseHTML() {
    return [{ tag: 'div[data-nova-block="note"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { type, title } = HTMLAttributes;
    
    // Capitalize type if no custom title is provided
    const displayTitle = title || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "Note");

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-block": "note",
        class: "nova-note",
      }),
      // Header element containing Icon + Title (Obsidian style)
      [
        "div",
        { class: "nova-note-header", contenteditable: "false" },
        ["span", { class: "nova-note-icon" }],
        ["span", { class: "nova-note-title" }, displayTitle],
      ],
      // Editable content area
      ["div", { class: "nova-note-content" }, 0],
    ];
  },

  ...createBlockMarkdownSpec({
    nodeName: "novaNote",
    name: "note",
    content: "block",
    defaultAttributes: { type: "note" },
    allowedAttributes: ["type", "title"],
  }),
});