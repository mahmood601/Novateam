// Dark-mode adaptation of colors that are STORED as fixed values in a lecture
// (table cell fills, text colors, highlights... picked before colors became
// `var(--nova-*)` references, or typed as custom colors).
//
// Nothing in the saved document changes. At render time each fixed color is
// given a dark counterpart that is applied ONLY under `.dark` (see the
// `[data-dk-bg]` / `[data-dk-fg]` rules in paged-print.css):
//   1. A palette color of the SAME hue as its section becomes the matching
//      `var(--nova-*)` token, so it follows the section color exactly like a
//      stored reference would (the "Word theme color" behaviour).
//   2. Any other color is mixed with the dark palette tokens (surface / ink),
//      which keeps its hue but fits the dark surface.
// Print and the A4 preview never see these attributes' rules, so they keep
// the original colors.

import { NOVA_COLOR_CYCLE } from "../types/novaAst";
import { SECTION_SHADES, sectionHexes } from "./sectionColors";

type RGB = [number, number, number];
type Kind = "bg" | "fg";

/** "#abc", "#aabbcc", "rgb(a)(...)" -> [r,g,b]; null if not a plain opaque color. */
export function parseCssColor(raw: string): RGB | null {
  const v = raw.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16)) as RGB;
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as RGB;
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a < 1) return null; // translucent colors already blend with the surface
    return [+m[1], +m[2], +m[3]];
  }
  return null;
}

const key = (c: RGB) => c.join(",");
const lightness = ([r, g, b]: RGB) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// "r,g,b" of every palette swatch -> its hue and shade index (0..5).
let paletteIndex: Map<string, { hue: string; shade: number }> | null = null;
function palette() {
  if (paletteIndex) return paletteIndex;
  paletteIndex = new Map();
  for (const hue of NOVA_COLOR_CYCLE) {
    sectionHexes(hue).forEach((hex, shade) => {
      const rgb = parseCssColor(hex);
      if (rgb) paletteIndex!.set(key(rgb), { hue, shade });
    });
  }
  return paletteIndex;
}

/**
 * The dark-mode CSS value for a stored color, or null when it needs no change
 * (already a token, translucent, or already suitable for a dark surface).
 */
export function darkReplacement(kind: Kind, raw: string, sectionHue: string | null): string | null {
  if (!raw || raw.includes("var(")) return null; // already a reference
  const rgb = parseCssColor(raw);
  if (!rgb) return null;

  const hit = palette().get(key(rgb));
  const src = `rgb(${rgb.join(" ")})`;
  const L = lightness(rgb);

  if (kind === "bg") {
    if (hit && hit.hue === sectionHue) return `var(${SECTION_SHADES[hit.shade].token})`;
    if (L <= 0.5) return null; // strong fills (header-like) stay as they are
    // lighter source -> less of it: 94% tint ~14%, 70% tint ~30%
    const pct = Math.round(clamp(0.14 + 1.78 * (0.97 - L), 0.08, 0.6) * 100);
    return `color-mix(in srgb, ${src} ${pct}%, var(--color-surface-dark, #1b243a))`;
  }

  if (L >= 0.6) return null; // already readable on dark
  if (hit && hit.hue === sectionHue && hit.shade <= 1) return "var(--nova-color)";
  const keep = Math.round(clamp(0.1 + L * 1.2, 0.1, 0.6) * 100);
  return `color-mix(in srgb, ${src} ${keep}%, var(--color-ink-dark, #f1f5f9))`;
}

/** Reading view: annotate every element that carries a fixed inline color. */
export function applyDarkColorsDom(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    const hue = el.closest("[data-color]")?.getAttribute("data-color") ?? null;
    (["bg", "fg"] as const).forEach((kind) => {
      const raw = kind === "bg" ? el.style.backgroundColor : el.style.color;
      const v = darkReplacement(kind, raw, hue);
      if (v) {
        el.setAttribute(`data-dk-${kind}`, "");
        el.style.setProperty(`--dk-${kind}`, v);
      }
    });
  });
}
