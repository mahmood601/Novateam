import "./index.css";
import "./styles/rainbow.css";
import { Router } from "@solidjs/router";
import Layout from "./components/Layout.tsx";
import "@fontsource/cairo";
import "@fontsource/poppins";
import { UserProvider } from "./context/user.tsx";
import { Toaster } from "solid-toast";
import "solid-devtools";

import AppRoutes from "./components/AppRoutes.tsx";
import PWAProvider from "./components/PWAProvider.tsx";
import { useTheme } from "./hooks/useTheme.tsx";
import { on, onCleanup, onMount } from "solid-js";
import { checkAndMigrateIfNeeded } from "./services/local/indexeddb.ts";

export default function App() {
  const { applyTheme } = useTheme();

  onMount(async () => {
    applyTheme((localStorage.getItem("theme") as any) || "Ola");
    await checkAndMigrateIfNeeded();

    const handleVisbilityChange = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.wating) {
            console.log("New version available, refreshing...");
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisbilityChange);
    onCleanup(() =>
      document.removeEventListener("visibilitychange", handleVisbilityChange),
    );
  });
  return (
    <UserProvider>
      <Toaster />
      <Router root={Layout as any}>
        <AppRoutes />
      </Router>
      <PWAProvider />
    </UserProvider>
  );
}
