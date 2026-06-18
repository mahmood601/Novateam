import { JSX, onMount } from "solid-js";
import Header from "./Header/Header";
import { useLocation } from "@solidjs/router";
import { useTheme } from "../hooks/useTheme";
import { Links } from "./Header/Links";

export default function Layout(props: { children: JSX.Element }) {
  const location = () => useLocation().pathname;
  const quizMode = () =>
    (location().includes("season") || location().includes("year"));

  const { theme, applyTheme } = useTheme();

  onMount(() => {
    applyTheme(theme());
  });

  return (
    <div class="dark:bg-main-dark bg-main-light relative flex h-screen flex-col">
      {quizMode() ||
      location().includes("/search") ||
      location().includes("/profile") ||
      location().includes("/stats") ||
      location().includes("/settings") ||
      location().includes("/status") ||
      location().includes("/weak") ||
      location().includes("/favorite") ? null : (
        <>
          <Header />
          <Links />
        </>
      )}
      {props.children}
    </div>
  );
}
