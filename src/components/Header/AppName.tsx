import {
  Accessor,
  createEffect,
  createSignal,
  Match,
  onCleanup,
  Switch,
} from "solid-js";
import { Transition } from "solid-transition-group";
import Atom from "../Icons/Atom";

export default function AppName(props: { hide: Accessor<boolean> }) {
  const [connectionState, setConnectionState] = createSignal(
    navigator.onLine ? "online" : "offline",
  );
  const [showAppname, setShowAppname] = createSignal(navigator.onLine);
  let timeoutId: NodeJS.Timeout | null = null;

  const handleOnline = () => {
    setConnectionState("online");
    if (timeoutId) clearTimeout(timeoutId); // clear any sheduled timers

    timeoutId = setTimeout(() => {
      setShowAppname(true);
    }, 2000);
  };

  const handleOffline = () => {
    setConnectionState("offline");
    setShowAppname(false);
    timeoutId = null;
  };

  createEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    onCleanup(() => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    });
  });

  return (
    <div
      class={`${props.hide() ? "hidden" : ""} ml-3 flex-1 text-xl font-bold`}
    >
      <Transition name="slide-fade">
        <Switch>
          <Match
            when={connectionState() === "online" && showAppname() === true}
          >
            <p class="dark:text-main-light text-main-dark text-xl font-bold">
              Nova
            </p>
          </Match>

          <Match when={connectionState() === "online"}>
            <p class="text-main">متصل</p>
          </Match>
          <Match when={connectionState() === "offline"}>
            <p class="w-8 dark:text-white">
              <Atom />
            </p>
          </Match>
        </Switch>
      </Transition>
    </div>
  );
}
