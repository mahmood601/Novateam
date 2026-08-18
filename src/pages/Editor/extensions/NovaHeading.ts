// extensions/NovaHeading.ts
// عنوان رئيسي/فرعي بنظام الألوان الدوري المستخرج من قالب الفريق.
//
// السلوك المطلوب: "كل عنوان رئيسي جديد لون مختلف" — يعني ما بتحدد
// اللون يدوياً كل مرة، المحرر بيدور تلقائياً على الألوان الثمانية
// بالترتيب، ويعيد من الأول بعد آخر لون. أي عنوان "فرعي" يرث لون
// أقرب عنوان رئيسي فوقه (نفس منطق "فرعي أحمر/أزرق/..." بالقالب الأصلي).

import { Node, mergeAttributes } from "@tiptap/core";

export const HEADING_COLOR_CYCLE = [
  "default", // د00054 نيّ/أحمر غامق — heading 1 الأصلي
  "blue",
  "pink",
  "rosered",
  "orange",
  "yellow",
  "green",
  "purple",
] as const;

export type HeadingColor = (typeof HEADING_COLOR_CYCLE)[number];

export const NovaHeading = Node.create({
  name: "novaHeading",
  group: "block",
  content: "text*",
  defining: true,

  addAttributes() {
    return {
      level: { default: "main" }, // "main" | "sub"
      color: { default: "default" as HeadingColor },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-nova-heading]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const isSub = node.attrs.level === "sub";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-heading": "",
        "data-color": node.attrs.color,
        class: isSub ? "nova-heading sub" : "nova-heading",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      // ينده تلقائياً من المحرر: "أضف عنوان رئيسي" بدون تمرير لون —
      // getNextHeadingColor() بالأسفل يتابع الدورة عبر كل المستند.
      insertNovaHeading:
        (level: "main" | "sub" = "main") =>
        ({ chain, editor }: any) => {
          const color =
            level === "main"
              ? getNextHeadingColor(editor)
              : getLastMainHeadingColor(editor);
          return chain()
            .insertContent({
              type: this.name,
              attrs: { level, color },
              content: [{ type: "text", text: " " }],
            })
            .run();
        },
    } as any;
  },
});

/** يفحص كل عناوين المستند الحالية، ويرجع اللون التالي بالدورة. */
export function getNextHeadingColor(editor: any): HeadingColor {
  let count = 0;
  editor.state.doc.descendants((node: any) => {
    if (node.type.name === "novaHeading" && node.attrs.level === "main") {
      count++;
    }
  });
  return HEADING_COLOR_CYCLE[count % HEADING_COLOR_CYCLE.length];
}

/** يرجع لون آخر عنوان رئيسي بالمستند — يُستخدم لتلوين "فرعي" تحته. */
function getLastMainHeadingColor(editor: any): HeadingColor {
  let last: HeadingColor = "default";
  editor.state.doc.descendants((node: any) => {
    if (node.type.name === "novaHeading" && node.attrs.level === "main") {
      last = node.attrs.color;
    }
  });
  return last;
}
