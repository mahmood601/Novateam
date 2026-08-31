
// الألوان مأخوذة من theme1.xml (قالب Word الأصلي للفريق).
// عندنا 7 قيم accent فعلية بالقالب — منربطها مباشرة بدورة NOVA_COLOR_CYCLE.
export const NOVA_COLOR_HEX = {
  red: "#D00054", // lt2
  orange: "#FF9933", // accent1
  yellow: "#BF8F00", // accent4
  green: "#00B050", // accent3
  blue: "#3399FF", // accent2
  indigo: "#7A33CC", // بين accent2 و accent5 — ما في قيمة "indigo" صريحة بالقالب، هاي تقريبية
  violet: "#CC00FF", // accent5
};

export function novaColorHex(color: string): string {
  return NOVA_COLOR_HEX[color];
}
