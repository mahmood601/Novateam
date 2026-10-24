import { JSX, onMount, Show } from "solid-js";
import Header from "./Header/Header";
import { useIsRouting, useLocation } from "@solidjs/router";
import { useTheme } from "../hooks/useTheme";
import { Links } from "./Header/Links";

export default function Layout(props: { children: JSX.Element }) {
  const location = () => useLocation().pathname;
  const quizMode = () => location().includes("quiz");
  const isMainPages = () =>
    location().includes("/stats") ||
    location().includes("/settings") ||
    location().includes("/dashboard") ||
    location().includes("/profile");

  const { theme, applyTheme } = useTheme();
  // True while a navigation is pending (e.g. a lazy page is still loading).
  // The router keeps the old page on screen until then, so without this the
  // tap on a link looks like it did nothing.
  const isRouting = useIsRouting();

  onMount(() => {
    applyTheme(theme());
  });

  return (
    <div class="dark:bg-main-dark bg-main-light relative max-h-screen">
      <Show when={isRouting()}>
        <div
          class="bg-main pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1 animate-pulse"
          role="progressbar"
          aria-label="جاري التحميل"
        />
      </Show>
      {quizMode() ||
      location().includes("/search") ||
      location().includes("/status") ||
      location().includes("/weak") ||
      location().includes("/landing") ||
      location().includes("/editor") ||
      location().includes("/print") ||
      location().includes("/favorite") ? null : (
        <>
          <Header />
          {location() === "/" || isMainPages() ? <Links /> : null}
        </>
      )}
      {props.children}
    </div>
  );
}
