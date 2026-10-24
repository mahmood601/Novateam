import { createEffect, createResource, createSignal, on, Show } from "solid-js";
import type { JSONContent } from "@tiptap/core";
import {
  getLectureContentCached,
  hasFreshHtml,
  saveLectureHtml,
} from "../services/local/indexeddb/lectures";
import {
  jsonToLectureHtml,
  annotateHeadingsWithIds,
  type LectureTocEntry,
} from "../lib/lectureContentHtml";
import { cacheLectureImages } from "../services/imageCache";
import { highlightInLecture } from "../lib/lectureHighlight";
import LectureRender from "../../shared/components/LectureRender/LectureRender";
import LectureNotes from "./LectureNotes";

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

  // The reading HTML. Normally it comes straight from the local cache
  // (no Tiptap at all). Only when this device has never built it — or the
  // lecture changed — is it built once, off a visible "building" state, and
  // stored for every later open. Signals (not a resource) are used on
  // purpose: a resource read would suspend the whole page.
  const [html, setHtml] = createSignal("");
  const [building, setBuilding] = createSignal(false);
  const [buildError, setBuildError] = createSignal(false);
  const [retry, setRetry] = createSignal(0);
  let buildRun = 0;

  // Switching lecture: forget the old HTML immediately.
  createEffect(
    on(
      () => [props.subjectId, props.seasonId] as const,
      () => setHtml(""),
      { defer: true },
    ),
  );

  // Tracks the record itself (identity changes on a lecture switch and on a
  // real server update, but NOT on an unchanged background revalidation).
  createEffect(
    on(
      [
        () => (record.state === "ready" && !record.error ? record() : undefined),
        retry,
      ],
      ([rec]) => {
        if (rec === undefined) return; // still loading
        const run = ++buildRun;
        setBuildError(false);

        if (!rec) {
          setBuilding(false);
          setHtml("");
          return;
        }
        if (hasFreshHtml(rec)) {
          setBuilding(false);
          setHtml(rec.html!);
          return;
        }

        // Drop the previous lecture's HTML so it can never flash in the
        // new container while this one is being built.
        setHtml("");
        setBuilding(true);
        jsonToLectureHtml((rec.content as JSONContent | null) ?? null)
          .then((built) => {
            if (run !== buildRun) return; // a newer lecture/version took over
            setHtml(built);
            setBuilding(false);
            void saveLectureHtml(rec, built);
          })
          .catch(() => {
            if (run !== buildRun) return;
            setBuilding(false);
            setBuildError(true);
          });
      },
    ),
  );

  // حقن الـHTML يدوياً (بدل خاصية innerHTML التفاعلية بسولد) عشان نضمن إن
  // توليد id العناوين وكاش الصور يصير فوراً بعد الحقن الفعلي، بدون سباق
  // توقيت بين effect منفصل جوا LectureRender وeffect هون.
  createEffect(() => {
    const el = containerEl();
    const rendered = html();
    if (!el) return;
    // Nothing built yet: keep the container untouched (no empty flash,
    // no wiping of the TOC) until the HTML arrives.
    if (!rendered && (building() || buildError())) return;

    el.innerHTML = rendered;

    const toc = annotateHeadingsWithIds(el);
    props.onToc?.(toc);

    void cacheLectureImages(el);
    // The diagram engine is big (~680 KB), so it is only fetched for
    // lectures that actually contain a diagram.
    if (el.querySelector('[data-type="diagram"], [data-type="mermaid"]')) {
      void import("@/features/editor/lib/diagram-renderer").then((m) => {
        if (el.isConnected) return m.renderAllDiagramsInContainer(el);
      });
    }

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
          <Show when={building()}>
            <div
              class="flex flex-col items-center gap-3 p-8 text-center"
              role="status"
              aria-live="polite"
            >
              <div class="border-main h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
              <p class="text-sm opacity-70">
                جاري تجهيز المحاضرة لأول مرة على جهازك…
              </p>
              <p class="text-xs opacity-50">
                لن يتكرر هذا في المرات القادمة
              </p>
            </div>
          </Show>
          <Show when={buildError()}>
            <div class="flex flex-col items-center gap-3 p-8 text-center">
              <p class="text-sm opacity-70">تعذّر تجهيز المحاضرة</p>
              <button
                type="button"
                class="bg-main rounded-md px-4 py-2 text-white"
                onClick={() => setRetry((n) => n + 1)}
              >
                إعادة المحاولة
              </button>
            </div>
          </Show>
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
