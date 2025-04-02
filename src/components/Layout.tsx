import { JSX } from "solid-js";
import Header from "./Header/Header";
import { useLocation } from "@solidjs/router";
import { account } from "../stores/account";

export default function Layout(props: { children: JSX.Element }) {
  const location = () => useLocation().pathname;
  const quizMode = () =>
    (location().includes("season") || location().includes("year")) &&
    !account.devMode;
    console.log( location().includes("/profile"));
    
    
  return (
    <div class="relative flex h-screen flex-col">
      {quizMode() || location().includes("/profile") ? null : <Header />}
      {props.children}
    </div>
  );
}
