import mermaid from "mermaid";

// Mermaid ships its own "dark" theme (tuned node/text/edge colors for a
// dark canvas) alongside "neutral" for light — re-initializing with the
// right one before each render keeps generated diagrams readable instead
// of always drawing light-theme shapes regardless of the app's mode.
function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function initMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode() ? "dark" : "neutral",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
}

initMermaid();

export async function renderMermaidToSvg(code: string): Promise<string> {
  if (code.trim() === "") return "";

  initMermaid();
  const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
  try {
    const { svg } = await mermaid.render(id, code.trim());
    return svg;
  } catch (error) {
    return `<pre style="
            color: var(--destructive);
            background: color-mix(in srgb, var(--destructive) 12%, var(--card));
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            white-space: pre-wrap;
            overflow-x: auto;
          ">${code}</pre>`;
  }
}


export async function renderAllMermaidInContainer(container: HTMLElement) {
    const elements  = container.querySelectorAll('[data-type="mermaid"]');

    for (const element of elements) {
        const code = element.getAttribute("data-content") || element.textContent ||"";
   
        if(code.trim() === "") continue;

        const svg = await renderMermaidToSvg(code);
        element.innerHTML = svg;
        element.classList.add("mermaid-rendered");
    }
}