import "@/styles/index.css";
import "@/styles/rainbow.css";
import { Router } from "@solidjs/router";
import Layout from "../features/shared/components/Layout";
import "@fontsource-variable/readex-pro/wght.css";
import "@fontsource/cairo";
import { UserProvider } from "../features/shared/context/user";
import { Toaster } from "solid-toast";
// import "solid-devtools";

import AppRoutes from "./AppRoutes";
import PWAProvider from "../features/shared/components/PWAProvider";
import { useTheme } from "../features/shared/hooks/useTheme";
import AppErrorBoundary from "../features/shared/components/ErrorBoundary";
import { onMount } from "solid-js";
import { checkAndMigrateIfNeeded } from "../features/quizzes/services/local/indexeddb/sync";
import { applyStoredFont } from "../features/shared/services/local/customFont";
import UpdatePanel from "../features/shared/components/updates/UpdatePanel";
import MaintenanceGate from "../features/shared/components/MaintenanceGate";

export default function App() {
  const { applyTheme } = useTheme();

  onMount(() => {
    applyTheme((localStorage.getItem("theme-color") as any) || "Ola");
    applyStoredFont(); // يطبّق خط التطبيق المخصص إن وُجد (لا يوقف باقي الإقلاع)
    void checkAndMigrateIfNeeded();
  });

  return (
    <AppErrorBoundary>
      <UserProvider>
        <MaintenanceGate>
          <Toaster />
          <Router root={Layout as any}>
            <AppRoutes />
          </Router>
        </MaintenanceGate>
        <PWAProvider />
      </UserProvider>
    </AppErrorBoundary>
  );
}
