// Settings card: brand presets + advanced per-color customisation.
// State and storage live in lib/colorOverrides.ts; defaults live in
// styles/colors.css. This file is only the UI.

import { For, Show } from "solid-js";
import toast from "solid-toast";
import {
  BRAND_TOKENS,
  NEUTRAL_TOKENS,
  PRESETS,
  exportColors,
  importColors,
  resetAllColors,
  resetColor,
  setColor,
  setPreset,
  useColors,
} from "../lib/colorOverrides";

function ColorRow(props: { name: string; label: string }) {
  const c = useColors();
  return (
    <div class="flex items-center justify-between gap-2 py-1.5">
      <span class="text-sm">{props.label}</span>
      <div class="flex items-center gap-2">
        <Show when={c.isOverridden(props.name)}>
          <button
            type="button"
            title="استعادة الافتراضي"
            onClick={() => resetColor(props.name)}
            class="text-ink-muted-light dark:text-ink-muted-dark px-1 text-base leading-none"
          >
            ↺
          </button>
        </Show>
        <span
          dir="ltr"
          class="text-ink-muted-light dark:text-ink-muted-dark w-[4.5rem] text-left font-mono text-[10px]"
        >
          {c.value(props.name)}
        </span>
        <label class="border-line-light dark:border-line-dark relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border-2">
          <input
            type="color"
            value={c.value(props.name)}
            onInput={(e) => setColor(props.name, e.currentTarget.value)}
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span class="block h-full w-full" style={{ background: c.value(props.name) }} />
        </label>
      </div>
    </div>
  );
}

export default function ColorSettings() {
  const c = useColors();
  let fileInput: HTMLInputElement | undefined;

  const download = () => {
    const blob = new Blob([exportColors()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nova-colors.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const n = importColors(await file.text());
      toast.success(`تم تطبيق ${n} لون`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر قراءة الملف");
    } finally {
      if (fileInput) fileInput.value = "";
    }
  };

  const reset = () => {
    if (confirm("إعادة كل الألوان إلى الافتراضي؟")) resetAllColors();
  };

  return (
    <div class="bg-surface-light dark:bg-surface-dark mb-6 w-full rounded-2xl p-5 shadow-sm" dir="rtl">
      <div class="mb-3 flex items-center gap-2">
        <span class="text-xl">🔥</span>
        <h3 class="font-bold">الألوان</h3>
      </div>
      <p class="text-ink-muted-light mb-3 text-xs">خصص الالوان كما تريد </p>

      {/* Presets + free main color */}
      <div class="dark:bg-lighter-dark-2 flex flex-row-reverse flex-wrap justify-between rounded-lg p-2">
        <For each={PRESETS}>
          {(p) => (
            // data-theme scopes the preset's variables to this button, so the
            // swatch reads its color straight from colors.css.
            <button
              data-theme={p.id}
              title={p.id}
              style={{ color: "var(--color-main)" }}
              onClick={() => setPreset(p.id)}
              class={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                c.preset() === p.id && !c.hasCustomBrand()
                  ? "scale-110 border-current shadow-lg"
                  : "border-transparent"
              }`}
            >
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-current">
                <span class="text-sm font-bold text-white">
                  {p.id[0] + p.id.at(-1)?.toUpperCase()}
                </span>
              </div>
            </button>
          )}
        </For>

        <label
          title="لون أساسي مخصص"
          class={`relative h-10 w-10 cursor-pointer rounded-full border-2 ${
            c.hasCustomBrand() ? "border-main scale-110 shadow-lg" : "border-transparent"
          }`}
        >
          <input
            type="color"
            value={c.value("main")}
            onInput={(e) => setColor("main", e.currentTarget.value)}
            class="absolute inset-0 cursor-pointer opacity-0"
          />
          <span
            class="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ "background-color": c.value("main") }}
          />
        </label>
      </div>

      {/* Advanced */}
      <details class="mt-3">
        <summary class="cursor-pointer py-1 text-sm font-bold">تخصيص متقدم</summary>

        <div class="mt-2">
          <h4 class="text-main mb-1 text-sm">ألوان الهوية</h4>
          <div class="divide-line-light dark:divide-line-dark divide-y">
            <For each={BRAND_TOKENS}>{(t) => <ColorRow name={t.name} label={t.label} />}</For>
          </div>

          <h4 class="text-main mt-4 mb-1 text-sm">الوضع الفاتح ☀️</h4>
          <div class="divide-line-light dark:divide-line-dark divide-y">
            <For each={NEUTRAL_TOKENS}>{(t) => <ColorRow name={t.light} label={t.label} />}</For>
          </div>

          <h4 class="text-main mt-4 mb-1 text-sm">الوضع الداكن 🌙</h4>
          <div class="divide-line-light dark:divide-line-dark divide-y">
            <For each={NEUTRAL_TOKENS}>{(t) => <ColorRow name={t.dark} label={t.label} />}</For>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={download}
              class="bg-chip-light dark:bg-chip-dark rounded-xl px-3 py-2 text-sm font-bold"
            >
              تصدير
            </button>
            <button
              type="button"
              onClick={() => fileInput?.click()}
              class="bg-chip-light dark:bg-chip-dark rounded-xl px-3 py-2 text-sm font-bold"
            >
              استيراد
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!c.hasAnyOverride() && c.preset() === "Ola"}
              class="text-warn bg-chip-light dark:bg-chip-dark rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40"
            >
              إعادة ضبط الكل
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              class="hidden"
              onChange={(e) => upload(e.currentTarget.files?.[0])}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
