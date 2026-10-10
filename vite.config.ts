import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import process from "node:process";
import devtools from "solid-devtools/vite";
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";
import mkcert from "vite-plugin-mkcert";
import path from "path";

// Workbox silently SKIPS any file bigger than this (default 2 MiB) — it only
// prints a build warning. Skipped chunks aren't cached → lazy pages that need
// them (mermaid, docx, tiptap...) fail offline. Tune it after checking your
// real chunk sizes in the build output.
const MAX_PRECACHE_BYTES = 6 * 1024 * 1024;

const pwaOptions: Partial<VitePWAOptions> = {
  // (removed `mode: "development"` — it made production builds use the
  //  unminified dev Workbox runtime)
  base: "/",
  // "prompt": a new version waits until the user accepts it via ReloadPrompt.
  // (was previously switched to "autoUpdate" by the CLAIMS env var)
  registerType: "prompt", // autoUpdate the other way
  // Emergency kill-switch: build with SW_DESTROY=true to ship a service worker
  // that unregisters itself and clears caches for everyone.
  selfDestroying: process.env.SW_DESTROY === "true",
  includeAssets: ["favicon.svg"],
  workbox: {
    globPatterns: ["**/*.{js,css,html,mp3,woff2,svg,webp,png,ico}"],
    maximumFileSizeToCacheInBytes: MAX_PRECACHE_BYTES,
    // Any navigation (refresh/deep link) offline → serve the cached app shell.
    navigateFallback: "index.html",
  },
  manifest: {
    name: "Nova App",
    short_name: "Nova App",
    id: "NovaApp",
    description: "تطبيق فريق نوڤا لطلاب الطب البشري في جامعة طرطوس ✨❤️",
    display_override: ["standalone", "window-controls-overlay"],
    icons: [
      {
        src: "icons/150.png",
        sizes: "150x150",
        type: "image/png",
      },
      {
        src: "icons/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icons/180.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "icons/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  devOptions: {
    enabled: process.env.SW_DEV === "true",
    /* when using generateSW the PWA plugin will switch to classic */
    type: "module",
    navigateFallback: "index.html",
  },
};

export default defineConfig({
  define: {
    __RELOAD_SW__: JSON.stringify(
      process.env.RELOAD_SW === "true" ? "true" : "false",
    ),
    __DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    sourcemap: process.env.SOURCE_MAP === "true",
    target: "esnext",
    // polyfillDynamicImport: false,
  },
  plugins: [
    mkcert(),
    tailwindcss(),
    solid(),
    devtools({
      /* features options - all disabled by default */
      autoname: true, // e.g. enable autoname
    }),
    VitePWA(pwaOptions),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});