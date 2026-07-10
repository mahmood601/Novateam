// extensions/InfoBox.ts
// Custom Tiptap node: the rounded, colored callout box used for
// "صورة توضح..." captions and key notes in the lecture template.
//
// Stored in the doc JSON as:
// { type: "infoBox", attrs: { variant: "pink" }, content: [...paragraphs] }
//
// This keeps content structured (per Nova's JSON/component philosophy)
// instead of raw HTML — the same node renders identically in the live
// editor and in the Paged.js export.

import { Node, mergeAttributes } from "@tiptap/core";
import type { HeadingColor } from "./NovaHeading";

export type InfoBoxVariant = HeadingColor;

const VARIANT_BG: Record<InfoBoxVariant, string> = {
  default: "#ffe0ec",
  blue: "#e8f3ff",
  pink: "#fff0ff",
  rosered: "#ffeef5",
  orange: "#fff4e8",
  yellow: "#fff9e5",
  green: "#eefff0",
  purple: "#f8ecff",
};

const VARIANT_BORDER: Record<InfoBoxVariant, string> = {
  default: "#d00054",
  blue: "#add6ff",
  pink: "#ffccff",
  rosered: "#ffb7db",
  orange: "#ffcc99",
  yellow: "#ffde7f",
  green: "#99ff99",
  purple: "#ebb9ff",
};

export const InfoBox = Node.create({
  name: "infoBox",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "default" as InfoBoxVariant,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-info-box]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = (node.attrs.variant as InfoBoxVariant) || "default";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-info-box": "",
        "data-variant": variant,
        style: `border-radius:12px;padding:14px 18px;margin:12px 0;background:${VARIANT_BG[variant]};border:1px solid ${VARIANT_BORDER[variant]};`,
      }),
      0, // 0 = render child content (the paragraphs) here
    ];
  },

  // renderHTML above is a static function form; Tiptap also needs this
  // exact signature for both editor rendering and generateHTML() (used
  // later for the static Paged.js export) to stay in sync.
  addCommands() {
    return {
      setInfoBox:
        (variant: InfoBoxVariant = "default") =>
        ({ commands }: any) => {
          return commands.wrapIn(this.name, { variant });
        },
      unsetInfoBox:
        () =>
        ({ commands }: any) => {
          return commands.lift(this.name);
        },
    } as any;
  },
});
