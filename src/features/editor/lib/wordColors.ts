// features/editor/lib/wordColors.ts
//
// MS Word "Office" theme palette — completely separate from the Nova
// brand colors (novaColors.ts / formatColors.ts), which stay untouched
// for headings and the Nova-specific blocks.
//
// Layout mirrors Word's color dropdown: 9 theme columns x 6 rows (the
// base color, then five lighter/darker degrees), plus a row of standard
// colors. White and Black are real columns with their own degrees.
//
// Degrees use Word's own HSL algorithm so values match Word exactly:
//   lighter X% -> channel = c + (255 - c) * X
//   darker  X% -> channel = c * (1 - X)

import { NOVA_COLOR_HEX } from "./novaColors";

export type WordSwatch = {
  /** Uppercase #RRGGBB */
  value: string;
  /** Arabic label shown as tooltip / aria-label */
  label: string;
};

type Degree = { kind: "lighter" | "darker"; pct: number };

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

function applyDegree(hex: string, { kind, pct }: Degree): string {
  const p = pct / 100;
  const mix = (c: number) =>
    Math.round(kind === "lighter" ? c + (255 - c) * p : c * (1 - p));
  return (
    "#" +
    hexToRgb(hex)
      .map((c) => mix(c).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

const degreeLabel = ({ kind, pct }: Degree) =>
  `${kind === "lighter" ? "أفتح" : "أغمق"} ${pct}%`;

type ThemeColor = { name: string; hex: string; degrees: Degree[] };

const L = (pct: number): Degree => ({ kind: "lighter", pct });
const D = (pct: number): Degree => ({ kind: "darker", pct });

// Nova's own degrees: 20% black, 20% white, 70% white, 92% white, 94% white.
const NOVA_DEGREES: Degree[] = [D(20), L(20), L(70), L(92), L(94)];

// White + Black (with Word-style degrees) followed by the 7 Nova colors.
// Hex values come from NOVA_COLOR_HEX, so this follows any change there.
const THEME_COLORS: ThemeColor[] = [
  { name: "أبيض", hex: "#FFFFFF", degrees: [D(5), D(15), D(25), D(35), D(50)] },
  { name: "أسود", hex: "#000000", degrees: [L(50), L(35), L(25), L(15), L(5)] },
  { name: "وردي", hex: NOVA_COLOR_HEX.rose, degrees: NOVA_DEGREES },
  { name: "برتقالي", hex: NOVA_COLOR_HEX.orange, degrees: NOVA_DEGREES },
  { name: "أزرق", hex: NOVA_COLOR_HEX.blue, degrees: NOVA_DEGREES },
  { name: "أخضر", hex: NOVA_COLOR_HEX.green, degrees: NOVA_DEGREES },
  { name: "ذهبي", hex: NOVA_COLOR_HEX.yellow, degrees: NOVA_DEGREES },
  { name: "بنفسجي", hex: NOVA_COLOR_HEX.purple, degrees: NOVA_DEGREES },
  { name: "فوشيا", hex: NOVA_COLOR_HEX.pink, degrees: NOVA_DEGREES },
];

// Word shows pure black's 50% step as #7F7F7F (the HSL maths gives
// #808080), so pin that one to match.
const OVERRIDES: Record<string, string> = { "#000000:lighter50": "#7F7F7F" };

/** 10 columns, each = [base, ...5 degrees]. */
export const WORD_THEME_COLUMNS: WordSwatch[][] = THEME_COLORS.map((c) => [
  { value: c.hex, label: c.name },
  ...c.degrees.map((d) => ({
    value: OVERRIDES[`${c.hex}:${d.kind}${d.pct}`] ?? applyDegree(c.hex, d),
    label: `${c.name}، ${degreeLabel(d)}`,
  })).reverse(),
]);

/**
 * Same colors as rows (6 rows x 10 columns) — the order a CSS grid fills
 * in, so the picker can render it with a plain `grid-cols-10`.
 */
export const WORD_THEME_ROWS: WordSwatch[][] = Array.from({ length: 6 }, (_, row) =>
  WORD_THEME_COLUMNS.map((col) => col[row]),
);

/** Word's "standard colors" row. */
export const WORD_STANDARD_COLORS: WordSwatch[] = [
  { value: "#C00000", label: "أحمر داكن" },
  { value: "#FF0000", label: "أحمر" },
  { value: "#FFC000", label: "برتقالي" },
  { value: "#FFFF00", label: "أصفر" },
  { value: "#92D050", label: "أخضر فاتح" },
  { value: "#00B050", label: "أخضر" },
  { value: "#00B0F0", label: "أزرق فاتح" },
  { value: "#0070C0", label: "أزرق" },
  { value: "#002060", label: "أزرق داكن" },
  { value: "#7030A0", label: "أرجواني" },
];

/** True when white text/checkmarks would be unreadable on this color. */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex.length === 7 ? hex : "#808080");
  // Perceived luminance (Rec. 601)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

/** Normalises "#abc" / "#AABBCC" / "#aabbccdd" to "#AABBCC" for comparison. */
export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return ("#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toUpperCase();
  }
  if (/^#[0-9a-f]{6}/.test(v)) return v.slice(0, 7).toUpperCase();
  return null;
}