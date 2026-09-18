import { A, useLocation } from "@solidjs/router";
import { createMemo, For, Match, Show, Switch } from "solid-js";
import { useUser } from "../../context/user";
import {
  Atom,
  ChartColumnBigIcon,
  LayoutGrid,
  Settings,
  UserRound,
} from "lucide-solid";

export function Links() {
  const { user } = useUser();
  const location = useLocation();

  const baseLinks = [
    { name: "الرئيسية", icon: Atom, route: "/" },
    { name: "الحساب", icon: UserRound, route: "/profile" },
    { name: "الإعدادات", icon: Settings, route: "/settings" },
    { name: "الاحصائيات", icon: ChartColumnBigIcon, route: "/stats" },
  ];

  const links = createMemo(() => {
    if (user() && user()?.role == "admin") {
      return [
        ...baseLinks,
        { name: "التحكم", icon: LayoutGrid, route: "/dashboard" },
      ];
    }
    return baseLinks;
  });

  return (
    <nav class="fixed bottom-3 left-1/2 z-50 -translate-x-1/2">
      <ul class="dark:bg-main-dark bg-main-light flex p-1 rounded-2xl border dark:border-lighter-dark-2 shadow-sm transition-all hover:shadow-md">
        <For each={links()}>
          {(link) => (
            <li class={`${location.pathname === link.route? "bg-main/10 text-main ":""} p-2 rounded-md group relative flex items-center justify-center`}>
              <Switch>
                <Match
                  when={
                    !(
                      user() &&
                      user()?.role !== "admin" &&
                      link.route == "dashboard"
                    )
                  }
                >
                  <Show
                    when={
                      !(
                        user() &&
                        user()?.role !== "admin" &&
                        link.route == "dashboard"
                      )
                    }
                  >
                    <A
                      href={link.route}
                      class="flex flex-col items-center justify-center gap-1 transition-all duration-200"
                      replace={link.route !== "/"}
                    >
                      <link.icon size={18} />
                      <span class="text-xs">{link.name}</span>
                    </A>
                  </Show>
                </Match>
              </Switch>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
