// Diagrams are rendered with Pele (https://github.com/obsidianmd/pele):
// zero-dependency, Mermaid-syntax -> themeable SVG, synchronous render.
// The file name/exports are kept so every caller (editor, A4 preview,
// print, lecture view) keeps working unchanged.
//
// Colors: Pele paints charts with --pele-series-1..8. We feed those from
// the Nova heading cycle (rose, orange, blue, green, yellow, purple, pink)
// so diagrams use exactly the same colors as the section headings.
import { render } from "pele";
import { NOVA_COLOR_CYCLE, type NovaColor } from "../types/novaAst";
import { NOVA_COLOR_HEX } from "./novaColors";

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

/** Inline CSS variables for one diagram. `accent` = color of the section it sits in. */
function peleTheme(accent?: NovaColor | null, forPrint = false): string {
  const dark = isDarkMode();
  const vars: Record<string, string> = {
    "--pele-bg": "transparent",
    "--pele-fg": dark ? "#f1f5f9" : "#0f172a",
    "--pele-muted": dark ? "#94a3b8" : "#64748b",
    "--pele-line": dark ? "#94a3b8" : "#475569",
    "--pele-surface": dark ? "#1e293b" : "#ffffff",
    "--pele-surface-alt": dark ? "#334155" : "#f1f5f9",
    "--pele-border": dark ? "#475569" : "#cbd5e1",
    "--pele-accent": NOVA_COLOR_HEX[accent ?? "blue"],
    // Keep diagram text metrics stable regardless of user-selected app font.
    "--pele-font": '"Hacen Tunisia", "OoredooArabic-Heavy", "NovaHeading", "Readex Pro Variable", sans-serif',
    "--pele-radius": "8px",
  };
  // Series 1-7 = the 7 Nova heading colors, in heading order.
  // Series 8 wraps back to the first color.
  for (let i = 0; i < 8; i++) {
    vars[`--pele-series-${i + 1}`] =
      NOVA_COLOR_HEX[NOVA_COLOR_CYCLE[i % NOVA_COLOR_CYCLE.length]];
  }
  if (forPrint) vars["--pele-bg"] = "#ffffff";
  return Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
}

/** Section color = data-color of the closest previous level-1 heading. */
export function sectionColorOf(el: Element): NovaColor | null {
  let node: Element | null = el;
  while (node) {
    let sib = node.previousElementSibling;
    while (sib) {
      if (sib.tagName === "H1" && sib.getAttribute("data-color")) {
        return sib.getAttribute("data-color") as NovaColor;
      }
      sib = sib.previousElementSibling;
    }
    node = node.parentElement;
  }
  return null;
}

export async function renderMermaidToSvg(
  code: string,
  forPrint = false,
  accent?: NovaColor | null,
): Promise<string> {
  const src = code.trim();
  if (src === "") return "";

  try {
    const svg = render(src);
    return `<div class="pele${forPrint ? " pele-print" : ""}" style="${peleTheme(accent, forPrint)}">${svg}</div>`;
  } catch {
    return `<pre style="
            color: var(--destructive);
            background: color-mix(in srgb, var(--destructive) 12%, var(--card));
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            white-space: pre-wrap;
            overflow-x: auto;
          ">${escapeHtml(code)}</pre>`;
  }
}

export async function renderAllMermaidInContainer(
  container: HTMLElement,
  forPrint = false,
) {
  const elements = container.querySelectorAll('[data-type="mermaid"]');

  for (const element of elements) {
    const code =
      element.getAttribute("data-content") || element.textContent || "";
    if (code.trim() === "") continue;

    element.innerHTML = await renderMermaidToSvg(
      code,
      forPrint,
      sectionColorOf(element),
    );
    element.classList.add("mermaid-rendered");
  }
}
