import { A, useNavigate } from "@solidjs/router";
import { For, Match, on, onCleanup, onMount, Show, Switch } from "solid-js";
import ThemeBtn from "./ThemeBtn";
import { useUser } from "../../context/user";

const links = [
  { name: "وضع الإضاءة", image: "mode", route: null },
  { name: "الحساب", image: "account", route: "profile" },
  { name: "الإعدادات", image: "settings", route: "settings" },
  { name: "الاحصائيات", image: "stats", route: "stats" },
  { name: "البحث", image: "search", route: "search" },
  { name: "لوحة التحكم", image: "dashboard", route: "dashboard" },
];

export function Links() {
  const { user } = useUser();

  const navigate = useNavigate();
  const hadelPopState = (e: PopStateEvent) => {
    navigate("/", { replace: true });
  };

  onMount(() => {
    window.addEventListener("popstate", hadelPopState);
  });

  onCleanup(() => {
    window.removeEventListener("popstate", hadelPopState);
  });

  return (
    <nav class="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <ul class="dark:bg-main-dark bg-main-light flex gap-2 rounded-2xl border px-6 py-3 shadow-sm transition-all hover:shadow-md">
        <For each={links}>
          {(link) => (
            <li class="group relative flex h-9 w-9 items-center justify-center">
              <Switch>
                <Match when={link.image == "mode"}>
                  <ThemeBtn />
                </Match>
                <Match
                  when={
                    user() &&
                    user()?.role !== "admin" &&
                    link.route == "dashboard"
                  }
                >
                  {" "}
                </Match>
                <Match when={true}>
                  <A
                    href={link.route ? `/${link.route}` : "#"}
                    class="hover:bg-main/10 flex size-9 items-center justify-center rounded-lg transition-all duration-200"
                  >
                    <img
                      class="size-6 dark:invert"
                      src={`/app/${link.image}.svg`}
                      alt={link.name}
                    />
                  </A>
                </Match>
              </Switch>

              {/* Tooltip */}
              <div class="tooltip-lens pointer-events-none absolute -translate-y-16 opacity-0 transition-all duration-300 group-hover:opacity-100">
                <div class="balloon relative flex items-center justify-center rounded-md bg-main-dark text-main-light dark:text-main-dark shadow-lg dark:bg-main-light">
                  <div class="wrapper-content flex w-[90%] items-center justify-center opacity-0">
                    <p class="invisible rounded px-2 py-1 text-center text-[13px] leading-[18px] font-bold group-hover:visible ">
                      {link.name}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span class="balloon-arrow absolute -bottom-[9px] left-1/2 -translate-x-1/2 border-x-[8px] border-t-[9px] border-x-transparent border-t-main-dark dark:border-t-main-light" />
                </div>
              </div>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
