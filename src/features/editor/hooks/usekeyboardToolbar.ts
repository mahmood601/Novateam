import { createSignal, onCleanup, onMount } from "solid-js";

/**
 * Tracks the *visual* viewport (the part of the page that is actually
 * visible, i.e. excluding the on-screen keyboard).
 *
 * The editor root is sized to `height` and pinned at `top`, so the toolbar
 * docked at the bottom of that box always sits right above the keyboard and
 * the writing area shrinks instead of being covered.
 */
export function useKeyboardToolbar() {
  const [offset, setOffset] = createSignal(0);
  const [persistentHeight, setPersistentHeight] = createSignal(0);
  const [height, setHeight] = createSignal(
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  const [top, setTop] = createSignal(0);

  const updatePosition = () => {
    const vv = window.visualViewport;
    if (!vv) {
      // No visualViewport (old browsers) — fall back to the layout viewport.
      setOffset(0);
      setTop(0);
      setHeight(window.innerHeight);
      return;
    }

    const newOffset = Math.max(
      0,
      Math.round(window.innerHeight - vv.height - vv.offsetTop),
    );
    setOffset(newOffset);
    if (newOffset > 0) setPersistentHeight(newOffset);

    setHeight(Math.round(vv.height));
    setTop(Math.round(vv.offsetTop));
  };

  onMount(() => {
    updatePosition();

    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
  });

  onCleanup(() => {
    window.visualViewport?.removeEventListener("resize", updatePosition);
    window.visualViewport?.removeEventListener("scroll", updatePosition);
    window.removeEventListener("resize", updatePosition);
  });

  // `offset` = keyboard height now, `persistentHeight` = last measured one,
  // `height`/`top` = visible area to size/pin the editor root with.
  return { offset, persistentHeight, height, top };
}