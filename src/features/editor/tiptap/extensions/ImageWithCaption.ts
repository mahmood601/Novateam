import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { NodeSelection, type EditorState } from "@tiptap/pm/state";

export type ImageAlign = "left" | "center" | "right" | null;

// Inline styles can't lose to stylesheet order/specificity (the old
// `.pagedjs_pages .image-with-caption { display:inline-flex }` rule beat the
// plain `.image-with-caption` rule, so captioned images never centred).
const MARGINS: Record<string, string> = {
  center: "margin-left:auto;margin-right:auto",
  left: "margin-left:0;margin-right:auto",
  right: "margin-left:auto;margin-right:0",
};

function alignAttrs(align: ImageAlign, wrapper = false) {
  if (!align) return {};
  return {
    "data-align": align,
    style: `display:${wrapper ? "flex" : "block"};${wrapper ? "width:fit-content;" : ""}${MARGINS[align]}`,
  };
}

/** Finds the image the user means: selected node, or one touching the cursor. */
export function findImage(state: EditorState) {
  const { selection } = state;
  if (selection instanceof NodeSelection && selection.node.type.name === "image") {
    return { pos: selection.from, node: selection.node };
  }
  const { $from } = selection;
  if ($from.nodeAfter?.type.name === "image") {
    return { pos: $from.pos, node: $from.nodeAfter };
  }
  if ($from.nodeBefore?.type.name === "image") {
    return { pos: $from.pos - $from.nodeBefore.nodeSize, node: $from.nodeBefore };
  }
  return null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageAlign: {
      setImageAlign: (align: ImageAlign) => ReturnType;
    };
  }
}

export const ImageWithCaption = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: null },
      align: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-align") ||
          el.parentElement?.getAttribute("data-align") ||
          null,
        renderHTML: () => ({}), // rendered manually in renderHTML below
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align: ImageAlign) =>
        ({ state, tr, dispatch }: any) => {
          const found = findImage(state);
          if (!found) return false;
          if (dispatch) {
            tr.setNodeMarkup(found.pos, undefined, { ...found.node.attrs, align });
            dispatch(tr);
          }
          return true;
        },
    } as any;
  },

  // @ts-ignore - official image typings do not include the custom attributes
  renderHTML(props: any) {
    const { HTMLAttributes, node } = props;
    const { caption, ...attrs } = HTMLAttributes;
    const align: ImageAlign = node.attrs.align;

    const img = [
      "img",
      mergeAttributes(
        this.options.HTMLAttributes,
        attrs,
        caption ? {} : alignAttrs(align),
      ),
    ];
    if (!caption) return img;

    return [
      "div",
      { class: "image-with-caption", ...alignAttrs(align, true) },
      img,
      ["div", { class: "image-caption" }, caption],
    ];
  },

  // @ts-ignore - custom node view matches runtime behavior
  addNodeView() {
    return (props: any) => {
      const parentView = this.parent?.();
      if (!parentView) return null;
      const view = parentView(props);
      if (!view) return null;

      const container = view.dom as HTMLElement;

      // The resize container is what sits in the paragraph, so it is what
      // must be block-level + auto-margined to move the image.
      const applyAlign = (node: any) => {
        const a: ImageAlign = node.attrs.align;
        if (!a) {
          container.removeAttribute("data-align");
          container.style.removeProperty("display");
          container.style.removeProperty("width");
          container.style.removeProperty("margin-left");
          container.style.removeProperty("margin-right");
          return;
        }
        container.setAttribute("data-align", a);
        container.style.display = "flex";
        container.style.width = "fit-content";
        container.style.marginLeft = a === "left" ? "0" : "auto";
        container.style.marginRight = a === "right" ? "0" : "auto";
      };
      applyAlign(props.node);

      const cap = document.createElement("div");
      cap.textContent = props.node.attrs.caption ?? "";
      cap.classList.add("image-caption");
      cap.contentEditable = "true";

      cap.addEventListener("blur", () => {
        const pos = props.getPos();
        if (typeof pos !== "number") return;
        const text = (cap.textContent ?? "").trim();
        props.editor.commands.command(({ tr }: any) => {
          tr.setNodeMarkup(pos, undefined, {
            ...props.editor.state.doc.nodeAt(pos)?.attrs,
            caption: text || null,
          });
          return true;
        });
      });

      container.appendChild(cap);

      return {
        dom: container,
        update: (node: any, decorations: any, inner: any) => {
          applyAlign(node);
          if (document.activeElement !== cap) {
            cap.textContent = node.attrs.caption ?? "";
          }
          return view.update?.(node, decorations, inner) ?? true;
        },
        destroy: () => view.destroy?.(),
        ignoreMutation: (m: any) =>
          cap.contains(m.target as Node) || (view.ignoreMutation?.(m) ?? false),
        stopEvent: (e: any) =>
          cap.contains(e.target as Node) || (view.stopEvent?.(e) ?? false),
      };
    };
  },
});