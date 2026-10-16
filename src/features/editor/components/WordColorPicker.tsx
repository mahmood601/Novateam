// features/editor/components/WordColorPicker.tsx
//
// MS Word-style color picker (theme colors with lighter/darker degrees,
// white + black columns, standard colors, custom color). Deliberately
// independent from the Nova brand palette (lib/novaColors.ts) — use this
// one for shape/box/cell backgrounds, borders, text color and highlight.
//
// Mobile-first: the 9-column grid is fluid (each swatch is a square that
// fills 1/9 of the available width, ~30px on a 360px phone) and only
// gets a max-width cap on larger screens.

import { Check, X } from "lucide-solid";
import { For, Show } from "solid-js";
import {
  WORD_STANDARD_COLORS,
  WORD_THEME_ROWS,
  isLightColor,
  normalizeHex,
  type WordSwatch,
} from "../lib/wordColors";

export default function WordColorPicker(props: {
  /** Current value (any CSS color string); null = nothing set. */
  current: string | null;
  /** Label of the "no color" row, e.g. "بلا لون" / "افتراضي". */
  resetLabel: string;
  /** Called with a #RRGGBB value, or null for the reset row. */
  onSelect: (value: string | null) => void;
  /** Hide the reset row (e.g. when a value is always required). */
  hideReset?: boolean;
}) {
  const selected = () => normalizeHex(props.current);

  return (
    <div class="word-color-picker mx-auto flex w-full max-w-sm flex-col gap-3 px-1 py-2">
      <Show when={!props.hideReset}>
        <button
          type="button"
          class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex min-h-11 touch-manipulation items-center gap-3 rounded px-2 py-2 text-sm"
          onClick={() => props.onSelect(null)}
        >
          <span class="border-darker-light-2 dark:border-lighter-dark-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
            <X size={12} style={{ color: "var(--muted-foreground)" }} />
          </span>
          <span class="flex-1 text-right">{props.resetLabel}</span>
          <Show when={props.current === null}>
            <Check size={16} style={{ color: "var(--color-main)" }} />
          </Show>
        </button>
      </Show>

      <Section title="ألوان النسق">
        <div class="grid grid-cols-9 gap-1">
          <For each={WORD_THEME_ROWS}>
            {(row, rowIndex) => (
              <For each={row}>
                {(swatch) => (
                  <Swatch
                    swatch={swatch}
                    active={selected() === swatch.value}
                    // Word separates the base row from its degrees.
                    class={rowIndex() === 0 ? "mb-1" : ""}
                    onSelect={props.onSelect}
                  />
                )}
              </For>
            )}
          </For>
        </div>
      </Section>

      <Section title="ألوان قياسية">
        <div class="grid grid-cols-10 gap-1">
          <For each={WORD_STANDARD_COLORS}>
            {(swatch) => (
              <Swatch
                swatch={swatch}
                active={selected() === swatch.value}
                onSelect={props.onSelect}
              />
            )}
          </For>
        </div>
      </Section>

      {/* Anything not in the grid: native picker, still applies on pick. */}
      <label class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex min-h-11 cursor-pointer touch-manipulation items-center gap-3 rounded px-2 py-2 text-sm">
        <span
          class="border-darker-light-2 dark:border-lighter-dark-2 h-6 w-6 shrink-0 rounded-full border"
          style={{
            background:
              "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
        />
        <span class="flex-1 text-right">المزيد من الألوان</span>
        <input
          type="color"
          class="sr-only"
          value={selected() ?? "#000000"}
          onChange={(e) => props.onSelect(e.currentTarget.value.toUpperCase())}
        />
      </label>
    </div>
  );
}

function Section(props: { title: string; children: any }) {
  return (
    <div>
      <div
        class="mb-1.5 px-1 text-xs font-bold"
        style={{ color: "var(--muted-foreground)" }}
      >
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

function Swatch(props: {
  swatch: WordSwatch;
  active: boolean;
  class?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      title={props.swatch.label}
      aria-label={props.swatch.label}
      aria-pressed={props.active}
      class={`border-darker-light-2 dark:border-lighter-dark-2 relative aspect-square w-full touch-manipulation rounded-sm border active:scale-90 ${props.class ?? ""}`}
      classList={{
        "ring-2 ring-offset-1 z-10": props.active,
      }}
      style={{
        "background-color": props.swatch.value,
        // ring color follows the app accent so it works in light + dark
        "--tw-ring-color": "var(--color-main)",
      }}
      onClick={() => props.onSelect(props.swatch.value)}
    >
      <Show when={props.active}>
        <Check
          size={14}
          class="absolute inset-0 m-auto"
          style={{ color: isLightColor(props.swatch.value) ? "#000" : "#fff" }}
        />
      </Show>
    </button>
  );
}