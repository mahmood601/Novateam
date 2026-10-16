import { Table, TableView, createColGroup } from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

// Tiptap's own TableView owns the <colgroup> that column resizing writes
// widths into. We only extend it to mirror the table's `color` attribute
// onto the wrapper element (editor.css themes tables through it).
class NovaTableView extends TableView {
  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    view?: EditorView,
    HTMLAttributes: Record<string, any> = {},
  ) {
    super(node, cellMinWidth, view, HTMLAttributes);
    this.dom.classList.add("scroll-container");
    this.syncColor(node);
    this.applyFullWidth();
  }

  update(node: ProseMirrorNode) {
    const ok = super.update(node);
    if (ok) {
        this.syncColor(node);
        this.applyFullWidth();
      }
    return ok;
  }

  private applyFullWidth() {
  this.table.style.width = "100%";
  this.table.style.minWidth = "";
}

  private syncColor(node: ProseMirrorNode) {
    if (node.attrs.color) this.dom.setAttribute("data-color", node.attrs.color);
    else this.dom.removeAttribute("data-color");
  }
}

export const NovaTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      View: NovaTableView,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: (element) => {
          const wrapper = element.closest(".tableWrapper");
          return (
            wrapper?.getAttribute("data-color") ||
            element.getAttribute("data-color")
          );
        },
        renderHTML: (attrs) => {
          if (!attrs.color) return {};
          return { "data-color": attrs.color };
        },
      },
    };
  },

  // Used by getHTML() (lecture view + print). It must emit the <colgroup>
  // so column widths set in the editor survive outside the editor.
  renderHTML({ node, HTMLAttributes }) {
    const { "data-color": dataColor, ...tableAttributes } = HTMLAttributes;
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(
      node,
      this.options.cellMinWidth,
    );

    const style =
      (tableAttributes.style as string | undefined) ||
      (tableWidth ? `width: ${tableWidth}` : `width: 100%`);

    return [
      "div",
      {
        class: "tableWrapper scroll-container",
        "data-color": dataColor || null,
      },
      [
        "table",
        { ...this.options.HTMLAttributes, ...tableAttributes, style },
        ...(colgroup ? [colgroup] : []),
        ["tbody", 0],
      ],
    ];
  },
});
