import { createSignal, createEffect } from "solid-js";

const THEME_KEY = "theme-color";
const CUSTOM_COLOR_KEY = "custom-color";
const availableThemes = ["Ola", "Nizar", "Belal", "Rama", "Maram"] as const;

type ThemeT = (typeof availableThemes)[number] | "custom";

export function useTheme() {
  const [customColor, setCustomColor] = createSignal<string | null>(
    localStorage.getItem(CUSTOM_COLOR_KEY)
  );
  const [theme, setTheme] = createSignal<ThemeT>(
    (localStorage.getItem(THEME_KEY) as ThemeT) || "Ola"
  );

  function applyTheme(newTheme: ThemeT) {
    document.documentElement.setAttribute("data-theme", newTheme);
  
    if (newTheme === "custom" && customColor()) {
      document.documentElement.style.setProperty("--color-main", customColor()!);
    } else {
      document.documentElement.style.removeProperty("--color-main");
    }
  
    localStorage.setItem(THEME_KEY, newTheme);
  }
  createEffect(() => {
    if (theme() === "custom" && customColor()) {
      applyTheme("custom");
    } else {
      applyTheme(theme());
    }
  });

  return {
    theme,
    setTheme,
    applyTheme,
    availableThemes,
    setCustomColor,
    customColor,
  };
}
