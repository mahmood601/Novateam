// features/editor/lib/cssStyleString.ts
//
// A block's full styling lives in ONE place: its `style` attribute (a raw
// inline CSS string). These helpers let the preset panel fields (bg
// color, padding, flex-direction, ...) read/write individual properties
// out of that single string without a second, parallel state that could
// drift out of sync with it.

export function parseStyleString(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!css) return out;

  for (const decl of css.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (prop && value) out[prop] = value;
  }
  return out;
}

export function stringifyStyle(props: Record<string, string>): string {
  return Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ");
}

// Returns a new style string with one property set (or removed, if value
// is empty/undefined).
export function withStyleProp(
  css: string,
  prop: string,
  value: string | undefined,
): string {
  const obj = parseStyleString(css);
  if (value) obj[prop] = value;
  else delete obj[prop];
  return stringifyStyle(obj);
}
