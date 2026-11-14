import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { NodeSelection, type EditorState } from "@tiptap/pm/state";

export type ImageAlign = "left" | "center" | "right" | null;

/** Smallest / largest width an image can be given, as % of its container. */
export const IMAGE_MIN_PCT = 5;
export const IMAGE_MAX_PCT = 100;

export function clampImagePct(n: number) {
  return Math.min(IMAGE_MAX_PCT, Math.max(IMAGE_MIN_PCT, Math.round(n)));
}

// Inline styles can't lose to stylesheet order/specificity (the old
// `.pagedjs_pages .image-with-caption { display:inline-flex }` rule beat the
// plain `.image-with-caption` rule, so captioned images never centred).
const MARGINS: Record<string, string> = {
  center: "margin-left:auto;margin-right:auto",
  left: "margin-left:0;margin-right:auto",
  right: "margin-left:auto;margin-right:0",
};

/**
 * Style of the OUTERMOST element of an image (the <img> itself, or the
 * caption wrapper when there is a caption).
 *
 * `pct` is the width as a percentage of the container (the page's text
 * column for a normal paragraph). Because the SAME renderHTML feeds the
 * editor's saved HTML, the reading view, the A4 preview and the print
 * page, the percentage means the same thing everywhere — including print.
 */
function outerAttrs(align: ImageAlign, wrapper: boolean, pct: number | null) {
  const style: string[] = [];
  if (align) style.push(`display:${wrapper ? "flex" : "block"}`);
  if (pct) {
    style.push(`width:${pct}%`, "max-width:100%");
    if (!wrapper) style.push("height:auto");
  } else if (align && wrapper) {
    style.push("width:fit-content");
  }
  if (align) style.push(MARGINS[align]);

  const attrs: Record<string, string> = {};
  if (align) attrs["data-align"] = align;
  if (pct) attrs["data-width-pct"] = String(pct);
  if (style.length) attrs.style = style.join(";");
  return attrs;
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
    imageWidth: {
      /** Width as % of the container. `null` = back to the original size. */
      setImageWidthPct: (pct: number | null) => ReturnType;
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
      // Width as a percentage of the container (1–100). When set it wins over
      // the legacy pixel `width`/`height` attributes.
      widthPct: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw =
            el.getAttribute("data-width-pct") ||
            el.parentElement?.getAttribute("data-width-pct");
          const n = raw ? parseFloat(raw) : NaN;
          return Number.isFinite(n) ? clampImagePct(n) : null;
        },
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

      setImageWidthPct:
        (pct: number | null) =>
        ({ state, tr, dispatch }: any) => {
          const found = findImage(state);
          if (!found) return false;
          if (dispatch) {
            tr.setNodeMarkup(found.pos, undefined, {
              ...found.node.attrs,
              widthPct: pct == null ? null : clampImagePct(pct),
              // The old pixel size would fight the percentage.
              width: null,
              height: null,
            });
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
    const pct: number | null = node.attrs.widthPct ?? null;

    if (pct) {
      delete attrs.width;
      delete attrs.height;
    }

    // With a caption the WRAPPER carries the width and the image fills it
    // (a % width inside a `fit-content` wrapper would be circular).
    const img = [
      "img",
      mergeAttributes(
        this.options.HTMLAttributes,
        attrs,
        caption
          ? pct
            ? { style: "width:100%;height:auto;display:block" }
            : {}
          : outerAttrs(align, false, pct),
      ),
    ];
    if (!caption) return img;

    return [
      "div",
      { class: "image-with-caption", ...outerAttrs(align, true, pct) },
      img,
      ["div", { class: "image-caption" }, caption],
    ];
  },

  // Own node view (instead of Tiptap's built-in resizer, which only reacts
  // to the mouse). Resizing is done by ImageGripOverlay with Pointer Events,
  // so a finger works exactly like a mouse. This view only draws the image,
  // its caption and its alignment / width, and makes a tap select the image.
  // @ts-ignore - custom node view matches runtime behavior
  addNodeView() {
    const imgClass: string = (this.options.HTMLAttributes as any)?.class ?? "";

    return ({ node: initial, getPos, editor }: any) => {
      let node = initial;

      const dom = document.createElement("div");
      dom.className = "nova-img";
      dom.setAttribute("data-resize-wrapper", "true");

      const img = document.createElement("img");
      if (imgClass) img.className = imgClass;
      img.draggable = false; // moving is done by drag handle / long-press selection
      dom.appendChild(img);

      const cap = document.createElement("div");
      cap.classList.add("image-caption");
      cap.contentEditable = "true";
      cap.setAttribute("data-placeholder", "أضف وصفاً…");
      dom.appendChild(cap);

      const apply = () => {
        const a = node.attrs;
        const align: ImageAlign = a.align ?? null;
        const pct: number | null = a.widthPct ?? null;

        if (img.getAttribute("src") !== a.src) img.setAttribute("src", a.src ?? "");
        a.alt != null ? img.setAttribute("alt", a.alt) : img.removeAttribute("alt");
        a.title != null ? img.setAttribute("title", a.title) : img.removeAttribute("title");

        // Container (sits inside the paragraph)
        if (align) dom.setAttribute("data-align", align);
        else dom.removeAttribute("data-align");
        if (pct) dom.setAttribute("data-width-pct", String(pct));
        else dom.removeAttribute("data-width-pct");

        dom.style.display = align ? "block" : "inline-block";
        dom.style.maxWidth = "100%";
        dom.style.width = pct ? `${pct}%` : align ? "fit-content" : "";
        dom.style.marginLeft = align ? (align === "left" ? "0" : "auto") : "";
        dom.style.marginRight = align ? (align === "right" ? "0" : "auto") : "";

        // Image
        img.style.display = "block";
        if (pct) {
          img.removeAttribute("width");
          img.removeAttribute("height");
          img.style.width = "100%";
          img.style.height = "auto";
        } else {
          img.style.width = "";
          img.style.height = "";
          a.width ? img.setAttribute("width", String(a.width)) : img.removeAttribute("width");
          a.height ? img.setAttribute("height", String(a.height)) : img.removeAttribute("height");
        }

        if (document.activeElement !== cap) cap.textContent = a.caption ?? "";
      };
      apply();

      cap.addEventListener("blur", () => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        const text = (cap.textContent ?? "").trim();
        const current = editor.state.doc.nodeAt(pos);
        if (!current || (current.attrs.caption ?? "") === text) return;
        editor.commands.command(({ tr }: any) => {
          tr.setNodeMarkup(pos, undefined, { ...current.attrs, caption: text || null });
          return true;
        });
      });

      // A tap/click selects the image, so its handles and width bar appear.
      // (ProseMirror usually does this itself, but not reliably for a finger
      // tap on an inline image, and never when the editor isn't focused.)
      img.addEventListener("click", () => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        const sel = editor.state.selection;
        if (sel instanceof NodeSelection && sel.from === pos) return;
        editor.commands.setNodeSelection(pos);
      });

      return {
        dom,
        update: (next: any) => {
          if (next.type !== node.type) return false;
          node = next;
          apply();
          return true;
        },
        ignoreMutation: (m: any) =>
          cap.contains(m.target as Node) || m.type !== "selection",
        stopEvent: (e: Event) => cap.contains(e.target as Node),
      };
    };
  },
});
