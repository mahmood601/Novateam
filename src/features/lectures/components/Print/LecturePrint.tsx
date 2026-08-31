// features/lectures/components/Print/LecturePrint.tsx

import { onMount, createSignal, Show } from "solid-js";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface Props {
  subjectName: string;
  subjectId: string;
  lectureTitle: string;
  doctorName: string;
  year: string;
  semester: string;
  lectureNumber?: string;
  content: string; // Markdown
}

export default function LecturePrint(props: Props) {
  const [ready, setReady] = createSignal(false);
  let outputEl: HTMLDivElement | undefined;

  onMount(async () => {
    // 1. تحويل Markdown
    const rawHtml = await marked.parse(props.content || "");
    const safeHtml = DOMPurify.sanitize(rawHtml);

    // 2. بناء المستند
    const fullHtml = buildDocument(props, safeHtml);
    const parsedDocument = new DOMParser().parseFromString(fullHtml, "text/html");
    const fragment = document.createDocumentFragment();

    while (parsedDocument.body.firstChild) {
      fragment.appendChild(parsedDocument.body.firstChild);
    }

    // 3. تحميل Paged.js
    await loadPagedJs();

    // 4. تشغيل Paged.js
    // @ts-ignore
    const paged = new window.Paged.Previewer();
    await paged.preview(
      fragment,
      [new URL("/print/paged-print.css", import.meta.url).href],
      outputEl
    );

    setReady(true);
  });

  return (
    <div>
      <Show when={ready()}>
        <div class="fixed top-4 left-4 z-50 flex gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            class="rounded-xl bg-main px-5 py-2.5 font-bold text-white shadow-lg"
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

function buildDocument(
  data: Props,
  contentHtml: string
) {
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
            <span class="footer-pages-count">—</span>
          </div>
          <ul class="footer-info" dir="rtl">
            <li>${data.lectureNumber || ""} ${data.lectureTitle}</li>
            <li>د. ${data.doctorName}</li>
            <li>السنة ${data.year} – الفصل ${data.semester}</li>
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
        ${data.lectureNumber || ""} ${data.lectureTitle} - د. ${data.doctorName} – السنة ${data.year} الفصل ${data.semester}
      </div>
    </div>

    </div>

    <!-- المحتوى -->
    <article class="lecture-body">
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

