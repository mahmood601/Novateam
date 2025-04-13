import "./index.css";
import "./css/rainbow.css";
import { Route, Router } from "@solidjs/router";
import SelectMenu from "./components/SelectMenu.tsx";
import Layout from "./components/Layout.tsx";
import UI from "./components/UI.tsx";
import Quiz from "./components/Quiz/Quiz.tsx";
import "@fontsource/cairo";
import "@fontsource/poppins";
import Profile from "./components/Profile/Profile.tsx";
import Login from "./components/Login.tsx";
import { UserProvider } from "./context/user.tsx";
import { Toaster } from "solid-toast";
import "solid-devtools";
import Settings from "./components/Setttings.tsx";
import ReloadPrompt from "./components/pwa/ReloadPrompt.tsx";
import InstallPrompt from "./components/pwa/InstallPrompt.tsx";
import { createEffect, createSignal } from "solid-js";
import { usePrefersDark } from "@solid-primitives/media";

export default function App() {
  // const date = "__DATE__";
  const [theme, setTheme] = createSignal(
    localStorage.getItem("theme") || "light",
  );
  createEffect(() => {
    const lsTheme =
      (localStorage.getItem("theme") as any) ||
      (usePrefersDark() ? "dark" : "light");
    setTheme(lsTheme);
    document.documentElement.classList.toggle("dark", theme() === "dark");
  });

  return (
    <UserProvider>
      <Toaster />
      <Router root={Layout as any}>
        <Route path="/" component={() => <UI />} />
        <Route path="/profile" component={() => <Profile />} />
        <Route path="/login" component={() => <Login />} />
        <Route path="/settings" component={() => <Settings />} />
        <Route path="/:subject" component={() => <SelectMenu />} />
        <Route path="/:subject/:section" component={() => <Quiz />} />
      </Router>
      <InstallPrompt />
      <ReloadPrompt />
    </UserProvider>
  );
}
