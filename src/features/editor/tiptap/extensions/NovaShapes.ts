import { Node, Extension, mergeAttributes, type Editor } from "@tiptap/core";
import { SUPPORTED_ADMONITION_TYPES, type AdmonitionType } from "./NovaAdmonition";
import { Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";

type ShapeName = "steps" | "compare" | "chips" | "case" | "summary";

const SHAPES: Record<ShapeName, { className: string; content: string }> = {
  steps: { className: "nova-steps", content: "block+" },
  compare: { className: "nova-compare", content: "block+" },
  chips: { className: "nova-chips", content: "block+" },
  case: { className: "nova-case", content: "block+" },
  summary: { className: "nova-summary", content: "block+" },
};

// ─────────────────────────────────────────────────────────────────────
// 1) Reading `:::name Title ... :::` from markdown — now forgiving.
// ─────────────────────────────────────────────────────────────────────
// Before: a shape existed only if the closing `:::` line was present.
// AI output often forgets it, and then the whole block stayed plain text.
//
// Now: if there is no closing `:::`, the shape closes by itself at the
// first of: another `:::something` line, a heading line, or the end of
// the text. A properly closed shape behaves exactly as before.
//
// (Written as a plain function so it can be tested without Tiptap.)
export function matchShapeFence(
  src: string,
  name: string,
): { raw: string; title: string | null; body: string } | null {
  const opener = `^:::${name}(?:[ \\t]+([^\\n]+))?[ \\t]*\\n`;

  // Closed form. The body may not contain another `:::word` opener, so an
  // unclosed shape can never "borrow" the closing line of a later one.
  const closed = new RegExp(
    `${opener}(?:((?:(?!\\n:::[A-Za-z])[\\s\\S])*?)\\n)?:::[ \\t]*(?:\\n|$)`,
  ).exec(src);
  if (closed) {
    return {
      raw: closed[0],
      title: closed[1]?.trim() || null,
      body: closed[2] ?? "",
    };
  }

  // Unclosed form: close it ourselves.
  const open = new RegExp(
    `${opener}([\\s\\S]*?)(?=\\n:::|\\n#{1,6}[ \\t]|$)`,
  ).exec(src);
  if (!open) return null;
  return {
    raw: open[0],
    title: open[1]?.trim() || null,
    body: open[2] ?? "",
  };
}

function shapeTokenizer(name: ShapeName): any {
  return {
    name: `nova${name[0].toUpperCase()}${name.slice(1)}`,
    level: "block" as const,
    start(src: string) {
      const match = new RegExp(`^:::${name}\\b`, "m").exec(src);
      return match ? (match.index ?? -1) : -1;
    },
    tokenize(src: string, _tokens: unknown, lexer: { blockTokens: (value: string) => unknown[] }) {
      const m = matchShapeFence(src, name);
      if (!m) return undefined;
      return {
        type: `nova${name[0].toUpperCase()}${name.slice(1)}`,
        raw: m.raw,
        attrs: { title: m.title },
        tokens: lexer.blockTokens(m.body),
      };
    },
  };
}

function createShape(name: ShapeName) {
  const shape = SHAPES[name];
  const nodeName = `nova${name[0].toUpperCase()}${name.slice(1)}`;

  return Node.create({
    name: nodeName,
    group: "block",
    content: shape.content,
    defining: true,

    addAttributes() {
      return {
        color: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("data-color"),
          renderHTML: (attrs: { color?: string | null }) =>
            attrs.color ? { "data-color": attrs.color } : {},
        },
        title: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("data-title"),
          renderHTML: (attrs: { title?: string | null }) =>
            attrs.title ? { "data-title": attrs.title } : {},
        },
      };
    },

    parseHTML() {
      return [{ tag: `div[data-nova-block="${name}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-nova-block": name,
          class: shape.className,
        }),
        0,
      ];
    },

    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          const { $from, empty } = editor.state.selection;
          if (!empty || $from.parent.type.name !== "paragraph") return false;
          const match = $from.parent.textContent.match(
            new RegExp(`^\\s*:::${name}(?:[ \\t]+(.+))?$`),
          );
          if (!match) return false;

          const chain = editor
            .chain()
            .focus()
            .deleteRange({ from: $from.start(), to: $from.end() })
            .wrapIn(nodeName, { title: match[1]?.trim() || null });
          if (name === "steps") chain.toggleOrderedList();
          if (name === "chips") chain.toggleBulletList();
          return chain.run();
        },
      };
    },

    markdownTokenizer: shapeTokenizer(name),
    parseMarkdown: (token: any, helpers: any) =>
      helpers.createNode(nodeName, token.attrs || { title: null }, helpers.parseChildren(token.tokens || [])),
    renderMarkdown: (node: any, helpers: any) => {
      const title = node.attrs?.title ? ` ${node.attrs.title}` : "";
      const content = helpers.renderChildren(node.content || [], "\n\n");
      return `:::${name}${title}\n${content}\n:::`;
    },
  });
}

export const NovaSteps = createShape("steps");
export const NovaCompare = createShape("compare");
export const NovaChips = createShape("chips");
export const NovaCase = createShape("case");
export const NovaSummary = createShape("summary");

// ─────────────────────────────────────────────────────────────────────
// 2) Editing a shape from the editor (no markdown typing needed).
// ─────────────────────────────────────────────────────────────────────
// The title is stored as an ATTRIBUTE and drawn by CSS (::before), so it
// is not text the cursor can enter — that is why it could not be edited.
// The fix: tapping the title strip of a shape asks the editor to open
// the title sheet. This file only DETECTS the tap and changes the
// attribute; the sheet itself (UI) lives in TiptapReviewEditor, which
// already has askInput(). They talk through one DOM event.

/** Display names in the insert menu (edit freely — labels only). */
export const SHAPE_MENU = [
  { key: "steps", node: "novaSteps", label: "خطوات" },
  { key: "compare", node: "novaCompare", label: "مقارنة" },
  { key: "chips", node: "novaChips", label: "نقاط مختصرة" },
  { key: "case", node: "novaCase", label: "حالة" },
  { key: "summary", node: "novaSummary", label: "ملخص" },
  { key: "cards", node: "novaCards", label: "بطاقات" },
] as const;

export type ShapeKey = (typeof SHAPE_MENU)[number]["key"];

export const EDIT_SHAPE_TITLE_EVENT = "nova:edit-shape-title";
export type EditShapeTitleDetail = {
  pos: number;
  title: string | null;
  label: string;
  /** Node type name, e.g. "novaSteps" or "novaNote". */
  node: string;
};

/** Arabic names of the note (callout) types — labels only, edit freely. */
export const NOTE_TYPE_LABELS: Record<AdmonitionType, string> = {
  note: "ملاحظة",
  tip: "نصيحة",
  warning: "تحذير",
  danger: "خطر",
  info: "معلومة",
  important: "مهم",
};
export { SUPPORTED_ADMONITION_TYPES };

// Everything with an editable title and manageable children: the shapes
// AND the note/callout (novaNote). The note's title is drawn differently
// (a real header element, not ::before) but is stored as the same `title`.
const SHAPE_BY_NODE = new Map<string, { label: string }>([
  ...SHAPE_MENU.map((s) => [s.node, { label: s.label }] as const),
  ["novaNote", { label: "ملاحظة" }] as const,
]);
const SHAPE_SELECTOR = SHAPE_MENU.map((s) => `[data-nova-block="${s.key}"]`).join(",");

/**
 * Height (px) of the strip at the top of a shape that counts as "the title".
 * From paged-print.css: steps/compare/case/summary = 1rem padding + a title
 * line (~24px) + 0.65rem gap ≈ 50px; cards = a ~35px title bar. A tap that
 * lands on the list or text itself never reaches this code (see the
 * `target !== el` check), so a slightly generous value is safe.
 */
const TITLE_STRIP_PX = 48;

/** The shape the cursor is inside (nearest one), or null. */
export function currentShapeInfo(editor: Editor): EditShapeTitleDetail | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    const shape = SHAPE_BY_NODE.get(node.type.name);
    if (shape) {
      return {
        pos: $from.before(d),
        title: (node.attrs.title as string | null) ?? null,
        label: shape.label,
        node: node.type.name,
      };
    }
  }
  return null;
}

/** Change (or clear, with empty text) the title of the shape at `pos`. */
export function setShapeTitle(editor: Editor, pos: number, title: string | null): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || !SHAPE_BY_NODE.has(node.type.name)) return false;
  const next = title?.trim() || null;
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, title: next }),
  );
  return true;
}

/**
 * Create a shape right now around the current line — no `:::` typing and
 * no closing line to wait for. Same result as typing `:::steps` + Enter.
 */
export function insertShape(editor: Editor, key: ShapeKey, title: string | null = null): boolean {
  const shape = SHAPE_MENU.find((s) => s.key === key);
  if (!shape) return false;
  const chain = editor.chain().focus().wrapIn(shape.node, { title: title?.trim() || null });
  if (key === "steps") chain.toggleOrderedList();
  if (key === "chips" || key === "cards") chain.toggleBulletList();
  return chain.run();
}

// ─────────────────────────────────────────────────────────────────────
// 3) Keeping a shape OPEN and managing what is inside it.
// ─────────────────────────────────────────────────────────────────────
// Idea: a shape is a normal Tiptap container. After `:::steps` + Enter you
// are INSIDE it and it stays open — type, add and delete items as long as
// you like. It only "closes" when you say so: type `:::` on its own line
// and press Enter (like the closing fence in markdown), or use the
// buttons in the insert menu. All of these helpers work on the nearest
// shape around the cursor.

/** Containers that a lone `:::` line can close (shapes + the note callout). */
const CLOSABLE = new Set<string>(SHAPE_BY_NODE.keys());

type Container = { depth: number; node: PMNode };

function nearestContainer($pos: ResolvedPos, names: Set<string>): Container | null {
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (names.has(node.type.name)) return { depth: d, node };
  }
  return null;
}

/** The "item" the cursor is in: its list item, else the shape's direct child. */
function itemDepthOf($pos: ResolvedPos, shapeDepth: number): number {
  for (let d = $pos.depth; d > shapeDepth; d--) {
    if ($pos.node(d).type.name === "listItem") return d;
  }
  return shapeDepth + 1;
}

/**
 * Delete the block at `startDepth` — and climb upward while its parent would
 * be left empty (the last <li> takes its <ul> with it). A shape must keep at
 * least one child, so if that was the last thing in it, leave an empty
 * paragraph behind instead. Returns where the deletion started.
 */
function removeBlockAt(
  tr: Transaction,
  $pos: ResolvedPos,
  shapeDepth: number,
  startDepth: number,
): number {
  let t = startDepth;
  while (t - 1 > shapeDepth && $pos.node(t - 1).childCount === 1) t--;
  const from = $pos.before(t);
  const to = $pos.after(t);
  if (t - 1 === shapeDepth && $pos.node(shapeDepth).childCount === 1) {
    tr.replaceWith(from, to, $pos.doc.type.schema.nodes.paragraph.create());
  } else {
    tr.delete(from, to);
  }
  return from;
}

/**
 * Leave the shape: put the cursor in a paragraph right after it (reusing an
 * empty one if it is already there). With `removeCurrentLine`, the line the
 * cursor is on (the typed `:::`) is deleted first.
 */
export function exitShape(editor: Editor, removeCurrentLine = false): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  const box = nearestContainer($from, CLOSABLE);
  if (!box) return false;

  const tr = state.tr;
  const shapeEnd = $from.before(box.depth) + box.node.nodeSize;
  if (removeCurrentLine) removeBlockAt(tr, $from, box.depth, $from.depth);

  const end = tr.mapping.map(shapeEnd);
  const next = tr.doc.resolve(end).nodeAfter;
  if (!(next && next.type.name === "paragraph" && next.content.size === 0)) {
    tr.insert(end, state.schema.nodes.paragraph.create());
  }
  tr.setSelection(TextSelection.create(tr.doc, end + 1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}

/** Add an empty item right after the one the cursor is in, and go into it. */
export function addShapeItem(editor: Editor): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  const box = nearestContainer($from, new Set(SHAPE_BY_NODE.keys()));
  if (!box) return false;

  const d = itemDepthOf($from, box.depth);
  const item = $from.node(d);
  const isLi = item.type.name === "listItem";
  const paragraph = state.schema.nodes.paragraph;
  const blank = isLi ? item.type.create(null, paragraph.create()) : paragraph.create();
  const at = $from.after(d);

  const tr = state.tr.insert(at, blank);
  tr.setSelection(TextSelection.create(tr.doc, at + (isLi ? 2 : 1)));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}

/** Delete the item the cursor is in (its list item, or the block). */
export function deleteShapeItem(editor: Editor): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  const box = nearestContainer($from, new Set(SHAPE_BY_NODE.keys()));
  if (!box) return false;

  const tr = state.tr;
  const from = removeBlockAt(tr, $from, box.depth, itemDepthOf($from, box.depth));
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(from, tr.doc.content.size)), -1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}

/** Remove the shape. With `keepContent`, its contents stay as plain blocks. */
export function removeShape(editor: Editor, keepContent: boolean): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  const box = nearestContainer($from, new Set(SHAPE_BY_NODE.keys()));
  if (!box) return false;

  const pos = $from.before(box.depth);
  const end = pos + box.node.nodeSize;
  const tr = state.tr;
  if (keepContent) {
    tr.replaceWith(pos, end, box.node.content);
  } else if ($from.node(box.depth - 1).childCount === 1) {
    tr.replaceWith(pos, end, state.schema.nodes.paragraph.create());
  } else {
    tr.delete(pos, end);
  }
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size)), -1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}

/** Insert a note (callout) of `type` around the current line; it stays open. */
export function insertNote(editor: Editor, type: AdmonitionType): boolean {
  return editor.chain().focus().wrapIn("novaNote", { type, title: null }).run();
}

/** Change the type (warning, tip...) of the note the cursor is in. */
export function setNoteType(editor: Editor, type: AdmonitionType): boolean {
  const { state } = editor;
  const box = nearestContainer(state.selection.$from, new Set(["novaNote"]));
  if (!box) return false;
  const pos = state.selection.$from.before(box.depth);
  editor.view.dispatch(
    state.tr.setNodeMarkup(pos, undefined, { ...box.node.attrs, type }),
  );
  editor.view.focus();
  return true;
}

export const NovaShapeTitleEditor = Extension.create({
  name: "novaShapeTitleEditor",
  // Above the list/other Enter handlers, so a lone `:::` line is seen first.
  priority: 1000,

  // Typing `:::` alone on a line and pressing Enter CLOSES the shape the
  // cursor is in: the `:::` line disappears and the cursor lands on a fresh
  // line after the shape. Anywhere else, Enter behaves as usual.
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== "paragraph") return false;
        if ($from.parent.textContent.trim() !== ":::") return false;
        return exitShape(editor, true);
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("novaShapeTitleEditor"),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              if (!view.editable) return false;
              const target = event.target as HTMLElement | null;
              if (!target) return false;

              // (a) Notes: the title is a real header element — a tap anywhere
              //     on that header edits it.
              const header = target.closest<HTMLElement>(".nova-note-header");
              if (header) {
                const noteEl = header.closest<HTMLElement>(".nova-note");
                let found: EditShapeTitleDetail | null = null;
                view.state.doc.descendants((node, pos) => {
                  if (found) return false;
                  if (node.type.name === "novaNote" && view.nodeDOM(pos) === noteEl) {
                    found = {
                      pos,
                      title: (node.attrs.title as string | null) ?? null,
                      label: "ملاحظة",
                      node: "novaNote",
                    };
                  }
                  return true;
                });
                if (!found) return false;
                view.dom.dispatchEvent(new CustomEvent(EDIT_SHAPE_TITLE_EVENT, { detail: found }));
                return true;
              }

              // (b) Shapes: the title is CSS (::before) on the shape box itself,
              //     so only a tap on the box (title strip / padding) counts —
              //     never on the text inside it.
              const el = target.closest<HTMLElement>(SHAPE_SELECTOR);
              if (!el || target !== el) return false;
              // Divide by the on-screen scale (A4 mode zooms the page), so the
              // strip is always measured in the shape's own CSS pixels.
              const rect = el.getBoundingClientRect();
              const scale = el.offsetHeight ? rect.height / el.offsetHeight : 1;
              const y = ((event as MouseEvent).clientY - rect.top) / (scale || 1);
              if (y > TITLE_STRIP_PX) return false;

              const $inside = view.state.doc.resolve(view.posAtDOM(el, 0));
              for (let d = $inside.depth; d > 0; d--) {
                const node = $inside.node(d);
                const shape = SHAPE_BY_NODE.get(node.type.name);
                if (!shape) continue;
                const detail: EditShapeTitleDetail = {
                  pos: $inside.before(d),
                  title: (node.attrs.title as string | null) ?? null,
                  label: shape.label,
                  node: node.type.name,
                };
                view.dom.dispatchEvent(new CustomEvent(EDIT_SHAPE_TITLE_EVENT, { detail }));
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});