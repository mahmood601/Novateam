import { createSignal, onCleanup, onMount, Show } from "solid-js";
import InstallPrompt from "./pwa/InstallPrompt";
import ReloadPrompt from "./pwa/ReloadPrompt";

// Public pages where first-load speed matters most: no service worker work here.
const PUBLIC_PATHS = ["/landing", "/login", "/privacy"];
const isPublicPage = () => PUBLIC_PATHS.includes(location.pathname);

export default function PWAProvider() {
  // The service worker (registration + its background precaching) must never
  // compete with the page's own first load. Register only after the window has
  // loaded, the browser is idle, and the visitor is past the public pages.
  const [swAllowed, setSwAllowed] = createSignal(false);

  onMount(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const tryEnable = () => {
      if (isPublicPage()) return; // keep waiting (e.g. until after login)
      setSwAllowed(true);
      if (timer) clearInterval(timer);
    };

    const afterIdle = () => {
      const run = () => {
        tryEnable();
        if (!swAllowed()) timer = setInterval(tryEnable, 2000);
      };
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 5000 });
      } else {
        setTimeout(run, 3000);
      }
    };

    if (document.readyState === "complete") afterIdle();
    else window.addEventListener("load", afterIdle, { once: true });

    onCleanup(() => {
      if (timer) clearInterval(timer);
      window.removeEventListener("load", afterIdle);
    });
  });

  return (
    <>
      {/* Always mounted: it must catch `beforeinstallprompt`, which fires early. It decides itself when to show. */}
      <InstallPrompt />
      <Show when={swAllowed()}>
        <ReloadPrompt />
      </Show>
    </>
  );
}
