import { For, Match, onCleanup, onMount, Setter, Show, Switch } from "solid-js";
import { createSignal } from "solid-js";
import { Transition } from "solid-transition-group";
import AppName from "./AppName";
import ThemeBtn from "./ThemeBtn";
import { A } from "@solidjs/router";
import SearchBox from "./SearchBox";
import { account } from "~/stores/account";
import Panel from "./panel";
let links = [
  {
    name: "وضع الإضاءة",
    image: "mode",
    route: null,
  },
  // {
  //   name: 'الحساب',
  //   image: "account",
  //   route: 'profile',
  // },

  // {
  //   name: 'الإعدادات',
  //   image: "settings",
  //   route: 'settings',
  // },
  // {
  //   name: 'المدونة',
  //   image: "blog",
  //   route: 'blog',
  // },
];

declare module "solid-js" {
  namespace JSX {
    interface CustomEvents {
      click: MouseEvent;
    }
  }
}

const [openPanel, setOpenPanel] = createSignal(false);
const [open, setOpen] = createSignal(false);

let menuRef!: HTMLDivElement;
export default function Header() {
  const [search, setSearch] = createSignal(false);

  if (account.devMode && links.at(links.length - 1)?.image != "plus") {
    links.push({
      name: "إضافة",
      image: "plus",
      route: "#",
    });
  }

  return (
    <header class="z-50 sticky h-20 bg-white dark:bg-header  top-0 py-4 px-5 flex justify-between items-center shadow-gray-400 dark:shadow-dark-hover shadow-sm">
      <nav>
        <div classList={{ open: open(), relative: true }} ref={menuRef}>
          <div
            onClick={() => setOpen(!open())}
            classList={{
              " justify-center open": open(),
              "justify-around": !open(),
              "flex relative rounded-full px-1 py-3 w-10 h-10  flex-col items-center hover:bg-gray-200  dark:hover:bg-dark-hover":
                true,
            }}
          >
            <span class="burger-slice"></span>
            <span class="burger-slice"></span>
            <span class="burger-slice"></span>
          </div>
          <Transition name="dropdown">
            <Show when={open()}>
              <Links setOpen={setOpen} />
            </Show>
          </Transition>
        </div>
      </nav>

      <AppName hide={search} />
      <SearchBox search={search} setSearch={setSearch} />
      <Show when={openPanel()}>
        <Panel openSetter={setOpenPanel} />
      </Show>
    </header>
  );
}

function Links(props: { setOpen: Setter<boolean> }) {
  const handleClick = (e: MouseEvent) => {
    if (!menuRef.contains(e.target as Node)) {
      props.setOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("click", handleClick);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClick);
  });

  return (
    <ul class="z-50 absolute border-2 border-gray-300 dark:border-dark-hover dark:bg-black left-1/2 top-full -translate-x-1/2 translate-y-6 bg-white rounded-md p-6 h-fit w-fit grid grid-cols-1 justify-items-center gap-4">
      <For each={links}>
        {(link, index) => (
          <li
            classList={{
              "sun-link": index() === 1,
              "link relative hover:hovered": true,
            }}
          >
            <div class="size-6 flex justify-center">
              <Show
                when={index() === 0}
                fallback={
                  <A
                    onClick={() => {
                      if (link.image == "plus") {
                        setOpenPanel(!openPanel());
                        setOpen(false);
                      }
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
            <p
              style={{ "animation-delay": `${(index() + 1) * 0.5}s` }}
              class="hint hint-hovered dark:shadow-white dark:text-white dark:shadow-md dark:bg-[#444] pointer-events-none opacity-0 transition-all will-change-auto duration-400 rtl p-[6px] rounded-r-full  absolute top-1/2 -translate-y-1/2 left-full bg-white w-max"
            >
              {link.name}
            </p>
          </li>
        )}
      </For>
    </ul>
  );
}
