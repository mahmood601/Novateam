import { Router } from "@solidjs/router";
import { MetaProvider } from "@solidjs/meta";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {


  return (
    <Router
      root={props => (
        <>
          <MetaProvider>
            <script
              innerHTML={`
          if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          `}
            ></script>

            <Suspense>{props.children}</Suspense>
          </MetaProvider>
        </>
      )}
    >
      <FileRoutes />
    </Router >
  );
}
