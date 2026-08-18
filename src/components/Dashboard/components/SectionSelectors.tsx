import { For } from "solid-js";
import type { Section } from "../../../services/documentsManipulation";

export function SectionSelectors(props: {
  sections: Section[];
  seasonId: number | null;
  yearId: number | null;
  onSeasonChange: (id: number) => void;
  onYearChange: (id: number) => void;
}) {
  const seasons = () =>
    props.sections.filter((s) => s.type === "season").sort((a, b) => +a.value - +b.value);
  const years = () =>
    props.sections.filter((s) => s.type === "year").sort((a, b) => +b.value - +a.value);

  return (
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-bold text-slate-600 dark:text-slate-400">
          الفصل
        </label>
        <select
          class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
          onChange={(e) => props.onSeasonChange(Number(e.currentTarget.value))}
        >
          <option value="">اختر...</option>
          <For each={seasons()}>
            {(s) => (
              <option value={s.id} selected={props.seasonId === s.id}>
                {s.name}
              </option>
            )}
          </For>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-bold text-slate-600 dark:text-slate-400">
          السنة
        </label>
        <select
          class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
          onChange={(e) => props.onYearChange(Number(e.currentTarget.value))}
        >
          <option value="">اختر...</option>
          <For each={years()}>
            {(y) => (
              <option value={y.id} selected={props.yearId === y.id}>
                {y.name}
              </option>
            )}
          </For>
        </select>
      </div>
    </div>
  );
}
