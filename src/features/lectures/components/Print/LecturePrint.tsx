// features/lectures/components/Print/LecturePrint.tsx

import { onMount, createSignal, Show } from "solid-js";
import { Editor, JSONContent } from "@tiptap/core";

import { renderAllMermaidInContainer } from "@/features/editor/lib/mermaid-renderer";
import { extensionsArr } from "@/features/editor/tiptap/extensions/extensionsArr";

interface Props {
  subjectName: string;
  subjectId: string;
  lectureTitle: string;
  doctorName: string;
  year: string;
  semester: string;
  lectureNumber?: string;
  content: JSONContent | null;
}

// Same source of truth as the review editor (TiptapReviewEditor.tsx):
// this MUST use the exact same extension set, or print output can
// silently diverge from what the team actually reviewed.
async function jsonToPrintHtml(content: JSONContent | null): Promise<string> {
  extensionsArr.pop(); // remove Markdown extension, not needed for print
  const printExts = extensionsArr;
  const editor = new Editor({
    extensions: [...printExts],
    content: content,
    contentType: "json",
  });

  let html = await editor.getHTML();

  editor.destroy();

  return html;
}

export default function LecturePrint(props: Props) {
  const [ready, setReady] = createSignal(false);
  let outputEl: HTMLDivElement | undefined;

  onMount(async () => {
    // 1. تحويل Markdown عبر نفس محرك Tiptap يلي بمحرر المراجعة
    //    (بدل marked — عشان يطلع data-color و classes نوفا صح)
    const rawHtml = await jsonToPrintHtml(props.content);

    // commented because it case mermaid to not render
    // const safeHtml = DOMPurify.sanitize(rawHtml);
    // console.log(safeHtml);

    // 2. بناء المستند
    const fullHtml = buildDocument(props, rawHtml);

    const parsedDocument = new DOMParser().parseFromString(
      fullHtml,
      "text/html",
    );
    const fragment = document.createDocumentFragment();

    while (parsedDocument.body.firstChild) {
      fragment.appendChild(parsedDocument.body.firstChild);
    }

    // 3. تحميل Paged.js
    await loadPagedJs();

    await renderAllMermaidInContainer(fragment as unknown as HTMLElement);

    // 4. تشغيل Paged.js
    // @ts-ignore
    const paged = new window.Paged.Previewer();
    const flow = await paged.preview(
      fragment,
      [new URL("/print/paged-print.css", import.meta.url).href],
      outputEl,
    );

    const pageCount = flow.total;
    const pageCountElements = outputEl?.querySelectorAll(".footer-pages-count");
    pageCountElements?.forEach((el) => {
      el.textContent = pageCount.toString();
    });

    setReady(true);
  });

  return (
    <div>
      <Show when={ready()}>
        <div class="fixed top-4 left-4 z-50 flex gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            class="rounded-xl px-5 py-2.5 font-bold shadow-lg transition hover:opacity-90"
            style="background-color: var(--color-lecture-cycle); color: var(--color-lecture-cycle-foreground);"
          >
            طباعة / حفظ PDF
          </button>
          <button
            onClick={() => window.history.back()}
            class="rounded-xl bg-slate-200 px-5 py-2.5 font-bold"
          >
            رجوع
          </button>
        </div>
      </Show>

      <div ref={(el) => (outputEl = el)} id="paged-output" />
    </div>
  );
}

function buildDocument(data: Props, contentHtml: string) {
  return `
    <!-- الغلاف -->
    <section class="cover">
      <div class="cover-header">
        <div class="header-box">
          <div class="logos-box">
            <img class="nova-logo" src="/print/image1.png" alt="" />
            <div class="team-box">MEDICAL . TEAM</div>
          </div>
          <img class="tartous-logo" src="/print/image3.png" alt="" />
        </div>
      </div>

      <div>
        <img src="/subjectsIcons/${data.subjectId}.webp" class="cover-circle"/>
        <div class="cover-lecture-title">${data.subjectName}</div>
      </div>

      <div class="cover-footer">
        <div class="footer-box">
          <div class="footer-pages-number">
            <span class="footer-pages-text">عدد الصفحات</span>
            <span class="footer-pages-count"></span>
          </div>
          <ul class="footer-info" dir="rtl">
            <li>${data.lectureNumber || ""}. ${data.lectureTitle}</li>
            <li contenteditable="true">د. ${data.doctorName}</li>
            <li>السنة ${data.year}ة – الفصل ${data.semester}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- جدول المحتويات -->
    <section class="toc">
      <div class="container">
        <div class="table-header">${data.lectureTitle}</div>
        <div class="toc-box">
          <div class="description" dir="rtl">mms dm,s dm,s dm, sm, v,mz ,</div>
          <table>
            <tr>
              <th>الصفحة</th>
              <th>المضمون</th>
            </tr>
          </table>
        </div>
      </div>
    </section>

    <!-- Running Header & Footer -->
    <div class="running-header">
    <div class="header-flex-content">
          <img src="/print/image1.png" alt="" />
      <div class="title-bar" dir="rtl">${data.subjectName}</div>
    </div>
    </div>

    <div class="running-footer">
        <div class="footer-flex-content">
      <div class="number"></div>
      <div class="info-bar" dir="rtl">
        ${data.lectureNumber || ""} ${data.lectureTitle} - د. ${data.doctorName} – السنة ${data.year}ة الفصل ${data.semester}
      </div>
    </div>

    </div>

    <!-- المحتوى -->
    <article class="lecture-body text-black">
      ${contentHtml}
    </article>
  `;
}

function loadPagedJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Paged) return resolve();

    (window as any).PagedConfig = {
      ...(window as any).PagedConfig,
      auto: false,
    };

    const script = document.createElement("script");
    script.src = "https://unpkg.com/pagedjs/dist/paged.polyfill.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
