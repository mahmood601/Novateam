import { usePrefersDark } from "@solid-primitives/media";
import { createEffect, createSignal, onMount } from "solid-js";

const ThemeBtn = () => {
  const [theme, setTheme] = createSignal<"light" | "dark">("light");

  const onClickTheme = () => {
    switch (theme()) {
      case "dark":
        {
          document.documentElement.classList.remove("dark");
          localStorage.theme = "light";
          setTheme("light");
        }
        break;
      default:

        {
          document.documentElement.classList.add("dark");
          localStorage.theme = "dark";
          setTheme("dark");
        } break;
    }
  };



  createEffect(() => {

    if (theme() === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  onMount(() => {
    let lsTheme = localStorage.theme;
    if (!lsTheme) {
      lsTheme = usePrefersDark() ? 'dark' : 'light';
    }


    setTheme(lsTheme);
  });

  return (
    <button
      onClick={onClickTheme}
      class={`${theme() == 'dark' ? 'border-dotted justify-center items-center ' : 'bg-black'} sun transition-all duration-300 rounded-full w-6 h-6 flex justify-end items-start`}>
      < span class={`${theme() == 'dark' ? 'w-6 h-6 border-dotted border-4 border-white justify-center items-center bg-black' : 'w-4 h-4 bg-white'} flex justify-center items-center transition-all duration-300 rounded-full`}>
        <span class={`${theme() == 'dark' ? 'w-3 h-3 bg-white' : 'w-0 h-0'} relative block transition-all duration-300 rounded-full`}></span>
      </span >
    </button >

  );
};
export default ThemeBtn
