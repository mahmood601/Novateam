// features/editor/tiptap/extensions/NovaBox.ts
//
// A generic styled container — a div the team can insert, nest inside
// other boxes, and style freely (background, text color, padding,
// margin, flex layout) to build things like "image next to text" or
// any custom side-by-side/colored layout. Nesting needs no special
// handling: `content: "block+"` plus `group: "block"` already lets one
// novaBox contain another, the same way any block node can.
//
// Decision (per team): inserted from the toolbar only, not typed as
// markdown syntax — so no createBlockMarkdownSpec here, unlike
// NovaAdmonition. Free-form CSS in a `style` string doesn't map onto a
// clean Markdown syntax anyway, and Markdown export/import isn't a
// requirement for this node.
//
// Styling model: ONE attribute, `style`, holding the raw inline CSS
// text ("background-color: #fff; padding: 8px; display: flex; ...").
// This is the single source of truth — see BoxStylePanel.tsx, which
// reads/writes individual properties out of this same string rather
// than keeping a second parallel state.

import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    novaBox: {
      /** Insert an empty box at the cursor, pre-set as a flex row (the
       * common "image next to text" starting point). */
      setBox: (style?: string) => ReturnType;
      /** Wrap the current selection/block in a new box. */
      wrapInBox: (style?: string) => ReturnType;
      /** Replace the style string of the currently selected/active box. */
      updateBoxStyle: (style: string) => ReturnType;
    };
  }
}

// Starting point when inserting a fresh box — a flex row with a small
// gap, so "drop an image box + a text box side by side" works
// immediately without the user having to set display:flex themselves.
export const DEFAULT_BOX_STYLE =
  "display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 8px;";

export const NovaBox = Node.create({
  name: "novaBox",
  group: "block",
  content: "block+",
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      style: {
        default: "",
        parseHTML: (element) => element.getAttribute("style") || "",
        renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-nova-block="box"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-block": "box",
        class: "nova-box",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setBox:
        (style: string = DEFAULT_BOX_STYLE) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { style },
            content: [{ type: "paragraph" }],
          }),

      wrapInBox:
        (style: string = DEFAULT_BOX_STYLE) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { style }),

      updateBoxStyle:
        (style: string) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { style }),
    };
  },
});

export default NovaBox;
