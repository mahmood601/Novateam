import { createSignal, onCleanup, onMount } from "solid-js";

export function useKeyboardToolbar() {
  const [offset, setOffset] = createSignal(0);
  const [persistentHeight, setPersistentHeight] = createSignal(0);

  const updatePosition = () => {
    if (!window.visualViewport) {
      // No visualViewport (desktop) — don't reset persistent height,
      // keep whatever we measured previously.
      setOffset(0);
      return;
    }

    const vv = window.visualViewport;
    const newOffset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    setOffset(newOffset);
    if (newOffset > 0) setPersistentHeight(newOffset);
  };

  onMount(() => {
    updatePosition();

    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
  });

  onCleanup(() => {
    updatePosition();

    window.visualViewport?.removeEventListener("resize", updatePosition);
    window.visualViewport?.removeEventListener("scroll", updatePosition);
    window.removeEventListener("resize", updatePosition);
  });

  // Return both the live offset (which goes to 0 when the keyboard hides)
  // and the last-measured keyboard height so callers can keep a sheet
  // sized to the keyboard even after it disappeared.
  return { offset, persistentHeight };
}
