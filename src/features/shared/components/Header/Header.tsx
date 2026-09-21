import { A } from "@solidjs/router";
import { UpdateBadge } from "../updates/UpdatePanel";
import AppName from "./AppName";
import ThemeBtn from "./ThemeBtn";
import { Search } from "lucide-solid";

export default function Header() {
  return (
    <header class="fixed top-0 right-0 left-0 z-40 flex h-15 bg-main-light dark:bg-main-dark py-2 items-center justify-between px-5">
      <AppName />
      <div class="flex gap-4 items-center justify-between">
      <UpdateBadge />
        <A
          href="/search"
          class="hover:bg-main/10 flex flex-col items-center justify-center gap-2 transition-all duration-200"
        >
          <Search size={20} />
        </A>
        <ThemeBtn />
      </div>
    </header>
  );
}
