import { For, onCleanup, onMount, Setter, Show } from "solid-js";
import { createSignal } from "solid-js";
import { Transition } from "solid-transition-group";
import AppName from "./AppName";
import ThemeBtn from "./ThemeBtn";
import { A } from "@solidjs/router";
import Panel from "../panel";

const links = [
  { name: "وضع الإضاءة", image: "mode", route: null },
  { name: "الحساب", image: "account", route: "profile" },
  { name: "الإعدادات", image: "settings", route: "settings" },
];

const [openPanel, setOpenPanel] = createSignal(false);
const [open, setOpen] = createSignal(false);

let menuRef!: HTMLDivElement;

export default function Header() {
  const [search, setSearch] = createSignal(false);

 

  onCleanup(() => setOpen(false));

  const handlePopState = () => setOpen(false);
  window.addEventListener("popstate", handlePopState);
  onCleanup(() => window.removeEventListener("popstate", handlePopState));

  return (
    <header class="dark:bg-header dark:shadow-dark-hover z-40 flex h-20 shrink-0 items-center justify-between bg-white px-5 py-4">
      <nav>
        <div ref={menuRef} class="relative" classList={{ open: open() }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open());
            }}
            class="dark:hover:bg-dark-hover relative flex h-10 w-10 flex-col items-center justify-around rounded-full px-1 py-3 hover:bg-gray-200"
          >
            <span class="burger-slice"></span>
            <span class="burger-slice"></span>
            <span class="burger-slice"></span>
          </button>
          <Transition name="dropdown">
            <Show when={open()}>
              <Links setOpen={setOpen} />
            </Show>
          </Transition>
        </div>
      </nav>
      <AppName hide={search} />
      {/* <SearchBox search={search} setS earch={setSearch} /> */}
      <Show when={openPanel()}>
        <Panel openSetter={setOpenPanel} />
      </Show>
    </header>
  );
}

function Links({ setOpen }: { setOpen: Setter<boolean> }) {
  onMount(() => {
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handleClick);
    onCleanup(() => document.removeEventListener("click", handleClick));
  });

  return (
    <ul class="dark:border-dark-hover absolute top-full left-1/2 z-50 grid h-fit w-fit -translate-x-1/2 translate-y-6 grid-cols-1 justify-items-center gap-4 rounded-md border-2 border-gray-300 bg-white p-6 dark:bg-black">
      <For each={links}>
        {(link, index) => (
          <li class="link hover:hovered relative z-50">
            <div class="flex size-6 justify-center">
              <Show
                when={index() === 0}
                fallback={
                  <A
                    onClick={() => {
                      if (link.image === "plus") setOpenPanel(!openPanel());
                    }}
                    href={link.route ? `/${link.route}` : "#"}
                  >
                    <img
                      class="dark:invert"
                      src={`/app/${link.image}.svg`}
                      alt={link.name}
                    />
                  </A>
                }
              >
                <ThemeBtn />
              </Show>
            </div>
            <div
              style={{ "animation-delay": `${(index() + 1) * 0.5}s` }}
              class="hint hint-hovered pointer-events-none absolute top-1/2 left-full flex w-fit items-center rounded-r-full opacity-0 transition-all duration-400"
            >
              <span class="border-r-main-dark dark:border-r-main-light -mr-[2px] border-8 border-t-transparent border-b-transparent border-l-transparent"></span>
              <p class="rtl bg-main-dark dark:bg-main-light text-main-light font-bold dark:text-main-dark pointer-events-none rounded-full p-2 text-nowrap">
                {link.name}
              </p>
            </div>
          </li>
        )}
      </For>
    </ul>
  );
}
