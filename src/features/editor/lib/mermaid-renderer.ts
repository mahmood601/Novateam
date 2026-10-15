// mermaid is ~600 kB+ of JS. It used to be imported at the top of this file,
// and `initMermaid()` ran at import time — so anything that imported this
// module paid for mermaid immediately. Now it's fetched (once) only when a
// diagram actually has to be rendered. Offline still works: the chunk is in
// the service worker's precache.
type Mermaid = (typeof import("mermaid"))["default"];

let mermaidPromise: Promise<Mermaid> | null = null;

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((m) => m.default);
  return mermaidPromise;
}

// Mermaid ships its own "dark" theme (tuned node/text/edge colors for a
// dark canvas) alongside "neutral" for light — re-initializing with the
// right one before each render keeps generated diagrams readable instead
// of always drawing light-theme shapes regardless of the app's mode.
function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

async function initMermaid(): Promise<Mermaid> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode() ? "dark" : "redux-color",
    htmlLabels: true,
    fontFamily: "inherit",
    securityLevel: "loose",
    flowchart: {
      useMaxWidth: true,
    },
    themeCSS: `
    /* توسيط أفقي وعمودي للنصوص داخل كل العقد */
    .node foreignObject div,
    .node .label,
    .label {
      text-align: center !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 13pt !important;
      width: 100% !important;
    }

    /* للعقد التي تستخدم SVG text بدل HTML */
    .node text,
    .node tspan {
      text-anchor: middle !important;
      dominant-baseline: central !important;
    }

    /* تحسين إضافي للنصوص متعددة الأسطر */
    .node foreignObject {
      overflow: visible;
}
      `,
  });

  return mermaid;
}

export async function renderMermaidToSvg(code: string): Promise<string> {
  if (code.trim() === "") return "";

  const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
  try {
    const mermaid = await initMermaid();
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
  const elements = container.querySelectorAll('[data-type="mermaid"]');

  for (const element of elements) {
    const code =
      element.getAttribute("data-content") || element.textContent || "";

    if (code.trim() === "") continue;

    const svg = await renderMermaidToSvg(code);
    element.innerHTML = svg;
    element.classList.add("mermaid-rendered");
  }
}
