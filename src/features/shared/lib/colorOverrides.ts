// features/shared/lib/colorOverrides.ts
//
// User color customisation on top of src/styles/colors.css.
//
// How it fits together:
//   • colors.css defines every `--color-*` token and its default value.
//   • A user override is just the same variable set inline on <html>, which
//     wins over the stylesheet. Removing the inline value restores the default.
//   • Overrides live in localStorage as { "surface-light": "#ffffff", ... }
//     (keys are the token names without the `--color-` prefix).
//   • The brand preset (Ola, Nizar, ...) is the `data-theme` attribute.
//
// This file never lists default values: they are read back from the CSS, so
// colors.css stays the only place that defines a color.
//
// Editor, print and landing colors are intentionally not part of this.

import { createSignal } from "solid-js";

// ───────────── What can be customised ─────────────

export const PRESETS = [
  { id: "Ola", label: "علا" },
  { id: "Nizar", label: "نزار" },
  { id: "Belal", label: "بلال" },
  { id: "Rama", label: "راما" },
  { id: "Maram", label: "مرام" },
] as const;
export type PresetId = (typeof PRESETS)[number]["id"];

/** Brand colors: one value for both light and dark mode. */
export const BRAND_TOKENS = [
  { name: "main", label: "اللون الأساسي" },
  { name: "secondary", label: "اللون الثانوي" },
  { name: "true", label: "النجاح" },
  { name: "warn", label: "التحذير / الخطأ" },
] as const;

/** Neutral colors: a separate value for light and dark mode. */
export const NEUTRAL_TOKENS = [
  { label: "خلفية الصفحة", light: "main-light", dark: "main-dark" },
  { label: "خلفية ثانوية (أشرطة، تمرير)", light: "darker-light-1", dark: "lighter-dark-1" },
  { label: "خلفية بارزة ومسارات", light: "darker-light-2", dark: "lighter-dark-2" },
  { label: "البطاقات والنوافذ", light: "surface-light", dark: "surface-dark" },
  { label: "الحقول والخلفية العميقة", light: "base-light", dark: "base-dark" },
  { label: "الأزرار الصغيرة والشارات", light: "chip-light", dark: "chip-dark" },
  { label: "الحدود", light: "line-light", dark: "line-dark" },
  { label: "النص الأساسي", light: "ink-light", dark: "ink-dark" },
  { label: "النص الثانوي", light: "ink-soft-light", dark: "ink-soft-dark" },
  { label: "النص الخافت", light: "ink-muted-light", dark: "ink-muted-dark" },
] as const;

const ALLOWED = new Set<string>([
  ...BRAND_TOKENS.map((t) => t.name),
  ...NEUTRAL_TOKENS.flatMap((t) => [t.light, t.dark]),
]);
const BRAND_NAMES: string[] = BRAND_TOKENS.map((t) => t.name);

// ───────────── Storage ─────────────

const OVERRIDES_KEY = "color-overrides";
const THEME_KEY = "theme-color";
const LEGACY_CUSTOM_KEY = "custom-color"; // old single custom main color

export type Overrides = Record<string, string>;

const HEX = /^#[0-9a-fA-F]{6}$/;

function isPreset(v: unknown): v is PresetId {
  return PRESETS.some((p) => p.id === v);
}

function cleanOverrides(raw: unknown): Overrides {
  const out: Overrides = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (ALLOWED.has(k) && typeof v === "string" && HEX.test(v)) out[k] = v.toLowerCase();
    }
  }
  return out;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage can be blocked (private mode)
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* the choice still applies for this session */
  }
}

function loadInitial(): { preset: PresetId; overrides: Overrides } {
  let overrides: Overrides = {};
  try {
    overrides = cleanOverrides(JSON.parse(read(OVERRIDES_KEY) ?? "{}"));
  } catch {
    overrides = {};
  }
  let preset: PresetId = "Ola";
  const storedTheme = read(THEME_KEY);
  if (isPreset(storedTheme)) preset = storedTheme;
  else if (storedTheme === "custom") {
    // Old format: theme "custom" + one main color. Move it to the new format.
    const legacy = read(LEGACY_CUSTOM_KEY);
    if (legacy && HEX.test(legacy) && !overrides.main) overrides.main = legacy.toLowerCase();
  }
  return { preset, overrides };
}

