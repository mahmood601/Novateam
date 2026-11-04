// features/shared/hooks/useShapeTheme.ts
//
// Which "look" the lecture shapes (cards, steps, chips, ...) use.
//
// How it fits together:
//   • The lecture never stores a look. It stores :::cards, :::steps, ...
//   • public/print/paged-print.css draws every shape, and changes its
//     look when an ancestor has data-shape-theme="bignum" | "square".
//   • This file only sets that one attribute on <html> and remembers
//     the choice in localStorage, the same way useTheme.tsx does for the
//     app color. No lecture is touched when the theme changes.
//
// "circle" is the default look and has no attribute at all, so the CSS
// default applies.

import { createSignal } from "solid-js";

export const SHAPE_THEMES = [
  { id: "circle", label: "دائري" },
  { id: "bignum", label: "رقم كبير" },
  { id: "square", label: "مربع" },
] as const;

export type ShapeThemeId = (typeof SHAPE_THEMES)[number]["id"];

const STORAGE_KEY = "shape-theme";

function isShapeTheme(value: unknown): value is ShapeThemeId {
  return SHAPE_THEMES.some((t) => t.id === value);
}

function readStored(): ShapeThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isShapeTheme(stored) ? stored : "circle";
  } catch {
    return "circle"; // storage can be blocked (private mode)
  }
}

// Module-level signal: every component that calls useShapeTheme() sees the
// same value, and the Settings page updates instantly.
const [shapeTheme, setShapeThemeSignal] = createSignal<ShapeThemeId>(readStored());

function writeAttribute(id: ShapeThemeId) {
  if (id === "circle") {
    document.documentElement.removeAttribute("data-shape-theme");
  } else {
    document.documentElement.setAttribute("data-shape-theme", id);
  }
}

/** Call once at startup (App.tsx onMount): applies the saved choice. */
export function initShapeTheme() {
  writeAttribute(shapeTheme());
}

export function setShapeTheme(id: ShapeThemeId) {
  writeAttribute(id);
  setShapeThemeSignal(id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* the choice still applies for this session */
  }
}

export function useShapeTheme() {
  return { shapeTheme, setShapeTheme, shapeThemes: SHAPE_THEMES };
}
