import { Show, createEffect, createSignal, on, onCleanup } from "solid-js";
import { X } from "lucide-solid";
import type { LectureTocEntry } from "../lib/lectureContentHtml";
import {
  computePosition,
  loadPosition,
  savePosition,
  targetScrollTop,
  type SavedPosition,
} from "../lib/lectureResume";

interface Props {
  subjectId: string;
  seasonId: number;
  entries: LectureTocEntry[];
}

const MIN_SAVE_SCROLL = 50; // don't record "I just opened it"
const MIN_JUMP = 200; // don't offer a resume that is basically here already

// Saves the reading position (debounced) and offers a "continue where you
// stopped" chip on open. Saving is paused while the chip is visible so that
// scrolling a little from the top can't overwrite the stored position.
export default function LectureResumeBar(props: Props) {
  const [pending, setPending] = createSignal<SavedPosition | null>(null);
  const [label, setLabel] = createSignal("");

  createEffect(
    on(
      () => [props.subjectId, props.seasonId, props.entries] as const,
      ([subjectId, seasonId, entries]) => {
        setPending(null);
        if (entries.length === 0) return;
        const scroller = document.querySelector<HTMLElement>(".lecture-content");
        if (!scroller) return;

        const saved = loadPosition(subjectId, seasonId);
        if (saved) {
          const target = targetScrollTop(scroller, saved);
          if (target !== null && target - scroller.scrollTop > MIN_JUMP) {
            setPending(saved);
            setLabel(entries.find((e) => e.id === saved.id)?.text ?? "");
          }
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        const flush = () => {
          if (timer) clearTimeout(timer);
          timer = undefined;
          if (pending() || scroller.scrollTop < MIN_SAVE_SCROLL) return;
          const pos = computePosition(scroller, entries);
          if (pos) savePosition(subjectId, seasonId, pos);
        };
        const onScroll = () => {
          const p = pending();
          if (p) {
            // User scrolled past the saved spot on their own: drop the chip.
            const t = targetScrollTop(scroller, p);
            if (t === null || scroller.scrollTop >= t - 20) setPending(null);
            return;
          }
          if (timer) clearTimeout(timer);
          timer = setTimeout(flush, 300);
        };
        const onHide = () => {
          if (document.visibilityState === "hidden") flush();
        };

        scroller.addEventListener("scroll", onScroll, { passive: true });
        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", flush);
        onCleanup(() => {
          flush();
          scroller.removeEventListener("scroll", onScroll);
          document.removeEventListener("visibilitychange", onHide);
          window.removeEventListener("pagehide", flush);
        });
      },
    ),
  );

  const resume = () => {
    const p = pending();
    const scroller = document.querySelector<HTMLElement>(".lecture-content");
    if (!p || !scroller) return;
    const t = targetScrollTop(scroller, p);
    setPending(null);
    if (t !== null) scroller.scrollTo({ top: t, behavior: "smooth" });
  };

  return (
    <Show when={pending()}>
      <div class="lecture-resume" dir="rtl" role="status">
        <button type="button" class="lecture-resume__go" onClick={resume}>
          <span class="lecture-resume__title">متابعة من حيث توقفت</span>
          <Show when={label()}>
            <span class="lecture-resume__sub">{label()}</span>
          </Show>
        </button>
        <button
          type="button"
          class="lecture-resume__close"
          aria-label="إغلاق"
          onClick={() => setPending(null)}
        >
          <X size={16} />
        </button>
      </div>
    </Show>
  );
}
