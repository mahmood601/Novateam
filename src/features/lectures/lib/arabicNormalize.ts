// ============================================
// Arabic-aware text normalization for search
// ============================================
// Used both when indexing lecture text and when the user types a query,
// so that spelling variants that are effectively "the same word" to a
// human reader (different alef forms, taa marbuta vs haa, optional
// diacritics/tatweel) match each other. Without this, a search for
// "الاستقلاب" would miss "الإستقلاب" and vice versa.
//
// IMPORTANT: this is for *matching* only. Never use the normalized string
// for display — always keep the original text for rendering/snippets.

const DIACRITICS_AND_TATWEEL = /[\u064B-\u0652\u0670\u0640]/g;
const ALEF_VARIANTS = /[إأآٱا]/g;
const YEH_VARIANTS = /ى/g;
const TAA_MARBUTA = /ة/g;

export function normalizeArabic(text: string): string {
  return text
    .replace(DIACRITICS_AND_TATWEEL, "")
    .replace(ALEF_VARIANTS, "ا")
    .replace(YEH_VARIANTS, "ي")
    .replace(TAA_MARBUTA, "ه")
    .toLowerCase()
    .trim();
}
