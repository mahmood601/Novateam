import { JSX, onMount } from "solid-js";
import Header from "./Header/Header";
import { useLocation } from "@solidjs/router";
import { account } from "../stores/account";
import { useTheme } from "../hooks/useTheme";
import { Links } from "./Header/Links";

export default function Layout(props: { children: JSX.Element }) {
  const location = () => useLocation().pathname;
  const quizMode = () =>
    (location().includes("season") || location().includes("year")) &&
    !account.devMode;

  const { theme, applyTheme } = useTheme();

  onMount(() => {
    applyTheme(theme());
  });

  return (
    <div class="dark:bg-main-dark bg-main-light relative flex h-screen flex-col">
      {quizMode() ||
      location().includes("/profile") ||
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
