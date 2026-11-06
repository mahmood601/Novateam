import { createSignal, For, onMount, Show } from "solid-js";
import toast from "solid-toast";
import { useUser } from "../context/user";
import { supabase } from "../services/supabase";
import { isAdminRole } from "../lib/roles";
import { clearAuthorNameCache } from "../services/authors";
import { useTheme } from "../hooks/useTheme";
import { useCustomFont } from "../hooks/useCustomFont";
import CopyDiagnosticsButton from "../components/CopyDiagnosticsButton";
import { colors } from "../constants/themeColors";
import { useShapeTheme } from "../hooks/useShapeTheme";

export default function Settings() {
  const { theme, setTheme, setCustomColor, customColor } = useTheme();
  const { shapeTheme, setShapeTheme, shapeThemes } = useShapeTheme();

  // ─── إظهار اسمي كمضيف للأسئلة/المحاضرات (للأدمن والمساهمين فقط) ───
  const { user, canAny } = useUser();
  const isContributor = () =>
    isAdminRole(user()?.role) || canAny("quiz") || canAny("lecture");
  const [showName, setShowName] = createSignal(true);
  const [showNameReady, setShowNameReady] = createSignal(false);
  const [showNameSaving, setShowNameSaving] = createSignal(false);

  onMount(async () => {
    const id = user()?.id;
    if (!id || !navigator.onLine) return;
    const { data } = await supabase
      .from("users")
      .select("show_author_name")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setShowName(data.show_author_name !== false);
      setShowNameReady(true);
    }
  });

  const toggleShowName = async () => {
    const id = user()?.id;
    if (!id || showNameSaving()) return;
    const next = !showName();
    setShowName(next);
    setShowNameSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ show_author_name: next })
      .eq("id", id);
    setShowNameSaving(false);
    if (error) {
      setShowName(!next);
      toast.error("تعذّر حفظ الخيار، تحقق من الاتصال");
      return;
    }
    clearAuthorNameCache();
    toast.success(next ? "سيظهر اسمك للطلاب" : "تم إخفاء اسمك عن الطلاب");
  };

  // ─── خط التطبيق المخصص ───────────────────────────────────────────
  const {
    fontName,
    isSaving,
    error: fontError,
    uploadFont,
    resetFont,
  } = useCustomFont();
  let fontInputRef: HTMLInputElement | undefined;

  const onFontFileChange = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await uploadFont(file);
    input.value = ""; // يسمح برفع نفس الملف مرة أخرى إن احتاج المستخدم
  };

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
      class="h-dvh dark:bg-main-dark bg-darker-light-1 flex flex-col overflow-hidden px-5 pt-14"
      dir="rtl"
    >
      {/* Header */}
      <h1 class="py-5 text-2xl font-bold dark:text-white">الاعدادات</h1>
      <div class="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto mb-18">
        <div
          class="mb-6 w-full rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
          dir="rtl"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="text-xl">🔥</span>
            <h3 class="font-bold">الألوان</h3>
          </div>
          <p class="mb-3 text-xs text-slate-400">خصص الالوان كما تريد </p>
          <div class="dark:bg-lighter-dark-2 flex flex-row-reverse flex-wrap justify-between rounded-lg p-2">
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

        {/* ─── شكل أشكال المحاضرات (بطاقات، خطوات، ...) ─── */}
        <div
          class="mb-6 w-full rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
          dir="rtl"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="text-xl">🧩</span>
            <h3 class="font-bold">شكل أشكال المحاضرات</h3>
          </div>
          <p class="mb-3 text-xs text-slate-400">
            يغيّر مظهر البطاقات والخطوات وغيرها في كل المحاضرات دون تعديلها
          </p>
          <div class="dark:bg-lighter-dark-2 flex flex-wrap gap-2 rounded-lg p-2">
            <For each={shapeThemes}>
              {(t) => (
                <button
                  onClick={() => setShapeTheme(t.id)}
                  class={`rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all duration-200 ${
                    shapeTheme() === t.id
                      ? "border-main text-main"
                      : "border-transparent"
                  }`}
                >
                  {t.label}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* ─── خط التطبيق ─── */}
        <div
          class="mb-6 w-full rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
          dir="rtl"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="text-xl">🔤</span>
            <h3 class="font-bold">خط التطبيق</h3>
          </div>
          <p class="mb-3 text-xs text-slate-400">
            ارفع ملف خط من جهازك (ttf, otf, woff, woff2) ليُطبَّق على واجهة
            التطبيق بالكامل، ويُحفظ محلياً على جهازك فقط.
          </p>

          <Show when={fontName()}>
            <div class="mb-3 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-700">
              <span class="truncate">الخط الحالي: {fontName()}</span>
              <span class="text-main">مفعّل ✓</span>
            </div>
          </Show>

          <Show when={fontError()}>
            <p class="mb-3 text-xs text-red-500">{fontError()}</p>
          </Show>

          <input
            ref={fontInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            class="hidden"
            onChange={onFontFileChange}
          />

          <div class="flex gap-2">
            <button
              disabled={isSaving()}
              onClick={() => fontInputRef?.click()}
              class="bg-main rounded-full px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {isSaving()
                ? "جاري الحفظ..."
                : fontName()
                  ? "تغيير الخط"
                  : "رفع خط مخصص"}
            </button>
            <Show when={fontName()}>
              <button
                disabled={isSaving()}
                onClick={resetFont}
                class="rounded-full bg-red-50 px-4 py-2 text-sm text-red-500 disabled:opacity-50 dark:bg-red-900/20"
              >
                الرجوع للخط الافتراضي
              </button>
            </Show>
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

        {/* ─── إظهار اسمي على ما أضفته ─── */}
        <Show when={isContributor() && showNameReady()}>
          <div
            class="mb-6 w-full rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
            dir="rtl"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="mb-1 flex items-center gap-2">
                  <span class="text-xl">🪪</span>
                  <h3 class="font-bold">إظهار اسمي للطلاب</h3>
                </div>
                <p class="text-xs text-slate-400">
                  عند التفعيل يظهر اسمك كمن أضاف الأسئلة والمحاضرات. عند الإيقاف
                  يظهر تاريخ آخر تعديل فقط بدون اسمك.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showName()}
                disabled={showNameSaving()}
                onClick={toggleShowName}
                class={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  showName() ? "bg-main" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  class={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                    showName() ? "right-0.5" : "right-[1.375rem]"
                  }`}
                />
              </button>
            </div>
          </div>
        </Show>

        {/* ─── تشخيص الجهاز ─── */}
        <CopyDiagnosticsButton />
      </div>
    </div>
  );
}
