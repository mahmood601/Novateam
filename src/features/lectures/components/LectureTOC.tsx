import { For, Show } from "solid-js";
import type { LectureTocEntry } from "../lib/lectureContentHtml";

interface Props {
  entries: LectureTocEntry[];
}

export default function LectureTOC(props: Props) {
  return (
    <nav dir="rtl" aria-label="فهرس المحتويات">
      <p class="mb-2 px-1 text-sm font-bold opacity-80">محتويات المحاضرة</p>

      <Show
        when={props.entries.length > 0}
        fallback={<p class="px-1 text-sm opacity-60">لا يوجد عناوين بهذه المحاضرة</p>}
      >
        <ul>
          <For each={props.entries}>
            {(entry) => (
              <li>
                <a
                  href={`#${entry.id}`}
                  class={`lecture-toc-link ${
                    entry.level === 2 ? "lecture-toc-link--level-2" : ""
                  }`}
                >
                  {entry.text}
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </nav>
  );
}
