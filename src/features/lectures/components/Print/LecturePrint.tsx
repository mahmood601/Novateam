// features/lectures/components/Print/LecturePrint.tsx

import { onMount, onCleanup, createSignal, Show } from "solid-js";
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
  const printExts = extensionsArr.slice(0, -1); // drop Markdown extension, not needed for print
  const editor = new Editor({
    extensions: [...printExts],
    content: content,
    contentType: "json",
  });

  let html = await editor.getHTML();

  editor.destroy();

  return html;
}

// ============================================
// جدول المحتويات من عناوين H1
// ============================================
function buildTocFromContent(html: string): { html: string; tocRows: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headings = Array.from(doc.querySelectorAll("h1"));

  const usedIds = new Set<string>();
  const rows: string[] = [];

  headings.forEach((h, i) => {
    const text = h.textContent?.trim() ?? "";
    if (!text) return;

    const baseSlug =
      text
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}-]/gu, "")
        .slice(0, 60) || `section-${i}`;

    let id = baseSlug;
    let n = 1;
    while (usedIds.has(id)) id = `${baseSlug}-${n++}`;
    usedIds.add(id);

    h.id = id;

    rows.push(`
      <tr>
        <td class="toc-page"><a class="toc-page-num" href="#${id}"></a></td>
        <td dir="rtl" class="toc-title"><a href="#${id}">${text}</a></td>
      </tr>
    `);
  });

  return { html: doc.body.innerHTML, tocRows: rows.join("") };
}

