// Extends Tiptap's default Heading node with a `color` attribute, and
// keeps it correct as the reviewer edits via a single full-document
// rescan on every change — same fix pattern already proven for the
// Obsidian plugin (partial/per-block updates are what caused the
// original color-misordering bug there; a full rescan avoids it here
// for the same underlying reason: any edit can shift every color below it).

import Heading from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NOVA_COLOR_CYCLE, type NovaColor } from "../../types/novaAst";

// Any node type whose color depends on which section it belongs to.
// A depth-1 heading starts a new section (and advances the cycle);
// everything else in this set just inherits the current section color.
const COLORABLE_TYPES = new Set(["heading", "novaNote", "novaQuiz"]);

function colorForIndex(index: number): NovaColor {
  return NOVA_COLOR_CYCLE[index % NOVA_COLOR_CYCLE.length];
}

export const NovaHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attrs) =>
          attrs.color ? { "data-color": attrs.color } : {},
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey("novaHeadingColorSync"),
        appendTransaction: (_transactions, _oldState, newState) => {
          // No docChanged early-exit here on purpose: a deliberately
          // empty forced transaction (dispatched right after initial
          // load, since appendTransaction never fires for the very
          // first content-set transaction) must still reach this scan.
          // Safe from loops/waste because of the updates.length===0
          // early-exit below instead.

          let colorIndex = -1; // -1 = before any section heading (neutral)
          let currentColor: NovaColor | null = null;
          const updates: { pos: number; node: PMNode; color: NovaColor }[] = [];

          newState.doc.descendants((node, pos) => {
            if (!COLORABLE_TYPES.has(node.type.name)) return;

            const isSectionHeading =
              node.type.name === "heading" && node.attrs.level === 1;

            if (isSectionHeading) {
              colorIndex += 1;
              currentColor = colorForIndex(colorIndex);
            }

            // Content before the first section heading stays uncolored.
            if (currentColor && node.attrs.color !== currentColor) {
              updates.push({ pos, node, color: currentColor });
            }
          });

          if (updates.length === 0) return null;

          const tr = newState.tr;
          for (const { pos, node, color } of updates) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, color });
          }
          return tr;
        },
      }),
    ];
  },
});