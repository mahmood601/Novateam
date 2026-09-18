import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { ChevronLeft } from "lucide-solid";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function LectureBreadcrumb(props: Props) {
  return (
    <nav dir="rtl" class="text-main" aria-label="مسار التصفح" class="lecture-breadcrumb">
      <For each={props.items}>
        {(item, index) => (
          <>
            <Show when={index() > 0}>
              <ChevronLeft size={16}/>
            </Show>
            <Show
              when={item.href}
              fallback={<span class="lecture-breadcrumb__current">{item.label}</span>}
            >
              <A href={item.href!} class="lecture-breadcrumb__link">
                {item.label}
              </A>
            </Show>
          </>
        )}
      </For>
    </nav>
  );
}