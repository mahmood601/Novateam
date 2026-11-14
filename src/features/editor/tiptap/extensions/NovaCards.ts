// features/editor/tiptap/extensions/NovaCards.ts
//
// "Cards": a titled group of parallel items, shown as a numbered grid.
//
//   :::cards cols=2 Indications
//   - First item
//   - Second item
//   :::
//
// ─────────────────────────────────────────────────────────────────────
// The one idea behind this file: the node stores MEANING, not looks.
// ─────────────────────────────────────────────────────────────────────
// The document only remembers three things: the title, how many columns,
// and a normal bullet list inside. Everything visual — the grid, the
// numbers, the colors, the shape of the badge — lives in
// CSS (public/print/paged-print.css, "Nova shapes: cards"). That is what
// lets one lecture be restyled by switching a theme, with no edit to the
// lecture itself.
//
// Three places read this same definition, so they can never drift apart:
//   • the editor        (TiptapReviewEditor → extensionsArr)
//   • the reading view  (jsonToLectureHtml → extensionsArr → getHTML)
//   • the print/A4 view (same HTML, paginated by Paged.js)
//
// Why `data-title` + CSS `::before` instead of a title <div> inside the
// node (like novaNote does): a title drawn as a sibling element comes
// back as an extra paragraph when the HTML is parsed again (see the
// novaNote note in NovaClipboard.ts). An attribute round-trips cleanly.

import { Node, mergeAttributes } from "@tiptap/core";
import { stampSectionColorsIn } from "../../lib/sectionColors";

export const CARDS_MIN_COLS = 1;
export const CARDS_MAX_COLS = 3;
export const CARDS_DEFAULT_COLS = 2;

/**
 * Stamp card numbers into generated HTML because Paged.js can rewrite
 * CSS-counter increments while paginating independently reset lists.
 */
export function addNovaCardNumbers(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");

  document.querySelectorAll<HTMLElement>(".nova-cards > ul").forEach((list) => {
    let number = 0;
    Array.from(list.children).forEach((item) => {
      if (item instanceof HTMLElement && item.tagName === "LI") {
        item.dataset.cardNumber = String(++number);
      }
    });
  });

  // Same post-processing step, also gives plain blocks their section's
  // data-color (so manual "section color" fills resolve in read/print).
  stampSectionColorsIn(document.body);

  return document.body.innerHTML;
}

function clampCols(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return CARDS_DEFAULT_COLS;
  return Math.min(CARDS_MAX_COLS, Math.max(CARDS_MIN_COLS, Math.round(n)));
}

export const NovaCards = Node.create({
  name: "novaCards",
  group: "block",
  // "block+" (not "bulletList") on purpose: AI output is not always
  // perfect, and a strict schema would make a stray paragraph throw
  // instead of just rendering. The CSS styles the list when there is one.
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      // Filled automatically by NovaHeading's color sync (it must list
      // this node in COLORABLE_TYPES) so the cards take the color of the
      // section they sit in.
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attrs) =>
          attrs.color ? { "data-color": attrs.color } : {},
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attrs) =>
          attrs.title ? { "data-title": attrs.title } : {},
      },
      cols: {
        default: CARDS_DEFAULT_COLS,
        parseHTML: (element) => clampCols(element.getAttribute("data-cols")),
        renderHTML: (attrs) => ({ "data-cols": String(clampCols(attrs.cols)) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-nova-block="cards"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-block": "cards",
        class: "nova-cards",
      }),
      0, // the "hole": ProseMirror renders the node's children here
    ];
  },

  // Typing `:::cards cols=2 Title` and pressing Enter wraps the line in a
  // cards block holding an empty bullet list — same gesture as the
  // `:::note` callouts, so there is nothing new for the team to learn.
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from, empty } = selection;
        if (!empty || $from.parent.type.name !== "paragraph") return false;

        const match = $from.parent.textContent.match(
          /^\s*:::cards(?:[ \t]+cols=([1-3]))?(?:[ \t]+(.+))?$/,
        );
        if (!match) return false;

        return editor
          .chain()
          .focus()
          .deleteRange({ from: $from.start(), to: $from.end() })
          .wrapIn(this.name, {
            cols: clampCols(match[1]),
            title: match[2]?.trim() || null,
          })
          .toggleBulletList()
          .run();
      },
    };
  },

  // ── Markdown → document ────────────────────────────────────────────
  markdownTokenizer: {
    name: "novaCards",
    level: "block" as const,
    // Tells the Markdown parser where a cards block could begin, so it can
    // interrupt a paragraph that runs right into it.
    start(src: string) {
      const match = src.match(/^:::cards\b/m);
      return match ? (match.index ?? -1) : -1;
    },
    tokenize(src: string, _tokens: unknown, lexer: any) {
      // :::cards [cols=N] [Title]  \n  content  \n  :::
      const match =
        /^:::cards(?:[ \t]+cols=([1-3]))?(?:[ \t]+([^\n]+))?[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(
          src,
        );
      if (!match) return undefined;

      return {
        type: "novaCards",
        raw: match[0],
        attrs: {
          cols: clampCols(match[1]),
          title: match[2]?.trim() || null,
        },
        tokens: lexer.blockTokens(match[3] || ""),
      };
    },
  },

  parseMarkdown: (token: any, helpers: any) =>
    helpers.createNode(
      "novaCards",
      token.attrs || { cols: CARDS_DEFAULT_COLS, title: null },
      helpers.parseChildren(token.tokens || []),
    ),

  // ── Document → Markdown ────────────────────────────────────────────
  renderMarkdown: (node: any, helpers: any) => {
    const cols = clampCols(node.attrs?.cols);
    const title = node.attrs?.title ? ` ${node.attrs.title}` : "";
    const content = helpers.renderChildren(node.content || [], "\n\n");
    return `:::cards cols=${cols}${title}\n${content}\n:::`;
  },
});

export default NovaCards;
