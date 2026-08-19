// extensions/NovaHeading.ts
// امتداد رسمي لـ Heading + ألوان دورية + 6 مستويات
//
// - H1 جديد → يأخذ اللون التالي في الدورة تلقائياً
// - H2–H6 → ترث لون آخر H1 في المستند

import { Decoration } from "@tiptap/core";
import Heading, { HeadingOptions } from "@tiptap/extension-heading";

export const HEADING_COLORS = [
  "pink",
  "blue",
  "rosered",
  "orange",
  "yellow",
  "green",
  "purple",
] as const;

export type HeadingColor = (typeof HEADING_COLORS)[number];
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ColoredHeadingOptions extends HeadingOptions {
  colors: readonly string[];
}

export const NovaHeading = Heading.extend<ColoredHeadingOptions>({
  name: "heading",

  addOptions() {
    return {
      ...this.parent?.(),
      colors: HEADING_COLORS,
    };
  },

  addDecorations() {
    const colors = this.options.colors;

    return {
      create: ({ state }) => {
        const decorations: Decoration[] = [];
        let colorIndex = -1;
        let currentColor = colors[0];

        state.doc.descendants((node, pos) => {
          if (node.type.name !== "heading") return;

          if (node.attrs.level === 1) {
            colorIndex = (colorIndex + 1) % colors.length;
            currentColor = colors[colorIndex];
          }

          decorations.push(
            Decoration.Node(pos, pos + node.nodeSize, {
              class: `nova-heading nova-h${node.attrs.level}`,
              style: `--heading-color: ${currentColor};`,
              "data-color": currentColor,
            }),
          );
        });

        return decorations;
      },
    };
  },
});

export default NovaHeading;
