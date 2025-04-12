import { For } from "solid-js";
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

  return (
    <div class="bg-darker-light-1 dark:bg-lighter-dark-1 min-h-screen w-screen p-4">
      <p class="text-md text-main mb-5 text-right font-bold">الألوان</p>

      <div class="flex flex-wrap justify-between">
        <For each={Object.entries(colors)}>
          {([name, color]) => (
            <button
              title={name}
              style={{ color: color.main }}
              onClick={() => {
                localStorage.removeItem("custom-color");
                setTheme(name);
              }}
              class={`h-10 w-10 flex justify-center items-center rounded-full border-2 transition-all duration-200 ${
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
  );
}
