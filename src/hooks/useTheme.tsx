import { createSignal, createEffect } from "solid-js";
import { colors } from "../pages/Settings";

const THEME_KEY = "theme-color";
const CUSTOM_COLOR_KEY = "custom-color";
const availableThemes = ["Ola", "Nizar", "Belal", "Rama", "Maram"] as const;

type ThemeT = (typeof availableThemes)[number] | "custom";

export function useTheme() {
  const [customColor, setCustomColor] = createSignal<string | null>(
    localStorage.getItem(CUSTOM_COLOR_KEY),
  );
  const [theme, setTheme] = createSignal<ThemeT>(
    (localStorage.getItem(THEME_KEY) as ThemeT) || "Ola",
  );

// لون كل ثيم يطابق theme.css

  function applyTheme(newTheme: ThemeT) {
    document.documentElement.setAttribute("data-theme", newTheme);
  
    if (newTheme === "custom" && customColor()) {
      document.documentElement.style.setProperty("--color-main", customColor()!);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", customColor()!);
    } else {
      document.documentElement.style.removeProperty("--color-main");
      const color = colors[theme()]?.main ?? "#b118d7";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
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
