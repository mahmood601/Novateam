import { ArrowLeft, ArrowRight, X } from "lucide-solid";
import { createEffect, createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

export type MenuSheetItem = {
  id: string;
  label: string;
  icon: any;
  /** Sub-panel component. Receives onDone() to close the whole sheet. */
  panel?: (props: { onDone: () => void }) => any;
  /** Leaf action — runs immediately and closes the sheet. */
  onClick?: () => void;
};

export default function MenuSheet(props: {
  title: string;
  onClose: () => void;
  items: MenuSheetItem[];
}) {
  const [activeId, setActiveId] = createSignal<string | null>(null);

  let wrapperRef: HTMLDivElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  let leafRef: HTMLDivElement | undefined;

  createEffect(() => {
    const el = activeId() ? leafRef : rootRef;
    if (el && wrapperRef) {
      wrapperRef.style.height = `${el.offsetHeight}px`;
    }
  });

  const activeItem = () => props.items.find((item) => item.id === activeId());

  return (
    <div
      ref={wrapperRef}
      class="sheet-wrapper grow shrink-0"
      style={{
        transition: "height 0.25s ease",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <div
        class="sheet-track "
        style={{
          display: "flex",
          width: "200%",
          transform: activeId() === null ? "translateX(0%)" : "translateX(50%)",
          transition: "transform 0.25s ease",
        }}
      >
        {/* Root list */}
        <div ref={rootRef} class="sheet-panel flex w-full flex-col gap-1 p-2  max-h-[40vh]">
          <div class="border-b-darker-light-1 dark:border-b-lighter-dark-2 flex items-center justify-between border-b-2 px-3 py-2">
            <span>{props.title}</span>
            <X class="cursor-pointer" onClick={() => props.onClose()} />
          </div>
          <div class="overflow-y-scroll">
            <For each={props.items}>
              {(item) => (
                <button
                  type="button"
                  class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex w-full items-center gap-3 rounded px-3 py-2 text-sm"
                  onClick={() => {
                    if (item.panel) {
                      setActiveId(item.id);
                    } else {
                      item.onClick?.();
                      props.onClose();
                    }
                  }}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Sub-panel */}
        <div ref={leafRef} class="sheet-panel w-full p-2">
          <Show when={activeItem()}>
            <button
              type="button"
              class="border-b-darker-light-1 dark:border-b-lighter-dark-2 flex w-full items-center justify-between gap-2 border-b-2 px-3 py-2"

              onClick={() => setActiveId(null)}
            >
              <ArrowRight size={18} />
              <span class="flex-1 text-right">{activeItem()!.label}</span>
            </button>
            <div class="overflow-y-hidden py-2">
              <Dynamic
                component={activeItem()!.panel}
                onDone={() => {
                  setActiveId(null);
                  props.onClose();
                }}
              />
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