export default function LecturePrint(props: Props) {
  const [ready, setReady] = createSignal(false);
  let outputEl: HTMLDivElement | undefined;
  let naturalPageWidth = 0; // يُعاد قياسه بعد كل إعادة رندر لأن الـDOM بينبنى من جديد كامل

  // نص المحتوى (بعد توليد الـTOC) — ثابت، ما بيتغيّر بإعادة الرندر
  // لتحرير الوصف/اسم الدكتور (jsonToPrintHtml/buildTocFromContent
  // مكلفين شوي، مافي داعي نعيدهم كل مرة يعدّل فيها المستخدم حقل نصي).
  let cachedContentWithIds = "";
  let cachedTocRows = "";

  // القيم القابلة للتعديل من داخل المعاينة نفسها — بدون أي عمود
  // جديد بقاعدة البيانات: نفس فكرة contenteditable الموجودة أصلاً
  // لاسم الدكتور، موسّعة لصندوق الوصف كمان.
  const [doctorName, setDoctorName] = createSignal(props.doctorName);
  const [description, setDescription] = createSignal("");

  // ============================================
  // إعادة رندر كاملة عبر Paged.js
  // ============================================
  // هاي هي نقطة الإصلاح الفعلية: Paged.js بيسوي التصفيح (pagination)
  // مرة وحدة وقت ما تستدعي paged.preview() — أي تعديل لاحق بمحتوى
  // contenteditable ما بيخلي Paged.js "يحس" فيه أو يعيد حساب أبعاد
  // الصندوق/فواصل الصفحات (هو مش محرك layout حي مستمر، هو بيقص
  // المحتوى لصفحات ثابتة مرة وحدة وخلص). فبدل ما نعتمد إن الصندوق
  // "يتمدد" لوحده، منعيد تشغيل paged.preview() بالكامل بعد كل تعديل
  // (onblur) — أبطأ شوي من تعديل حي، لكنه الطريقة الوحيدة يلي بتضمن
  // إن حجم الصندوق وترقيم الصفحات يصير صحيح مع المحتوى الجديد فعلياً
  // (حتى لو صار طويل لدرجة يحتاج صفحة إضافية).
  async function renderDocument() {
    const fullHtml = buildDocument(
      props,
      cachedContentWithIds,
      cachedTocRows,
      doctorName(),
      description(),
    );

    const parsedDocument = new DOMParser().parseFromString(fullHtml, "text/html");
    const fragment = document.createDocumentFragment();
    while (parsedDocument.body.firstChild) {
      fragment.appendChild(parsedDocument.body.firstChild);
    }

    const { Previewer } = await import("pagedjs");
    await renderAllMermaidInContainer(fragment as unknown as HTMLElement);

    if (outputEl) outputEl.innerHTML = ""; // رندر نظيف قبل كل إعادة تصفيح

    const paged = new Previewer();
    const flow = await paged.preview(
      fragment,
      [new URL("/print/paged-print.css", import.meta.url).href],
      outputEl,
    );

    const pageCount = flow.total;
    outputEl?.querySelectorAll(".footer-pages-count").forEach((el) => {
      el.textContent = pageCount.toString();
    });

    attachEditableHandlers();

    setReady(true);
    naturalPageWidth = 0; // الـDOM اتبنى من جديد كامل، لازم نعيد القياس
    requestAnimationFrame(applyResponsiveScale);
  }

  // نربط onblur لكل حقل قابل للتعديل بعد كل رندر (العناصر نفسها
  // بتنعمل من جديد كل مرة، فلازم نعيد ربط الأحداث في كل مرة).
  function attachEditableHandlers() {
    const doctorEl = outputEl?.querySelector<HTMLElement>('[data-field="doctorName"]');
    const descEl = outputEl?.querySelector<HTMLElement>('[data-field="description"]');

    doctorEl?.addEventListener("blur", () => {
      const text = doctorEl.textContent?.trim() ?? "";
      if (text === doctorName()) return; // ما تغيّر شي، ما في داعي لإعادة رندر
      setDoctorName(text);
      renderDocument();
    });

    descEl?.addEventListener("blur", () => {
      const text = descEl.textContent?.trim() ?? "";
      if (text === description()) return;
      setDescription(text);
      renderDocument();
    });
  }

  // ============================================
  // تصغير الصفحة لتملأ الشاشات الصغيرة — بدون تكبيرها أبداً فوق حجم
  // A4 الحقيقي بالشاشات الكبيرة (max scale = 1). عبر JS مو CSS بس،
  // عشان نقدر نلغي الـtransform وقت الطباعة الفعلية (beforeprint).
  // ============================================
  function applyResponsiveScale() {
    if (!outputEl) return;
    const pagesEl = outputEl.querySelector<HTMLElement>(".pagedjs_pages");
    const pageEl = outputEl.querySelector<HTMLElement>(".pagedjs_page");
    if (!pagesEl || !pageEl) return;

    if (!naturalPageWidth) {
      naturalPageWidth = pageEl.getBoundingClientRect().width;
    }
    if (!naturalPageWidth) return;

    const available = outputEl.clientWidth;
    const scale = Math.min(1, available / naturalPageWidth);

    pagesEl.style.transformOrigin = "top center";
    pagesEl.style.transform = `scale(${scale})`;
    pagesEl.style.marginInline = "auto";

    const naturalHeight = pagesEl.scrollHeight;
    pagesEl.style.marginBottom = `${-(naturalHeight * (1 - scale))}px`;
  }

  function resetScaleForPrint() {
    const pagesEl = outputEl?.querySelector<HTMLElement>(".pagedjs_pages");
    if (!pagesEl) return;
    pagesEl.style.transform = "none";
    pagesEl.style.marginBottom = "0";
  }

  onMount(async () => {
    // 1. تحويل Markdown عبر نفس محرك Tiptap يلي بمحرر المراجعة
    const rawHtml = await jsonToPrintHtml(props.content);

    // 2. توليد جدول المحتويات + id لكل h1 — مرة وحدة بس، محفوظة
    //    بمتغيّرات الclosure فوق، ومو معاد حسابها بكل renderDocument
    const { html, tocRows } = buildTocFromContent(rawHtml);
    cachedContentWithIds = html;
    cachedTocRows = tocRows;

    await renderDocument();

    window.addEventListener("resize", applyResponsiveScale);
    window.addEventListener("beforeprint", resetScaleForPrint);
    window.addEventListener("afterprint", applyResponsiveScale);
  });

  onCleanup(() => {
    window.removeEventListener("resize", applyResponsiveScale);
    window.removeEventListener("beforeprint", resetScaleForPrint);
    window.removeEventListener("afterprint", applyResponsiveScale);
  });

  return (
    <div class="flex flex-1 flex-col h-fit overflow-scroll">
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

      <div ref={(el) => (outputEl = el)} class="flex-1 flex justify-center p-0 m-0" id="paged-output" />
    </div>
  );
}

function buildDocument(
  data: Props,
  contentHtml: string,
  tocRows: string,
  doctorName: string,
  description: string,
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
            <span class="footer-pages-count"></span>
          </div>
          <ul class="footer-info" dir="rtl">
            <li>${data.lectureNumber || ""}. ${data.lectureTitle}</li>
            <li>د. <span contenteditable="true" data-field="doctorName">${doctorName}</span></li>
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
          <div
            class="description"
            contenteditable="true"
            data-field="description"
            data-placeholder="اكتب وصفاً مختصراً للمحاضرة هنا..."
            dir="rtl"
          >${description}</div>
          <table>
            <tr>
              <th>الصفحة</th>
              <th>المضمون</th>
            </tr>
            ${tocRows}
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
        ${data.lectureNumber || ""} ${data.lectureTitle} - د. ${doctorName} – السنة ${data.year}ة الفصل ${data.semester}
      </div>
    </div>

    </div>

    <!-- المحتوى -->
    <article class="lecture-body text-black">
      ${contentHtml}
    </article>
  `;
}
