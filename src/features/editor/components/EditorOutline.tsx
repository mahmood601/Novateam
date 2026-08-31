import { For, Show } from "solid-js";
import type { NovaDocument } from "../types/novaAst";
import { novaColorHex } from "../lib/novaColors";

export function EditorOutline(props: { document?: NovaDocument }) {
  return (
    <aside
      class="
        hidden w-64 shrink-0
        border-e border-slate-200
        bg-slate-50
        dark:border-slate-800
        dark:bg-slate-950
        md:block
      "
    >
      <div class="flex h-full flex-col">
        <div class="flex h-12 items-center px-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
            محتويات المحاضرة
          </span>
        </div>

        <nav dir="rtl" class="flex-1 overflow-y-auto px-2">
          <Show
            when={props.document && props.document.sections.length > 0}
            fallback={
              <p class="px-3 py-2 text-sm text-slate-400">
                لا يوجد محتوى بعد
              </p>
            }
          >
            <For each={props.document!.sections}>
              {(section) => (
                <a
                  href={`#section-${sectionAnchor(section.heading)}`}
                  class="
                    group flex w-full items-center gap-3
                    rounded-lg px-3 py-2
                    text-start text-sm
                    text-slate-600
                    transition
                    hover:bg-slate-200/70
                    hover:text-slate-900
                    dark:text-slate-400
                    dark:hover:bg-slate-900
                    dark:hover:text-white
                  "
                >
                  <span
                    class="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ "background-color": novaColorHex(section.color) }}
                  />
                  <span class="truncate">
                    {plainHeadingText(section.heading)}
                  </span>
                </a>
              )}
            </For>
          </Show>
        </nav>
      </div>
    </aside>
  );
}

function plainHeadingText(heading: NovaDocument["sections"][number]["heading"]): string {
  return heading.children
    .map((child) => ("value" in child ? child.value : ""))
    .join("");
}

function sectionAnchor(heading: NovaDocument["sections"][number]["heading"]): string {
  return plainHeadingText(heading)
    .trim()
    .replace(/\s+/g, "-");
}
