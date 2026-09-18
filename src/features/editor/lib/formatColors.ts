// Curated swatch palette for the format sheet's color/background/highlight
// pickers — a neutral grayscale row plus a standard color row, the same
// shape editors like Google Docs use so the grid stays small enough for a
// single mobile screen while still covering the common cases.

export type ColorSwatch = { value: string; label: string };

export const ROSE_SWATCHES: ColorSwatch[] = [
  { value: "#d00054", label: "main" },
  { value: "#a60043", label: "80% color / 20% black" },
  { value: "#d93376", label: "80% color / 20% white" },
  { value: "#f1b3cc", label: "30% color / 70% white" },
  { value: "#fbebf1", label: "8% color / 92% white" },
  { value: "#fcf0f5", label: " 6% color / 94% white " },

];

export const ORANGE_SWATCHES: ColorSwatch[] = [
  { value: "#ff9933", label: "main" },
  { value: "#cc7a29", label: "80% color / 20% black" },
  { value: "#ffad5c", label: "80% color / 20% white" },
  { value: "#ffe0c2", label: "30% color / 70% white" },
  { value: "#fff7ef", label: "8% color / 92% white" },
  { value: "#fff9f3", label: " 6% color / 94% white " },

];
export const BLUE_SWATCHES: ColorSwatch[] = [
  { value: "#3399ff", label: "main" },
  { value: "#297acc", label: "80% color / 20% black" },
  { value: "#5cadff", label: "80% color / 20% white" },
  { value: "#c2e0ff", label: "30% color / 70% white" },
  { value: "#eff7ff", label: "8% color / 92% white" },
  { value: "#f3f9ff", label: " 6% color / 94% white " },

];
export const GREEN_SWATCHES: ColorSwatch[] = [
  { value: "#00b050", label: "main" },
  { value: "#008d40", label: "80% color / 20% black" },
  { value: "#33c073", label: "80% color / 20% white" },
  { value: "#b3e7cb", label: "30% color / 70% white" },
  { value: "#ebf9f1", label: "8% color / 92% white" },
  { value: "#f0faf5", label: " 6% color / 94% white " },

];
export const YELLOW_SWATCHES: ColorSwatch[] = [
  { value: "#bf8f00", label: "main" },
  { value: "#997200", label: "80% color / 20% black" },
  { value: "#cca533", label: "80% color / 20% white" },
  { value: "#ecddb3", label: "30% color / 70% white" },
  { value: "#faf6eb", label: "8% color / 92% white" },
  { value: "#fbf8f0", label: " 6% color / 94% white " },

];
export const PURPLE_SWATCHES: ColorSwatch[] = [
  { value: "#cc00ff", label: "main" },
  { value: "#a300cc", label: "80% color / 20% black" },
  { value: "#d633ff", label: "80% color / 20% white" },
  { value: "#f0b3ff", label: "30% color / 70% white" },
  { value: "#fbebff", label: "8% color / 92% white" },
  { value: "#fcf0ff", label: " 6% color / 94% white " },

];
export const PINK_SWATCHES: ColorSwatch[] = [
  { value: "#ff3bff", label: "main" },
  { value: "#cc2fcc", label: "80% color / 20% black" },
  { value: "#ff62ff", label: "80% color / 20% white" },
  { value: "#ffc4ff", label: "30% color / 70% white" },
  { value: "#ffefff", label: "8% color / 92% white" },
  { value: "#fff3ff", label: " 6% color / 94% white " },

];

export const FORMAT_COLOR_GROUPS: ColorSwatch[][] = [
  ROSE_SWATCHES,
  ORANGE_SWATCHES,
  BLUE_SWATCHES,
  GREEN_SWATCHES,
  YELLOW_SWATCHES,
  PURPLE_SWATCHES,
  PINK_SWATCHES
];

// Web-safe / already-bundled font choices. "Default" leaves the app's
// normal typeface (Readex Pro Variable) in place by unsetting the mark;
// NovaHeading and OoredooArabic-Heavy are the two display faces the app
// already loads for print/headings (see src/styles/fonts.css).
export type FontChoice = { value: string | null; label: string; previewFont: string };

export const FONT_FAMILY_CHOICES: FontChoice[] = [
  { value: null, label: "افتراضي", previewFont: "'Readex Pro Variable', sans-serif" },
  { value: "'NovaHeading', sans-serif", label: "Nova Heading", previewFont: "'NovaHeading', sans-serif" },
  { value: "'OoredooArabic-Heavy', sans-serif", label: "Ooredoo Arabic", previewFont: "'OoredooArabic-Heavy', sans-serif" },
  { value: "Arial, sans-serif", label: "Arial", previewFont: "Arial, sans-serif" },
  { value: "Georgia, serif", label: "Georgia", previewFont: "Georgia, serif" },
  { value: "'Courier New', monospace", label: "Courier New", previewFont: "'Courier New', monospace" },
];

export const DEFAULT_FONT_SIZE = 16;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 96;
