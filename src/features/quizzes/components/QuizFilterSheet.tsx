import { createMemo, createResource, For, Show } from "solid-js";
import { syncAndGetSections } from "../services/local/indexeddb/sections";
import {
  activeFilterCount,
  type QuizFilters,
} from "../services/local/indexeddb/quizFilters";

function Chip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="rounded-full border-2 px-3 py-1 text-xs font-bold whitespace-nowrap transition-all duration-150"
      classList={{
        "border-main bg-main text-white": props.active,
        "border-gray-200 bg-white text-gray-500 dark:border-lighter-dark-2 dark:bg-lighter-dark-1 dark:text-gray-300":
          !props.active,
      }}
    >
      {props.label}
    </button>
  );
}

export default function QuizFilterSheet(props: {
  subject: string;
  open: boolean;
  filters: QuizFilters;
  onChange: (next: QuizFilters) => void;
  onClose: () => void;
}) {
  const [sections] = createResource(() => props.subject, syncAndGetSections);

  const seasons = createMemo(() =>
    (sections() ?? [])
      .filter((s) => s.type === "season")
      .sort((a, b) => Number(a.value) - Number(b.value)),
  );
  const years = createMemo(() =>
    (sections() ?? [])
      .filter((s) => s.type === "year")
      .sort((a, b) => Number(b.value) - Number(a.value)),
  );

  // فصل/سنة: تعدد اختيار — الضغط على عنصر يضيفه/يشيله من القائمة.
  // "الكل" ما هو عنصر إضافي — هو حالة "القائمة فاضية"، وضغطه بيفضيها.
  const toggleSeason = (id: number) => {
    const current = props.filters.seasonIds ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    props.onChange({ ...props.filters, seasonIds: next });
  };
  const toggleYear = (id: number) => {
    const current = props.filters.yearIds ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    props.onChange({ ...props.filters, yearIds: next });
  };
  const clearSeasons = () => props.onChange({ ...props.filters, seasonIds: [] });
  const clearYears = () => props.onChange({ ...props.filters, yearIds: [] });

  const toggleFavorite = () =>
    props.onChange({ ...props.filters, favoriteOnly: !props.filters.favoriteOnly });
  const toggleWeak = () =>
    props.onChange({ ...props.filters, weakOnly: !props.filters.weakOnly });

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
        onClick={props.onClose}
      >
        <div
          dir="rtl"
          class="dark:bg-lighter-dark-1 w-full max-w-md rounded-t-3xl bg-white p-4 pb-6 animate-[fadeIn_.15s_ease-in-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="mb-3 flex items-center justify-between">
            <p class="text-sm font-bold dark:text-white">فلترة الأسئلة</p>
            <Show when={activeFilterCount(props.filters) > 0}>
              <button
                type="button"
                class="text-warn text-xs underline"
                onClick={() => props.onChange({})}
              >
                ✕ إعادة ضبط الكل
              </button>
            </Show>
          </div>

          <Show when={seasons().length > 0}>
            <div class="mb-1.5 flex items-center justify-between">
              <p class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                الفصل {(props.filters.seasonIds?.length ?? 0) > 0 && `(${props.filters.seasonIds!.length})`}
              </p>
            </div>
            <div class="mb-3 flex flex-wrap gap-1.5">
              <Chip
                label="الكل"
                active={!(props.filters.seasonIds?.length)}
                onClick={clearSeasons}
              />
              <For each={seasons()}>
                {(s) => (
                  <Chip
                    label={s.name}
                    active={!!props.filters.seasonIds?.includes(s.id)}
                    onClick={() => toggleSeason(s.id)}
                  />
                )}
              </For>
            </div>
          </Show>

          <Show when={years().length > 0}>
            <div class="mb-1.5 flex items-center justify-between">
              <p class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                السنة {(props.filters.yearIds?.length ?? 0) > 0 && `(${props.filters.yearIds!.length})`}
              </p>
            </div>
            <div class="mb-3 flex flex-wrap gap-1.5">
              <Chip
                label="الكل"
                active={!(props.filters.yearIds?.length)}
                onClick={clearYears}
              />
              <For each={years()}>
                {(y) => (
                  <Chip
                    label={y.name}
                    active={!!props.filters.yearIds?.includes(y.id)}
                    onClick={() => toggleYear(y.id)}
                  />
                )}
              </For>
            </div>
          </Show>

          <p class="mb-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            أخرى
          </p>
          <div class="flex flex-wrap gap-1.5">
            <Chip
              label="⭐ المفضلة فقط"
              active={!!props.filters.favoriteOnly}
              onClick={toggleFavorite}
            />
            <Chip
              label="⚠️ الأسئلة الصعبة فقط"
              active={!!props.filters.weakOnly}
              onClick={toggleWeak}
            />
          </div>
        </div>
      </div>
    </Show>
  );
}
