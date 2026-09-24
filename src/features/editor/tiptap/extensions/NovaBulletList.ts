import { BulletList } from "@tiptap/extension-bullet-list";

export const NovaBulletList = BulletList.extend({
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
});

export default NovaBulletList;