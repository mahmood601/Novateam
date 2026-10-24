import { Accessor, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import Atom from "../Icons/Atom";

// One signal drives the whole component:
//   offline -> atom icon
//   ok      -> "متصل" (shown for 2s after the connection returns)
//   nova    -> the app name
type View = "offline" | "ok" | "nova";

const CONNECTED_DELAY_MS = 2000;

// All three states live in the same grid cell (col 1 / row 1), so they stack
// on top of each other. The pill is as wide as the widest state, which means
// nothing moves or resizes when the state changes: only opacity fades.
const layer =
  "col-start-1 row-start-1 flex items-center justify-center transition-opacity duration-300 pointer-events-none";

export default function AppName(_props: { hide?: Accessor<boolean> }) {
  const [view, setView] = createSignal<View>(
    navigator.onLine ? "nova" : "offline",
  );
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  const handleOnline = () => {
    clearTimer();
    setView("ok");
    timeoutId = setTimeout(() => setView("nova"), CONNECTED_DELAY_MS);
  };

  const handleOffline = () => {
    // Cancel the pending "show Nova" timer, otherwise it would fire while offline.
    clearTimer();
    setView("offline");
  };

  onMount(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  });

  onCleanup(() => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    clearTimer();
  });

  const vis = (v: View) => (view() === v ? "opacity-100" : "opacity-0");

  return (
    <div
      role="status"
      class="relative grid w-fit py-2 rounded-full text-xl font-bold bg-main-light dark:bg-main-dark"
    >
      {/* Offline: spinning atom */}
      <span
        class={`${layer} ${vis("offline")} dark:text-white`}
        aria-hidden={view() !== "offline"}
      >
        <span class="block w-8">
          <Atom />
        </span>
      </span>

      {/* Connected: green dot + ripple ring.
          <Show> re-mounts the ring each time we enter "ok", so the CSS
          animation replays every time instead of only on first render. */}
      <span
        class={`${layer} ${vis("ok")} gap-1.5 text-main`}
        aria-hidden={view() !== "ok"}
      >
        <i class="block h-2.25 w-2.25 rounded-full bg-true" />
        متصل
      </span>
      <Show when={view() === "ok"}>
        <span class="nova-ring" aria-hidden="true" />
      </Show>

      {/* App name: letters pop in one by one (re-mounted on each entry too).
          dir="ltr" keeps the letters in N-o-v-a order inside the RTL page. */}
      <span
        dir="ltr"
        class={`${layer} ${vis("nova")} font-sora text-main-dark dark:text-main-light`}
        aria-hidden={view() !== "nova"}
      >
        <Show when={view() === "nova"}>
          <For each={"Nova".split("")}>
            {(char, i) => (
              <span class="nova-letter" style={{ "animation-delay": `${i() * 70}ms` }}>
                {char}
              </span>
            )}
          </For>
        </Show>
      </span>
    </div>
  );
}