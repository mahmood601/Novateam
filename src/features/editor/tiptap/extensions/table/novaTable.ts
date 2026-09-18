import { Table } from "@tiptap/extension-table";

export const NovaTable = Table.extend({
  renderHTML({ node, HTMLAttributes }) {
    const originalRender = this.parent?.({ node, HTMLAttributes });
    const wrapper = ['div', { class: 'tableWrapper scroll-container' }, originalRender];
    return wrapper;
  },

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