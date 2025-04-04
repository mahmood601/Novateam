import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import process from 'node:process'
import devtools from "solid-devtools/vite";
import { VitePWA } from "vite-plugin-pwa";
import mkcert from "vite-plugin-mkcert";

const pwaOptions: Partial<VitePWAOptions> = {
  mode: "development",
  base: "/",
  includeAssets: ["favicon.svg"],
  workbox: {
    globPatterns: ['**/*.{js,css,html,mp3,woff2,svg}'],
  },
  manifest: {
    name: "Nova App 2029",
    short_name: "Nova App",
    id: "NovaApp",
    description:
      "تطبيق فريق نوڤا لطلاب الطب البشري السنة الثانية في جامعة طرطوس ✨❤️",
    display_override: ["standalone", "window-controls-overlay"],
    icons: [
      {
        icons: [
          {
            src: "/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
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

const claims = process.env.CLAIMS === "true";
const selfDestroying = process.env.SW_DESTROY === "true";

if (process.env.SW === "true") {
  pwaOptions.srcDir = "src";
  pwaOptions.filename = claims ? "claims-sw.ts" : "prompt-sw.ts";
  pwaOptions.strategies = "injectManifest";
  (pwaOptions.manifest as Partial<ManifestOptions>).name =
    "PWA Inject Manifest";
  (pwaOptions.manifest as Partial<ManifestOptions>).short_name = "PWA Inject";
  pwaOptions.injectManifest = {
    minify: false,
    enableWorkboxModulesLogs: true,
  };
}

if (claims) pwaOptions.registerType = "autoUpdate";

if (selfDestroying) pwaOptions.selfDestroying = selfDestroying;

function replace(arg0: {
  __DATE__: string;
  __RELOAD_SW__: string;
}): import("vite").PluginOption {
  throw new Error("Function not implemented.");
}

export default defineConfig({
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
      autoname: true,
    }),
    // replace({
    //   __DATE__: new Date().toISOString(),
    //   __RELOAD_SW__: process.env.RELOAD_SW === "true" ? "true" : "false",
    // }),
    VitePWA(pwaOptions),
  ],
});
