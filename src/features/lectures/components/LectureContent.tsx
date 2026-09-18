import { createEffect, createMemo, createResource, Show } from "solid-js";
import type { JSONContent } from "@tiptap/core";
import { getLectureContentCached } from "../services/local/indexeddb/lectures";
import {
  jsonToLectureHtml,
  annotateHeadingsWithIds,
  type LectureTocEntry,
} from "../lib/lectureContentHtml";
import { cacheLectureImages } from "../services/imageCache";
import LectureRender from "../../shared/components/LectureRender/LectureRender";

interface Props {
  subjectId: string;
  seasonId: number;
  onToc?: (toc: LectureTocEntry[]) => void;
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