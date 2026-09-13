import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "inherit",
});

export async function renderMermaidToSvg(code: string): Promise<string> {
  if (code.trim() === "") return "";

  const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
  try {
    const { svg } = await mermaid.render(id, code.trim());
    return svg;
  } catch (error) {
    return `<pre style="
            color: #ef4444;
            background: #fef2f2;
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