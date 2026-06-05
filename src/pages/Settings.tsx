import { createSignal, For } from "solid-js";
import { useTheme } from "../hooks/useTheme";

const colors = {
  Ola: {
    main: "#b118d7",
    secondary: "#ffae58",
    warn: "#e50000",
    true: "#32c79f",
  },
  Nizar: {
    main: "#32c79f",
    secondary: "#8e00d0",
    warn: "#e50000",
    true: "#32c79f",
  },
  Belal: {
    main: "#7e354d",
    secondary: "#e6a9ec",
    warn: "#e50000",
    true: "#32c79f",
  },
  Rama: {
    main: "#d77418",
    secondary: "#e6a9ec",
    warn: "#e50000",
    true: "#32c79f",
  },
  Maram: {
    main: "#1887d7",
    secondary: "#e6a9ec",
    warn: "#e50000",
    true: "#32c79f",
  },
};

export default function Settings() {
  const { theme, setTheme, setCustomColor, customColor } = useTheme();
  // ─── Gemini API Key ───────────────────────────────────────────────
  const [geminiKey, setGeminiKey] = createSignal(
    localStorage.getItem("gemini_api_key") ?? "",
  );
  const [showKey, setShowKey] = createSignal(false);
  const [keySaved, setKeySaved] = createSignal(false);

  const saveGeminiKey = () => {
    localStorage.setItem("gemini_api_key", geminiKey());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };
  return (
    <div
      class="dark:bg-main-dark bg-darker-light-1 min-h-screen px-5 pt-5"
      dir="rtl"
    >
      {/* Header */}
      <div class="mb-6">
        <h1 class="text-2xl font-bold dark:text-white">الاعدادات</h1>
      </div>
      <div class="flex w-full flex-col items-center gap-2">
        <div
          class="mb-6 w-full rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
          dir="rtl"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="text-xl">🔥</span>
            <h3 class="font-bold">الألوان</h3>
          </div>
          <p class="mb-3 text-xs text-slate-400">خصص الالوان كما تريد </p>
          <div class="dark:bg-lighter-dark-2 flex flex-wrap justify-between flex-row-reverse rounded-lg p-2">
            <For each={Object.entries(colors)}>
              {([name, color]) => (
                <button
                  title={name}
                  style={{ color: color.main }}
                  onClick={() => {
                    localStorage.removeItem("custom-color");
                    setTheme(name);
                  }}
                  class={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    theme() === name
                      ? "scale-110 border-current shadow-lg"
                      : "border-transparent"
                  }`}
                >
                  <div class="flex h-8 w-8 items-center justify-center rounded-full bg-current">
                    <span class="text-sm font-bold text-white">
                      {name[0] + name.at(-1)?.toUpperCase()}
                    </span>
                  </div>
                </button>
              )}
            </For>

            <label
              title="Custom Color"
              class={`relative h-10 w-10 cursor-pointer rounded-full border-2 ${
                theme() === "custom"
                  ? "border-main scale-110 shadow-lg"
                  : "border-transparent"
              }`}
            >
              <input
                type="color"
                value={customColor() || "#32c79f"}
                onInput={(e) => {
                  localStorage.setItem("custom-color", e.currentTarget.value);
                  setCustomColor(e.currentTarget.value);
                  setTheme("custom");
                }}
                class="absolute inset-0 cursor-pointer opacity-0"
              />
              <span
                class="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-current"
                style={{
                  "background-color": customColor() || "#d6d6d6",
                }}
              ></span>
            </label>
          </div>
        </div>

        {/* ─── Gemini API Key ─── */}
        <div
          class="mb-6 w-full rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
          dir="rtl"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="text-xl">✨</span>
            <h3 class="font-bold">مفتاح Gemini AI</h3>
          </div>
          <p class="mb-3 text-xs text-slate-400">
            احصل على مفتاحك المجاني من{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              class="text-main underline"
            >
              Google AI Studio
            </a>
          </p>
          <div class="flex gap-2">
            <input
              type={showKey() ? "text" : "password"}
              value={geminiKey()}
              onInput={(e) => setGeminiKey(e.currentTarget.value)}
              placeholder="AIza..."
              class="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-700"
              dir="ltr"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              class="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-700"
            >
              {showKey() ? "🙈" : "👁️"}
            </button>
          </div>
          <div class="mt-3 flex gap-2">
            <button
              onClick={saveGeminiKey}
              class="bg-main rounded-full px-4 py-2 text-sm text-white"
            >
              {keySaved() ? "تم الحفظ ✓" : "حفظ"}
            </button>
            <Show when={geminiKey()}>
              <button
                onClick={() => {
                  setGeminiKey("");
                  localStorage.removeItem("gemini_api_key");
                }}
                class="rounded-full bg-red-50 px-4 py-2 text-sm text-red-500 dark:bg-red-900/20"
              >
                حذف
              </button>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
