// PagedExport.tsx
// Read-only export view: takes a lecture's stored Tiptap JSON, renders
// it as static HTML (via Tiptap's generateHTML, NOT the live editor),
// paginates it with Paged.js, and lets the user print/save as PDF.
//
// Route suggestion: /lectures/:id/export — a light route, not part of
// the main editor bundle or the PWA's core service-worker cache set.

import { onMount, createSignal, Show } from "solid-js";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { InfoBox } from "./extensions/InfoBox";
import { ColorTable } from "./extensions/ColorTable";
import { NovaHeading } from "./extensions/NovaHeading";
import type { JSONContent } from "./TiptapEditor";
import "./paged-styles.css";
import "./nova-template-tokens.css";

interface PagedExportProps {
  content: JSONContent;
  title: string;
  courseLabel: string; // e.g. "٤. كلية - د. ربى غانم - السنة ٢ الفصل ٢"
}

export default function PagedExport(props: PagedExportProps) {
  const [ready, setReady] = createSignal(false);
  let printAreaEl: HTMLDivElement | undefined;

  onMount(async () => {
    // 1. Convert the stored JSON to plain HTML using the SAME extension
    //    set as the editor, so InfoBox/ColorTable render identically.
    const html = generateHTML(props.content, [StarterKit, InfoBox, ColorTable, NovaHeading]);

    if (printAreaEl) {
      printAreaEl.innerHTML = html;
    }

    // 2. Load Paged.js from CDN only on this route (keeps it out of the
    //    main app bundle — it's ~100KB and only needed here).
    await loadPagedJs();

    // 3. Paged.js auto-runs on load by default; since we're injecting
    //    content dynamically we trigger it manually via the Previewer API.
    // @ts-ignore — Paged is attached to window by the script above
    const paged = new window.Paged.Previewer();
    await paged.preview(
      document.querySelector("#pgd-source")!.innerHTML,
      [], // stylesheets already linked in <head>, see index.html note below
      document.querySelector("#pgd-output")!
    );

    setReady(true);
  });

  return (
    <div dir="rtl">
      {/* Hidden source — Paged.js reads this once, then we discard it */}
      <div id="pgd-source" style={{ display: "none" }}>
        <div class="pgd-cover">
          <h1>{props.title}</h1>
        </div>

        <div class="pgd-page-header">
          <div class="pgd-page-header-inner">
            <span>{props.title}</span>
          </div>
        </div>

        <div ref={(el) => (printAreaEl = el)} />
      </div>

      {/* Paged.js renders the real paginated pages in here */}
      <div id="pgd-output" />

      <Show when={ready()}>
        <button
          onClick={() => window.print()}
          style={{ position: "fixed", top: "12px", left: "12px" }}
        >
          تصدير PDF
        </button>
      </Show>
    </div>
  );
}

function loadPagedJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Paged) return resolve();
    const script = document.createElement("script");
    script.src = "https://unpkg.com/pagedjs/dist/paged.polyfill.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
