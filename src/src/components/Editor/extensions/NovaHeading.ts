// extensions/NovaHeading.ts
// امتداد رسمي لـ Heading + ألوان دورية + 6 مستويات
//
// - H1 جديد → يأخذ اللون التالي في الدورة تلقائياً
// - H2–H6 → ترث لون آخر H1 في المستند

import Heading from "@tiptap/extension-heading";
import { mergeAttributes, type Editor } from "@tiptap/core";

export const HEADING_COLOR_CYCLE = [
  "default", // #d00054
  "blue",
  "pink",
  "rosered",
  "orange",
  "yellow",
  "green",
  "purple",
] as const;

export type HeadingColor = (typeof HEADING_COLOR_CYCLE)[number];
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** عدد عناوين H1 الحالية → اللون التالي في الدورة */
export function getNextHeadingColor(editor: Editor): HeadingColor {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "heading" && node.attrs.level === 1) {
      count++;
    }
  });
  return HEADING_COLOR_CYCLE[count % HEADING_COLOR_CYCLE.length];
}

/** لون آخر H1 في المستند (للوراثة للمستويات الأدنى) */
export function getLastMainHeadingColor(editor: Editor): HeadingColor {
  let last: HeadingColor = "default";
  editor.state.doc.descendants((node) => {
    if (node.type.name === "heading" && node.attrs.level === 1) {
      last = (node.attrs.color as HeadingColor) || "default";
    }
  });
  return last;
}

export const NovaHeading = Heading.extend({
  name: "heading", // نفس الاسم الرسمي — مهم للتوافق مع الماركداون والأوامر

  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: "default" as HeadingColor,
        parseHTML: (element) =>
          (element.getAttribute("data-color") as HeadingColor) || "default",
        renderHTML: (attributes) => ({
          "data-color": attributes.color || "default",
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `nova-heading nova-h${level}`,
        "data-color": node.attrs.color || "default",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),

      /**
       * إدراج/تحويل عنوان مع تطبيق الألوان الدورية تلقائياً.
       * - level 1 → اللون التالي في الدورة
       * - level 2–6 → لون آخر H1
       */
      insertNovaHeading:
        (level: HeadingLevel = 1) =>
        ({ commands, editor }: any) => {
          const color =
            level === 1
              ? getNextHeadingColor(editor)
              : getLastMainHeadingColor(editor);

          return commands.setHeading({ level, color } as any);
        },

      /**
       * تبديل العنوان مع الحفاظ على منطق الألوان عند التحويل إلى H1 جديد.
       */
      toggleNovaHeading:
        (level: HeadingLevel = 1) =>
        ({ commands, editor, chain }: any) => {
          // إذا كان بالفعل نفس المستوى → ألغِ العنوان (ارجع لفقرة)
          if (editor.isActive("heading", { level })) {
            return commands.toggleHeading({ level });
          }

          const color =
            level === 1
              ? getNextHeadingColor(editor)
              : getLastMainHeadingColor(editor);

          return chain()
            .focus()
            .toggleHeading({ level })
            .updateAttributes("heading", { color })
            .run();
        },
    } as any;
  },
});