const initial = loadInitial();
const [preset, setPresetSignal] = createSignal<PresetId>(initial.preset);
const [overrides, setOverridesSignal] = createSignal<Overrides>(initial.overrides);
// Bumped after every apply so UI that reads computed defaults re-reads them.
const [version, setVersion] = createSignal(0);

// ───────────── Applying ─────────────

const root = () => document.documentElement;

function applyAll() {
  const el = root();
  el.setAttribute("data-theme", preset());
  const o = overrides();
  for (const name of ALLOWED) {
    if (o[name]) el.style.setProperty(`--color-${name}`, o[name]);
    else el.style.removeProperty(`--color-${name}`);
  }
  // Browser / PWA bar follows the main color.
  const main = readEffective("main");
  if (main) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", main);
  setVersion((v) => v + 1);
}

function persist() {
  write(THEME_KEY, preset());
  write(OVERRIDES_KEY, Object.keys(overrides()).length ? JSON.stringify(overrides()) : null);
  write(LEGACY_CUSTOM_KEY, null);
}

/** Call once at startup, before the first render, so there is no color flash. */
export function initColors() {
  applyAll();
  persist(); // also completes the legacy-format migration
}

// ───────────── Reading values ─────────────

/** "rgb(35, 39, 47)" / "#fff" → "#23272f" ("" if it cannot be parsed). */
function toHex(value: string): string {
  const v = value.trim();
  if (HEX.test(v)) return v.toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(v);
  if (rgb) return "#" + [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return "";
}

/** The color currently in effect for a token (override, preset or default). */
export function readEffective(name: string): string {
  return toHex(getComputedStyle(root()).getPropertyValue(`--color-${name}`));
}

// ───────────── Public API ─────────────

export function useColors() {
  return {
    preset,
    overrides,
    /** Current color of a token. Reactive: re-evaluates after any change. */
    value: (name: string) => {
      version();
      return overrides()[name] ?? readEffective(name);
    },
    isOverridden: (name: string) => name in overrides(),
    /** True when any brand color was changed by hand. */
    hasCustomBrand: () => BRAND_NAMES.some((n) => n in overrides()),
    hasAnyOverride: () => Object.keys(overrides()).length > 0,
  };
}

/** Pick a ready-made brand preset. Hand-picked brand colors are cleared. */
export function setPreset(id: PresetId) {
  const next = { ...overrides() };
  for (const n of BRAND_NAMES) delete next[n];
  setOverridesSignal(next);
  setPresetSignal(id);
  applyAll();
  persist();
}

export function setColor(name: string, hex: string) {
  if (!ALLOWED.has(name) || !HEX.test(hex)) return;
  setOverridesSignal({ ...overrides(), [name]: hex.toLowerCase() });
  applyAll();
  persist();
}

export function resetColor(name: string) {
  const next = { ...overrides() };
  delete next[name];
  setOverridesSignal(next);
  applyAll();
  persist();
}

/** Back to the stock look: removes every override and the preset choice. */
export function resetAllColors() {
  setOverridesSignal({});
  setPresetSignal("Ola");
  applyAll();
  persist();
}

// ───────────── Export / import ─────────────

const FILE_TAG = "nova-colors";

export function exportColors(): string {
  return JSON.stringify({ app: FILE_TAG, version: 1, preset: preset(), colors: overrides() }, null, 2);
}

/** Returns how many colors were applied, or throws on an invalid file. */
export function importColors(text: string): number {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("الملف ليس JSON صالحًا");
  }
  if (!data || data.app !== FILE_TAG || typeof data.colors !== "object") {
    throw new Error("هذا الملف ليس ملف ألوان من Nova");
  }
  const clean = cleanOverrides(data.colors);
  setOverridesSignal(clean);
  setPresetSignal(isPreset(data.preset) ? data.preset : "Ola");
  applyAll();
  persist();
  return Object.keys(clean).length;
}
