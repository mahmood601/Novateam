import { createSignal, onCleanup, onMount } from "solid-js";

// Thin reading-progress bar under the app header. Reads the lecture
// scroller (`.lecture-content`), not the window.
export default function LectureProgressBar() {
  const [ratio, setRatio] = createSignal(0);

  onMount(() => {
    const scroller = document.querySelector<HTMLElement>(".lecture-content");
    if (!scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      setRatio(max > 0 ? Math.min(1, scroller.scrollTop / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    });
  });

  return (
    <div
      class="lecture-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio() * 100)}
    >
      <div class="lecture-progress__fill" style={{ transform: `scaleX(${ratio()})` }} />
    </div>
  );
}
