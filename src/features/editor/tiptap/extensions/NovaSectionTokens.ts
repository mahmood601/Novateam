// Editor-only: puts `data-color` (the section's color) on every top-level block
// that doesn't already render one — paragraphs, lists, galleries, boxes...
//
// Why: the shades `--nova-color`, `--nova-bg-light`... are defined on
// [data-color] elements (paged-print.css). Headings, tables, cards and notes
// already carry data-color, but a plain paragraph does not, so a text color or
// highlight stored as `var(--nova-bg-light)` could not resolve there. This
// makes it resolve, WITHOUT touching the saved document: these are view
// decorations only. The reading view and print get the same attribute from
// stampSectionColorsIn() (lib/sectionColors.ts).

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export const NovaSectionTokens = Extension.create({
  name: "novaSectionTokens",

  addProseMirrorPlugins() {
    // Selection moves don't change the doc: reuse the last result.
    let lastDoc: PMNode | null = null;
    let lastSet = DecorationSet.empty;

    return [
      new Plugin({
        key: new PluginKey("novaSectionTokens"),
        props: {
          decorations(state) {
            if (state.doc === lastDoc) return lastSet;

            const decos: Decoration[] = [];
            let current: string | null = null; // before the first h1: no color
            state.doc.forEach((node, offset) => {
              if (node.type.name === "heading" && node.attrs.level === 1 && node.attrs.color) {
                current = node.attrs.color;
              }
              // Nodes that have their own `color` attribute render data-color themselves.
              if (!current || "color" in node.attrs) return;
              decos.push(
                Decoration.node(offset, offset + node.nodeSize, { "data-color": current }),
              );
            });

            lastDoc = state.doc;
            lastSet = DecorationSet.create(state.doc, decos);
            return lastSet;
          },
        },
      }),
    ];
  },
});
