// Curated swatch palette for the format sheet's color/background/highlight
// pickers — a neutral grayscale row plus a standard color row, the same
// shape editors like Google Docs use so the grid stays small enough for a
// single mobile screen while still covering the common cases.

export type ColorSwatch = { value: string; label: string };

export const GRAYSCALE_SWATCHES: ColorSwatch[] = [
  { value: "#000000", label: "أسود" },
  { value: "#434343", label: "رمادي غامق جدًا" },
  { value: "#666666", label: "رمادي غامق" },
  { value: "#999999", label: "رمادي" },
  { value: "#B7B7B7", label: "رمادي فاتح" },
  { value: "#D9D9D9", label: "رمادي فاتح جدًا" },
  { value: "#EFEFEF", label: "رمادي شبه أبيض" },
  { value: "#FFFFFF", label: "أبيض" },
];

export const STANDARD_SWATCHES: ColorSwatch[] = [
  { value: "#980000", label: "عنابي" },
  { value: "#FF0000", label: "أحمر" },
  { value: "#FF9900", label: "برتقالي" },
  { value: "#FFFF00", label: "أصفر" },
  { value: "#00A650", label: "أخضر" },
  { value: "#00FFFF", label: "سماوي" },
  { value: "#4A86E8", label: "أزرق فاتح" },
  { value: "#0000FF", label: "أزرق" },
  { value: "#9900FF", label: "بنفسجي" },
  { value: "#FF00FF", label: "وردي فاقع" },
];

export const LIGHT_SWATCHES: ColorSwatch[] = [
  { value: "#E6B8AF", label: "عنابي فاتح" },
  { value: "#F4CCCC", label: "أحمر فاتح" },
  { value: "#FCE5CD", label: "برتقالي فاتح" },
  { value: "#FFF2CC", label: "أصفر فاتح" },
  { value: "#D9EAD3", label: "أخضر فاتح" },
  { value: "#D0E0E3", label: "سماوي فاتح" },
  { value: "#C9DAF8", label: "أزرق فاتح جدًا" },
  { value: "#CFE2F3", label: "أزرق سماوي فاتح" },
  { value: "#D9D2E9", label: "بنفسجي فاتح" },
  { value: "#EAD1DC", label: "وردي فاتح" },
];

export const FORMAT_COLOR_GROUPS: ColorSwatch[][] = [
  GRAYSCALE_SWATCHES,
  STANDARD_SWATCHES,
  LIGHT_SWATCHES,
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
