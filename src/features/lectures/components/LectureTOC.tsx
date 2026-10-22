import {
  For,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
} from "solid-js";
import { ChevronDown } from "lucide-solid";
import type { LectureTocEntry } from "../lib/lectureContentHtml";

interface Props {
  entries: LectureTocEntry[];
}

// Distance (px) from the scroller's top edge at which a heading counts
// as "current" while scrolling.
const ACTIVE_OFFSET = 96;

// Gap (px) left between the scroller's top edge and the heading we jump to.
const TARGET_GAP = 16;
// Fallback if the browser doesn't fire `scrollend` (older Safari/Firefox).
const SETTLE_FALLBACK_MS = 800;

export default function LectureTOC(props: Props) {
  const [activeId, setActiveId] = createSignal<string>("");
  const [open, setOpen] = createSignal(false);

  // While a TOC-initiated smooth scroll is running, the scroll-spy must not
  // overwrite the clicked entry with the headings it passes on the way.
  let navLock = false;
  let cancelSettle: (() => void) | undefined;
  onCleanup(() => cancelSettle?.());

  const activeText = () =>
    props.entries.find((e) => e.id === activeId())?.text ??
    props.entries[0]?.text ??
    "";

  // Scroll-spy: the lecture scrolls inside `.lecture-content`, not the
  // window, so listen on that element and compare heading positions
  // against its top edge.
  createEffect(
    on(
      () => props.entries,
      (entries) => {
        if (entries.length === 0) {
          setActiveId("");
          return;
        }
        const scroller = document.querySelector<HTMLElement>(".lecture-content");
        if (!scroller) return;

        let frame = 0;
        const update = () => {
          frame = 0;
          if (navLock) return;
          const top = scroller.getBoundingClientRect().top;
          const atBottom =
            scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
          let current = entries[0].id;
          if (atBottom) {
            current = entries[entries.length - 1].id;
          } else {
            for (const entry of entries) {
              const el = document.getElementById(entry.id);
              if (!el) continue;
              if (el.getBoundingClientRect().top - top <= ACTIVE_OFFSET) {
                current = entry.id;
              } else break;
            }
          }
          setActiveId(current);
        };
        const onScroll = () => {
          if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        scroller.addEventListener("scroll", onScroll, { passive: true });
        onCleanup(() => {
          scroller.removeEventListener("scroll", onScroll);
          if (frame) cancelAnimationFrame(frame);
        });
      },
    ),
  );

  // scrollTop that puts `el` TARGET_GAP px below the scroller's top edge.
  const targetTop = (scroller: HTMLElement, el: HTMLElement) =>
    scroller.scrollTop +
    el.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top -
    TARGET_GAP;

  // Scrolls `.lecture-content` itself (not every ancestor, as scrollIntoView
  // does), then re-checks once the animation ends: images / diagrams
  // above the heading may have changed height meanwhile and moved the target.
  const goTo = (id: string) => {
    setOpen(false);
    const scroller = document.querySelector<HTMLElement>(".lecture-content");
    const target = document.getElementById(id);
    if (!scroller || !target) return;

    cancelSettle?.();
    setActiveId(id);
    navLock = true;
    scroller.scrollTo({
      top: Math.max(0, targetTop(scroller, target)),
      behavior: "smooth",
    });

    let timer: number | undefined;
    const settle = () => {
      cancelSettle?.();
      const el = document.getElementById(id);
      if (el) {
        const diff = targetTop(scroller, el) - scroller.scrollTop;
        if (Math.abs(diff) > 2) {
          scroller.scrollTo({ top: scroller.scrollTop + diff, behavior: "auto" });
        }
      }
    };
    cancelSettle = () => {
      scroller.removeEventListener("scrollend", settle);
      if (timer) window.clearTimeout(timer);
      timer = undefined;
      cancelSettle = undefined;
      navLock = false;
    };
    scroller.addEventListener("scrollend", settle, { once: true });
    timer = window.setTimeout(settle, SETTLE_FALLBACK_MS);
  };

  const list = () => (
    <ul class="flex flex-col">
      <For each={props.entries}>
        {(entry) => (
          <li>
            <button
              type="button"
              onClick={() => goTo(entry.id)}
              aria-current={activeId() === entry.id ? "location" : undefined}
              class={`lecture-toc-link ${
                entry.level === 2 ? "lecture-toc-link--level-2" : ""
              } ${activeId() === entry.id ? "lecture-toc-link--active" : ""}`}
            >
              {entry.text}
            </button>
          </li>
        )}
      </For>
    </ul>
  );

  return (
    <Show when={props.entries.length > 0}>
      {/* Mobile / tablet: sticky bar showing the current section, opens a dropdown */}
      <div class="lecture-toc-mobile lg:hidden" dir="rtl">
        <button
          type="button"
          class="lecture-toc-mobile__bar"
          aria-expanded={open()}
          onClick={() => setOpen(!open())}
        >
          <span class="truncate">{activeText()}</span>
          <ChevronDown
            size={18}
            class={`shrink-0 transition-transform ${open() ? "rotate-180" : ""}`}
          />
        </button>
        <Show when={open()}>
          <div class="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <nav aria-label="فهرس المحتويات" class="lecture-toc-mobile__panel">
            {list()}
          </nav>
        </Show>
      </div>

      {/* Desktop: fixed column beside the content */}
      <nav
        dir="rtl"
        aria-label="فهرس المحتويات"
        class="lecture-toc-desktop hidden lg:block"
      >
        <p class="mb-2 px-3 text-sm font-bold opacity-80">محتويات المحاضرة</p>
        {list()}
      </nav>
    </Show>
  );
}