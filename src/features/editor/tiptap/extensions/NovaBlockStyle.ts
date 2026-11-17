// features/editor/tiptap/extensions/NovaBlockStyle.ts
//
// One `style` attribute (raw inline CSS) on EVERY ordinary block: paragraph,
// heading, lists, list item, quote, code block — plus all the shapes and the
// note. NovaBox already has its own `style` attribute, so it is not listed
// here, but the helpers below treat it like any other target. That is what
// lets one panel (BoxStylePanel) set width, height, colors... on "any
// element" without each node file knowing about it.
//
// Not covered on purpose: images and tables (+ cells). They already have
// dedicated handles/attributes (widthPct, tableWidth, colwidth) and a second
// width source would fight them.
//
// Why a `data-nova-style` copy next to `style`:
//   Pasting from Word/web gives paragraphs inline styles of their own. If we
//   read `style` back from HTML, all of that junk would become block styling.
//   So we only READ `data-nova-style` — which only our own output has — and
//   WRITE both (style = what the browser paints, data-nova-style = what we
//   trust when reading). TextAlign also writes `style` on paragraphs/headings;
//   Tiptap's mergeAttributes joins the two, they do not overwrite each other.

import { Extension, type Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { SHAPE_NODE_NAMES, shapeLabelOf } from "./NovaShapes";

const PLAIN_BLOCKS = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
];

// NovaBox defines its own `style` attribute (plain `style`, no data- copy).
const OWN_STYLE = "novaBox";

const GLOBAL_TYPES = [...PLAIN_BLOCKS, ...SHAPE_NODE_NAMES];
const STYLEABLE = new Set<string>([...GLOBAL_TYPES, OWN_STYLE]);

const LABELS: Record<string, string> = {
  paragraph: "فقرة",
  bulletList: "قائمة نقطية",
  orderedList: "قائمة مرقمة",
  listItem: "عنصر قائمة",
  blockquote: "اقتباس",
  codeBlock: "كود",
  novaBox: "صندوق",
};

export type StyleTarget = {
  /** Position of the node in the document. */
  pos: number;
  /** Node type name, e.g. "paragraph" or "novaSteps". */
  name: string;
  /** Arabic label for the picker. */
  label: string;
  /** Its current inline CSS ("" when none). */
  style: string;
};

function labelOf(name: string, attrs: Record<string, unknown>): string {
  if (name === "heading") return `عنوان ${attrs.level ?? ""}`.trim();
  return shapeLabelOf(name) ?? LABELS[name] ?? name;
}

/**
 * Every styleable element around the cursor, INNERMOST first
 * (paragraph → list item → list → shape ...). A node selection (a box the
 * user tapped as a whole) counts as the innermost one.
 */
export function styleTargets(editor: Editor): StyleTarget[] {
  const { selection } = editor.state;
  const out: StyleTarget[] = [];

  if (selection instanceof NodeSelection && STYLEABLE.has(selection.node.type.name)) {
    const n = selection.node;
    out.push({
      pos: selection.from,
      name: n.type.name,
      label: labelOf(n.type.name, n.attrs),
      style: (n.attrs.style as string) ?? "",
    });
  }

  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d);
    if (!STYLEABLE.has(n.type.name)) continue;
    out.push({
      pos: $from.before(d),
      name: n.type.name,
      label: labelOf(n.type.name, n.attrs),
      style: (n.attrs.style as string) ?? "",
    });
  }
  return out;
}

/** Replace the inline CSS of the element at `pos`. Other attributes stay. */
export function setStyleAt(editor: Editor, pos: number, style: string): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || !STYLEABLE.has(node.type.name)) return false;
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: style.trim() }),
  );
  return true;
}

export const NovaBlockStyle = Extension.create({
  name: "novaBlockStyle",

  addGlobalAttributes() {
    return [
      {
        types: GLOBAL_TYPES,
        attributes: {
          style: {
            default: "",
            parseHTML: (element: HTMLElement) =>
              element.getAttribute("data-nova-style") || "",
            renderHTML: (attrs: { style?: string }) =>
              attrs.style
                ? { style: attrs.style, "data-nova-style": attrs.style }
                : {},
          },
        },
      },
    ];
  },
});
