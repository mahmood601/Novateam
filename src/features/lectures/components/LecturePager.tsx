import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { ChevronLeft, ChevronRight } from "lucide-solid";

export interface PagerLink {
  href: string;
  title: string;
}

interface Props {
  prev?: PagerLink;
  next?: PagerLink;
}

// RTL: the first flex child sits on the right, so "previous" goes first.
export default function LecturePager(props: Props) {
  return (
    <nav dir="rtl" aria-label="التنقل بين المحاضرات" class="lecture-pager">
      <Show when={props.prev} fallback={<span />}>
        {(prev) => (
          <A href={prev().href} class="lecture-pager__card">
            <span class="lecture-pager__label">
              <ChevronRight size={16} /> السابقة
            </span>
            <span class="lecture-pager__title">{prev().title}</span>
          </A>
        )}
      </Show>
      <Show when={props.next} fallback={<span />}>
        {(next) => (
          <A href={next().href} class="lecture-pager__card lecture-pager__card--next">
            <span class="lecture-pager__label">
              التالية <ChevronLeft size={16} />
            </span>
            <span class="lecture-pager__title">{next().title}</span>
          </A>
        )}
      </Show>
    </nav>
  );
}
