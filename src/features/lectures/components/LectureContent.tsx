import { createEffect, createMemo, createResource, Show } from "solid-js";
import type { JSONContent } from "@tiptap/core";
import { getLectureContentCached } from "../services/local/indexeddb/lectures";
import {
  jsonToLectureHtml,
  annotateHeadingsWithIds,
  type LectureTocEntry,
} from "../lib/lectureContentHtml";
import { cacheLectureImages } from "../services/imageCache";
import { highlightInLecture } from "../lib/lectureHighlight";
import LectureRender from "../../shared/components/LectureRender/LectureRender";
import { renderAllMermaidInContainer } from "@/features/editor/lib/mermaid-renderer";

interface Props {
  subjectId: string;
  seasonId: number;
  onToc?: (toc: LectureTocEntry[]) => void;
  // Set when arriving from a search result — the exact text to jump to
  // and highlight once the content is rendered. Left undefined for a
  // normal (non-search) visit.
  highlightQuery?: string;
}

export default function LectureContent(props: Props) {
  let containerEl: HTMLDivElement | undefined;

  // المصدر التفاعلي: [subjectId, seasonId] — أي تغيير فيهم (تبديل محاضرة
  // من الـSidebar بدون remount كامل للصفحة) بيعيد الجلب تلقائياً.
  const [record, { mutate }] = createResource(
    () => [props.subjectId, props.seasonId] as const,
    ([subjectId, seasonId]) =>
      getLectureContentCached(subjectId, seasonId, (fresh) => {
        // تحديث الخلفية (stale-while-revalidate): يدفع القيمة الجديدة
        // مباشرة لكاش الـresource بدل ما تضيع كانت.
        mutate(fresh);
      }),
  );

  const notFound = () => !record.loading && !record.error && !record();

  const html = createMemo(() =>
    jsonToLectureHtml((record()?.content as JSONContent | null) ?? null),
  );

  // حقن الـHTML يدوياً (بدل خاصية innerHTML التفاعلية بسولد) عشان نضمن إن
  // توليد id العناوين وكاش الصور يصير فوراً بعد الحقن الفعلي، بدون سباق
  // توقيت بين effect منفصل جوا LectureRender وeffect هون.
  createEffect(() => {
    const rendered = html();
    if (!containerEl) return;

    containerEl.innerHTML = rendered;

    const toc = annotateHeadingsWithIds(containerEl);
    props.onToc?.(toc);

    void cacheLectureImages(containerEl);

    // Jump to the search term, once, after this render. Re-runs if the
    // query itself changes (e.g. user taps a different result for the
    // same lecture without navigating away), but not on every unrelated
    // re-render since `highlightQuery` is read at the end of the effect
    // via the same reactive scope.
    const query = props.highlightQuery;
    if (query && containerEl) {
      // Wait a frame so layout has settled (images etc. can shift height).
      requestAnimationFrame(() => {
        if (containerEl) highlightInLecture(containerEl, query);
      });
    }
  });


createEffect(() => {
  const rendered = html();
  if (!containerEl) return;

  containerEl.innerHTML = rendered;

  const toc = annotateHeadingsWithIds(containerEl);
  props.onToc?.(toc);

  void cacheLectureImages(containerEl);

  // ← هذا السطر الناقص
  void renderAllMermaidInContainer(containerEl);

  const query = props.highlightQuery;
  if (query && containerEl) {
    requestAnimationFrame(() => {
      if (containerEl) highlightInLecture(containerEl, query);
    });
  }
});

  return (
    <Show
      when={!record.loading}
      fallback={<p class="p-6 text-center text-sm opacity-60">جاري التحميل...</p>}
    >
      <Show
        when={!notFound()}
        fallback={
          <p class="p-6 text-center text-sm opacity-60">
            لا توجد محاضرة منشورة بعد لهذا الفصل
          </p>
        }
      >
        <LectureRender html="" ref={(el) => (containerEl = el)} />
      </Show>
    </Show>
  );
}
