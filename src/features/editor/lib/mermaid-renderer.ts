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

async function initMermaid(forPrint = false): Promise<Mermaid> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode() ? "dark" : "redux-color",
    htmlLabels: true,
    fontFamily: "inherit",
    securityLevel: "loose",
    // Print: a narrower diagram gets scaled down less to fit the A4 width,
    // so its text stays readable on paper.
    flowchart: forPrint
      ? {
          useMaxWidth: true,
          wrappingWidth: 140,
          nodeSpacing: 30,
          rankSpacing: 40,
          padding: 8,
        }
      : {
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

export async function renderMermaidToSvg(
  code: string,
  forPrint = false,
): Promise<string> {
  if (code.trim() === "") return "";

  // Wide left-to-right charts get shrunk the most on paper; top-down uses
  // the page height instead.
  const src = forPrint
    ? code.trim().replace(/^(\s*(?:flowchart|graph))\s+(LR|RL)\b/m, "$1 TD")
    : code.trim();

  const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
  try {
    const mermaid = await initMermaid(forPrint);
    const { svg } = await mermaid.render(id, src);
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

export async function renderAllMermaidInContainer(
  container: HTMLElement,
  forPrint = false,
) {
  const elements = container.querySelectorAll('[data-type="mermaid"]');

  for (const element of elements) {
    const code =
      element.getAttribute("data-content") || element.textContent || "";

    if (code.trim() === "") continue;

    const svg = await renderMermaidToSvg(code, forPrint);
    element.innerHTML = svg;
    element.classList.add("mermaid-rendered");
  }
}
