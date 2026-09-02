// `:::note ... :::` directive from the AI-markdown contract, as an
// editable container node. Its `color` attribute is filled in by
// NovaHeadingExtension's rescan plugin (same mechanism as headings),
// so it always matches its enclosing section without its own logic.

import { Node, mergeAttributes } from "@tiptap/core";

export const NovaNote = Node.create({
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
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-nova-block="note"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-block": "note",
        class: "nova-note",
      }),
      0,
    ];
  },
});
