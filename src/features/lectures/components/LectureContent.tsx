import { createEffect, createMemo, createResource, createSignal, Show } from "solid-js";
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
import LectureNotes from "./LectureNotes";
import { renderAllDiagramsInContainer } from "@/features/editor/lib/diagram-renderer";

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
  const [containerEl, setContainerEl] = createSignal<HTMLDivElement | undefined>();
  // يزيد كل ما أُعيد حقن الـHTML، ليعرف مكوّن الملاحظات أنه لازم يعيد قراءة الفقرات.
  const [renderTick, setRenderTick] = createSignal(0);

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
    const el = containerEl();
    const rendered = html();
    if (!el) return;

    el.innerHTML = rendered;

    const toc = annotateHeadingsWithIds(el);
    props.onToc?.(toc);

    void cacheLectureImages(el);
    void renderAllDiagramsInContainer(el);

    const query = props.highlightQuery;
    if (query) {
      requestAnimationFrame(() => {
        if (el.isConnected) highlightInLecture(el, query);
      });
    }

    setRenderTick((t) => t + 1);
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
        <div class="nova-notes-root">
          <LectureRender html="" ref={(el) => setContainerEl(el)} />
          <LectureNotes
            container={containerEl()}
            tick={renderTick()}
            subjectId={props.subjectId}
            seasonId={props.seasonId}
          />
        </div>
      </Show>
    </Show>
  );
}
