// Editor-only: gives fixed (stored) colors a dark-mode counterpart through
// view decorations, so the saved document is never touched. The dark values
// come from lib/darkColors.ts and are applied by the `[data-dk-bg]` /
// `[data-dk-fg]` rules (active under `.dark` only) in paged-print.css.
// The reading view does the same on its DOM: applyDarkColorsDom().

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { darkReplacement } from "../../lib/darkColors";

type Attrs = Record<string, string>;
const attrsFor = (kind: "bg" | "fg", v: string): Attrs => ({
  [`data-dk-${kind}`]: "",
  style: `--dk-${kind}: ${v};`,
});

export const NovaDarkColors = Extension.create({
  name: "novaDarkColors",

  addProseMirrorPlugins() {
    let lastDoc: PMNode | null = null;
    let lastSet = DecorationSet.empty;

    return [
      new Plugin({
        key: new PluginKey("novaDarkColors"),
        props: {
          decorations(state) {
            if (state.doc === lastDoc) return lastSet;

            const decos: Decoration[] = [];
            let hue: string | null = null;

            state.doc.forEach((top, topOffset) => {
              if (top.type.name === "heading" && top.attrs.level === 1 && top.attrs.color) {
                hue = top.attrs.color;
              }
              const walk = (node: PMNode, pos: number) => {
                // Cell fill / box fill stored as a node attribute.
                const bg = node.attrs?.backgroundColor;
                if (typeof bg === "string") {
                  const v = darkReplacement("bg", bg, hue);
                  if (v) decos.push(Decoration.node(pos, pos + node.nodeSize, attrsFor("bg", v)));
                }
                // Text color / highlight stored as marks.
                if (node.isText) {
                  for (const mark of node.marks) {
                    const a = mark.attrs as Record<string, unknown>;
                    const name = mark.type.name;
                    const fg = name === "textStyle" ? a.color : null;
                    const mbg = name === "highlight" ? a.color : name === "textStyle" ? a.backgroundColor : null;
                    if (typeof fg === "string") {
                      const v = darkReplacement("fg", fg, hue);
                      if (v) decos.push(Decoration.inline(pos, pos + node.nodeSize, attrsFor("fg", v)));
                    }
                    if (typeof mbg === "string") {
                      const v = darkReplacement("bg", mbg, hue);
                      if (v) decos.push(Decoration.inline(pos, pos + node.nodeSize, attrsFor("bg", v)));
                    }
                  }
                }
                node.forEach((child, off) => walk(child, pos + 1 + off));
              };
              walk(top, topOffset);
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
