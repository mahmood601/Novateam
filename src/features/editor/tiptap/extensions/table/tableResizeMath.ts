// Pure geometry for touch column resizing — no DOM, no ProseMirror, so it can
// be unit-tested on its own. All "border" numbers are LOGICAL: border `b` sits
// between column b-1 and column b (column 0 is the first column in reading
// order, i.e. the RIGHT-most one in an RTL table).

export type BorderHit = { border: number; x: number };

/**
 * Which interior column border (if any) is under the finger?
 *
 * Works from the touched cell's on-screen rectangle, so it never has to care
 * about left/right: the cell's inline-start edge is the border BEFORE its first
 * column, its inline-end edge is the border AFTER its last column. In RTL
 * those are the right and left edges respectively.
 *
 * The outer edges of the table (border 0 and border `colCount`) are never
 * returned: the table always fills its wrapper, so there is nothing to drag.
 */
export function pickBorder(a: {
  touchX: number;
  rectLeft: number;
  rectRight: number;
  firstCol: number;
  colspan: number;
  colCount: number;
  rtl: boolean;
  zone: number;
}): BorderHit | null {
  const width = a.rectRight - a.rectLeft;
  // Narrow cells keep a middle third that is NOT a grab zone, so they stay tappable.
  const zone = Math.min(a.zone, width / 3);
  const startX = a.rtl ? a.rectRight : a.rectLeft;
  const endX = a.rtl ? a.rectLeft : a.rectRight;

  const hits = [
    { border: a.firstCol, x: startX },
    { border: a.firstCol + a.colspan, x: endX },
  ]
    .filter((c) => c.border >= 1 && c.border <= a.colCount - 1)
    .filter((c) => Math.abs(a.touchX - c.x) <= zone)
    .sort((p, q) => Math.abs(a.touchX - p.x) - Math.abs(a.touchX - q.x));

  return hits[0] ?? null;
}

/**
 * MS Word's default column drag: the border moves, the column on one side
 * gains exactly what the column on the other side loses, and the table's total
 * width never changes. `inlineDelta` > 0 grows column `border - 1`.
 * A column already narrower than `minPx` is never forced wider, only prevented
 * from shrinking further.
 */
export function resizeBorder(
  widths: number[],
  border: number,
  inlineDelta: number,
  minPx: number,
): { widths: number[]; delta: number } {
  const l = border - 1;
  const r = border;
  const minL = Math.min(minPx, widths[l]);
  const minR = Math.min(minPx, widths[r]);
  const delta = Math.max(
    minL - widths[l],
    Math.min(widths[r] - minR, inlineDelta),
  );
  const out = widths.slice();
  out[l] += delta;
  out[r] -= delta;
  return { widths: out, delta };
}

/** Finger movement (screen px, +right) → inline-axis delta in layout px. */
export function toInlineDelta(dxScreen: number, scale: number, rtl: boolean) {
  const dx = dxScreen / (scale || 1);
  return rtl ? -dx : dx;
}

/** Inline-axis delta → how far the border moved on screen (+right). */
export function toScreenShift(delta: number, scale: number, rtl: boolean) {
  return (rtl ? -delta : delta) * (scale || 1);
}
