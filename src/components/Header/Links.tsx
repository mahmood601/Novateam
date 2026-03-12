import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import ThemeBtn from "./ThemeBtn";

const links = [
  { name: "وضع الإضاءة", image: "mode", route: null },
  { name: "الحساب", image: "account", route: "profile" },
  { name: "الإعدادات", image: "settings", route: "settings" },
];

export function Links() {
  return (
    <nav class="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <ul class="dark:bg-main-dark bg-main-light flex gap-5 rounded-2xl border px-6 py-3 shadow-sm transition-all hover:shadow-md">
        <For each={links}>
          {(link, index) => (
            <li class="group relative flex items-center justify-center">
              <Show
                when={index() === 0}
                fallback={
                  <A
                    href={link.route ? `/${link.route}` : "#"}
                    class="hover:bg-main/10 flex size-9 items-center justify-center rounded-lg transition-all"
                  >
                    <img
                      class="size-6 dark:invert"
                      src={`/app/${link.image}.svg`}
                      alt={link.name}
                    />
                  </A>
                }
              >
                <ThemeBtn />
              </Show>

              {/* tooltip */}
              <div class="pointer-events-none absolute top-0 left-0 ml-3 -translate-x-1/2 -translate-y-12 opacity-0 transition-all duration-300 group-hover:-translate-y-13 group-hover:opacity-100">
                <div class="flex flex-col items-center justify-center">
                  <p class="bg-main-dark dark:bg-main-light text-main-light dark:text-main-dark rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap">
                    {link.name}
                  </p>
                  <span class="border-t-main-dark dark:border-t-main-light border-[8px] border-y-transparent border-r-transparent border-l-transparent"></span>
                </div>
              </div>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
