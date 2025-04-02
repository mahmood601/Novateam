import { Accessor, Setter } from "solid-js";

const ThemeBtn = (props: {theme: Accessor<"light"|"dark">, setTheme: Setter<"light"|"dark">}) => {

  const onClickTheme = (e: Event) => {
    e.stopPropagation();
    switch (props.theme()) {
      case "dark":
        {
          document.documentElement.classList.remove("dark");
          localStorage.theme = "light";
          props.setTheme("light");
        }
        break;
      default:
        {
          document.documentElement.classList.add("dark");
          localStorage.theme = "dark";
          props.setTheme("dark");
        }
        break;
    }
  };

 

  return (
    <button
      on:click={onClickTheme}
      class={`${props.theme() == "dark" ? "items-center justify-center border-dotted" : "bg-black"} sun flex h-6 w-6 cursor-pointer items-start justify-end rounded-full transition-all duration-300`}
    >
      <span
        class={`${props.theme() == "dark" ? "h-6 w-6 items-center justify-center border-4 border-dotted border-white bg-black" : "h-4 w-4 bg-white"} flex items-center justify-center rounded-full transition-all duration-300`}
      >
        <span
          class={`${props.theme() == "dark" ? "h-3 w-3 bg-white" : "h-0 w-0"} relative block rounded-full transition-all duration-300`}
        ></span>
      </span>
    </button>
  );
};
export default ThemeBtn;
