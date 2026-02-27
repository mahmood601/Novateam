import "./index.css";
import "./styles/rainbow.css";
import {  Router } from "@solidjs/router";
import Layout from "./components/Layout.tsx";
import "@fontsource/cairo";
import "@fontsource/poppins";
import { UserProvider } from "./context/user.tsx";
import { Toaster } from "solid-toast";
import "solid-devtools";

import AppRoutes from "./components/AppRoutes.tsx";
import PWAProvider from "./components/PWAProvider.tsx";
import { useTheme } from "./hooks/useTheme.tsx";
import { onMount } from "solid-js";

export default function App() {
  const {applyTheme} = useTheme()

  onMount(()=> {
    applyTheme(localStorage.getItem("theme") as any || "Ola")
  })
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
