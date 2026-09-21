import { JSX, onMount } from "solid-js";
import Header from "./Header/Header";
import { useLocation } from "@solidjs/router";
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

  onMount(() => {
    applyTheme(theme());
  });

  return (
    <div class="dark:bg-main-dark bg-main-light relative max-h-screen">
      {quizMode() ||
      location().includes("/search") ||
      location().includes("/status") ||
      location().includes("/weak") ||
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
