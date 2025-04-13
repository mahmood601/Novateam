import { createEffect, JSX, onMount } from "solid-js";
import Header from "./Header/Header";
import { useLocation } from "@solidjs/router";
import { account } from "../stores/account";
import { useUser } from "../context/user";
import { useTheme } from "../hooks/useTheme";

export default function Layout(props: { children: JSX.Element }) {
  const location = () => useLocation().pathname;
  const quizMode = () =>
    (location().includes("season") || location().includes("year")) &&
    !account.devMode;

    const {theme, applyTheme} = useTheme()

    onMount(()=>{
      applyTheme(theme())
    })
  

  return (
    <div class="relative flex h-screen flex-col">
      {quizMode() || location().includes("/profile") ? null : <Header />}
      {props.children}
    </div>
  );
}
