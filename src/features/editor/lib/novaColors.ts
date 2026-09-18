// The 7 real colors from theme1.xml (the team's actual Word template).
// No approximated/invented colors — every value is a real accent used
// in the original design. Keys match NovaColor in ../types/novaAst.ts.

import type { NovaColor } from "../types/novaAst";

export const NOVA_COLOR_HEX: Record<NovaColor, string> = {
  rose: "#D00054",   // lt2
  orange: "#FF9933", // accent1
  blue: "#3399FF",   // accent2
  green: "#00B050",  // accent3
  yellow: "#BF8F00", // accent4
  purple: "#CC00FF", // accent5
  pink: "#FF3BFF",   // accent6
};

export function novaColorHex(color: NovaColor): string {
  return NOVA_COLOR_HEX[color];
}