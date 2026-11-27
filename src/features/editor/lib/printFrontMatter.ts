// Cover page + table of contents, shared by the print page (LecturePrint.tsx)
// and the editor's A4 preview (a4Preview.ts) so both look exactly the same.
import { escapeHtml } from "@/features/shared/lib/sanitizeHtml";

export interface CoverData {
  subjectName: string;
  subjectId: string;
  lectureTitle: string;
  year: string;
  semester: string;
  lectureNumber?: string | number;
}

// ============================================
// جدول المحتويات من عناوين H1
// ============================================
export function buildTocFromContent(html: string): { html: string; tocRows: string } {
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
        <td class="toc-page"><a class="toc-page-num" href="#${escapeHtml(id)}"></a></td>
        <td dir="rtl" class="toc-title"><a href="#${escapeHtml(id)}">${escapeHtml(text)}</a></td>
      </tr>
    `);
  });

  return { html: doc.body.innerHTML, tocRows: rows.join("") };
}

/** Cover + TOC sections as one HTML string (same markup the print page used). */
export function buildFrontMatterHtml(
  data: CoverData,
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
            <div class="team-box">MEDICAL • TEAM</div>
          </div>
          <img class="tartous-logo" src="/print/image3.png" alt="" />
        </div>
      </div>

      <div>
        <img src="/subjectsIcons/${escapeHtml(encodeURIComponent(data.subjectId))}.webp" class="cover-circle"/>
        <div class="cover-lecture-title">${escapeHtml(data.subjectName)}</div>
      </div>

      <div class="cover-footer">
        <div class="footer-box">
          <div class="footer-pages-number">
            <span class="footer-pages-text">عدد الصفحات</span>
            <span class="footer-pages-count"></span>
          </div>
          <ul class="footer-info" dir="rtl">
            <li>${escapeHtml(data.lectureNumber || "")}. ${escapeHtml(data.lectureTitle)}</li>
            <li>د. <span contenteditable="true" data-field="doctorName">${escapeHtml(doctorName)}</span></li>
            <li>السنة ${escapeHtml(data.year)}ة – الفصل ${escapeHtml(data.semester)}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- جدول المحتويات -->
    <section class="toc">
      <div class="container">
        <div class="table-header">${escapeHtml(data.lectureTitle)}</div>
        <div class="toc-box">
          <div
            class="description"
            contenteditable="true"
            data-field="description"
            data-placeholder="اكتب وصفاً مختصراً للمحاضرة هنا..."
            dir="rtl"
          >${escapeHtml(description)}</div>
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
  `;
}
