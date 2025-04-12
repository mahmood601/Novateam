/* @refresh reload */
import { render } from "solid-js/web";
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
import { UserProvider } from "./lib/context/user.tsx";
import { Toaster } from "solid-toast";
import "solid-devtools";
import Settings from "./components/Setttings.tsx";
import ReloadPrompt from "./components/pwa/ReloadPrompt.tsx";
import InstallPrompt from "./components/pwa/InstallPrompt.tsx";

const root = document.getElementById("root");
const date = "__DATE__";
render(
  () => (
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
  ),
  root!,
);
