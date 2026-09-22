import { Table } from "@tiptap/extension-table";

export const NovaTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: (element) => {
          const wrapper = element.closest(".tableWrapper");
          return wrapper?.getAttribute("data-color") || element.getAttribute("data-color");
        },
        renderHTML: (attrs) => {
          if (!attrs.color) return {};
          return { "data-color": attrs.color };
        },
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.style.width || "100%",
        renderHTML: (attrs) => {
          if (!attrs.width || attrs.width === "100%") return {};
          return `{ style: width: ${attrs.width} }`;
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { "data-color": dataColor, ...tableAttributes } = HTMLAttributes;
    return [
      "div",
      {
        class: "tableWrapper scroll-container",
        "data-color": dataColor || null,
      },
      ["table", tableAttributes, ["tbody", 0]],
    ];
  },

  // هذا هو الجزء الذي يحل المشكلة داخل المحرر التفاعلي (Editor)
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const wrapper = document.createElement("div");
      wrapper.className = "tableWrapper scroll-container";
      
      // تعيين data-color على الـ Wrapper مباشرة
      if (node.attrs.color) {
        wrapper.setAttribute("data-color", node.attrs.color);
      }

      const table = document.createElement("table");
      if (node.attrs.width && node.attrs.width !== "100%") {
        table.style.width = node.attrs.width;
      }

      const tbody = document.createElement("tbody");
      table.appendChild(tbody);
      table.classList.add("w-full"); // تعيين العرض على 100% بشكل افتراضي
      wrapper.appendChild(table);

      return {
        dom: wrapper,
        contentDOM: tbody,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          
          // تحديث data-color عند تغير الـ attributes
          if (updatedNode.attrs.color) {
            wrapper.setAttribute("data-color", updatedNode.attrs.color);
          } else {
            wrapper.removeAttribute("data-color");
          }

          if (updatedNode.attrs.width && updatedNode.attrs.width !== "100%") {
            table.style.width = updatedNode.attrs.width;
          } else {
            table.style.width = "";
          }

          return true;
        },
      };
    };
  },
});