// "Section color" for MANUAL colors (table cell fill, text color, highlight,
// borders, box colors).
//
// Problem: a color picked from the normal palette is a fixed #hex. When the
// section's h1 changes color (a section moved, inserted or deleted -> the
// colors are re-cycled by NovaHeadingExtension), those fixed colors stay behind.
//
// Solution: a manual color can be a REFERENCE instead of a hex, e.g.
//     background-color: var(--nova-bg-light, #D1D5DB)
// `--nova-*` are the tokens that paged-print.css defines on every
// [data-color="rose|orange|..."] element, i.e. they already hold the section's
// color and its shades. The stored value never changes; the browser resolves it
// from the section the block lives in, so it follows the h1 automatically in
// the editor, the reading view, the A4 preview and the print.
//
// Two helpers make that work everywhere:
//   - NovaSectionTokens.ts  : editor decoration that puts data-color on every
//                              top-level block (paragraphs, lists, ...) which has
//                              none, so a text color / highlight can resolve it.
//   - stampSectionColors()  : same thing for the generated HTML (read/print).

import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";

import { NOVA_COLOR_CYCLE, type NovaColor } from "../types/novaAst";
import { FORMAT_COLOR_GROUPS } from "./formatColors";

export type SectionShade = {
  /** CSS custom property defined by paged-print.css on [data-color] */
  token: string;
  /** Used where there is no section yet (content before the first h1) */
  fallback: string;
  label: string;
};

/** Same order as the swatch rows in formatColors.ts (main, then 5 degrees). */
export const SECTION_SHADES: SectionShade[] = [
  { token: "--nova-color", fallback: "#6B7280", label: "لون القسم" },
  { token: "--nova-border", fallback: "#4B5563", label: "لون القسم، أغمق 20%" },
  { token: "--nova-bg-strong", fallback: "#9CA3AF", label: "لون القسم، أفتح 20%" },
  { token: "--nova-bg-light", fallback: "#D1D5DB", label: "لون القسم، أفتح 70%" },
  { token: "--nova-bg-tint", fallback: "#F3F4F6", label: "لون القسم، أفتح 92%" },
  { token: "--nova-bg-tint-quiz", fallback: "#F9FAFB", label: "لون القسم، أفتح 94%" },
];

export const SECTION_NEUTRAL_HEXES = SECTION_SHADES.map((s) => s.fallback);

/** The value that gets stored: follows the section, falls back to a gray. */
export function sectionValue(shade: number): string {
  const s = SECTION_SHADES[shade];
  return `var(${s.token}, ${s.fallback})`;
}

/** Which shade (0-5) a stored value refers to, or -1 if it is not a section color. */
export function sectionShadeIndex(value: string | null | undefined): number {
  if (!value) return -1;
  const m = /^\s*var\(\s*(--nova-[a-z-]+)/i.exec(value);
  if (!m) return -1;
  return SECTION_SHADES.findIndex((s) => s.token === m[1].toLowerCase());
}

export const isSectionColor = (value: string | null | undefined) =>
  sectionShadeIndex(value) !== -1;

// Real hex of each shade, per section color (for previews only).
const HEXES: Record<NovaColor, string[]> = Object.fromEntries(
  NOVA_COLOR_CYCLE.map((c, i) => [c, FORMAT_COLOR_GROUPS[i].map((s) => s.value.toUpperCase())]),
) as Record<NovaColor, string[]>;

export function sectionHexes(color: NovaColor | string | null | undefined): string[] {
  return (color && HEXES[color as NovaColor]) || SECTION_NEUTRAL_HEXES;
}

/** Color of the section (last level-1 heading) that contains `pos`. */
export function sectionColorAt(state: EditorState, pos?: number): NovaColor | null {
  const at = Math.min(pos ?? state.selection.from, state.doc.content.size);
  let color: NovaColor | null = null;
  state.doc.nodesBetween(0, at, (node) => {
    if (node.type.name === "heading" && node.attrs.level === 1 && node.attrs.color) {
      color = node.attrs.color as NovaColor;
    }
    // headings are leaves for our purpose; everything else may hold headings
    return node.type.name === "heading" ? false : true;
  });
  return color;
}

/** The 6 real hexes of the section around the cursor (for the picker + previews). */
export function sectionHexesOf(editor: Editor | null | undefined): string[] {
  if (!editor) return SECTION_NEUTRAL_HEXES;
  return sectionHexes(sectionColorAt(editor.state));
}

/**
 * A stored color -> something that can be painted OUTSIDE the document
 * (palette chips, preview dots), where the `--nova-*` tokens do not exist.
 */
export function previewColor(
  value: string | null | undefined,
  hexes: string[],
): string | undefined {
  if (!value) return undefined;
  const i = sectionShadeIndex(value);
  return i === -1 ? value : hexes[i];
}

/**
 * Generated HTML (reading view / A4 preview / print): give every top-level
 * block that has no data-color the color of its section, so `var(--nova-*)`
 * resolves on plain paragraphs, lists, images... exactly as it does in the
 * editor (see NovaSectionTokens.ts). Mutates `root`'s children in place.
 */
export function stampSectionColorsIn(root: HTMLElement) {
  let current: string | null = null;
  for (const el of Array.from(root.children)) {
    if (el.tagName === "H1" && el.getAttribute("data-color")) {
      current = el.getAttribute("data-color");
    }
    if (current && !el.hasAttribute("data-color")) {
      el.setAttribute("data-color", current);
    }
  }
}
