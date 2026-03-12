import {
  getYearsOfflineFirst,
  getSubjectsOfflineFirst,
} from "../services/local/indexeddb";
import Box from "../components/Box";
import "../index.css";
import { inject } from "@vercel/analytics";
import { createResource, createSignal, For, Show } from "solid-js";

export default function SubjectsPage() {
  inject();

  const [yearKey, setYearKey] = createSignal<string | null>(
    localStorage.getItem("year"),
  );

  // offline-first: IDB أولاً، Supabase في الخلفية
  const [years] = createResource(getYearsOfflineFirst);
  const [allSubjects] = createResource(getSubjectsOfflineFirst);

  const currentYear = () => years()?.find((y) => y.id === yearKey());

  // خريطة سريعة: id → name
  const subjectMap = () => {
    const map: Record<string, string> = {};
    allSubjects()?.forEach((s) => (map[s.id] = s.name));
    return map;
  };

  return (
    <Show
      when={yearKey()}
      fallback={
        <div class="bg-rainbow-graident fixed z-[100] flex h-screen w-screen items-center justify-center">
          <div class="bg-main-dark flex h-fit w-fit flex-col rounded-md p-10 text-center">
            <label class="text-main-light mb-2 block" for="year">
              اختر السنة
            </label>
            <Show
              when={!years.loading}
              fallback={<p class="text-main-light">جار التحميل...</p>}
            >
              <select
                class="text-main-light bg-transparent"
                id="year"
                onInput={(e) => {
                  const val = e.currentTarget.value;
                  setYearKey(val);
                  localStorage.setItem("year", val);
                }}
              >
                <option value="" disabled selected>
                  اختر...
                </option>
                <For each={years()}>
                  {(year) => (
                    <option value={year.id} class="text-main-dark bg-white">
                      {year.name}
                    </option>
                  )}
                </For>
              </select>
            </Show>
          </div>
        </div>
      }
    >
      <div class="dark:bg-main-dark bg-main-light relative py-22 flex flex-wrap items-center justify-center gap-5">
        <Show
          when={!years.loading}
          fallback={<p class="py-10 text-center">جار التحميل...</p>}
        >
          <For each={currentYear()?.subjects}>
            {(subjectId) => (
              <Box
                subject={subjectId}
                info={subjectMap()[subjectId] ?? subjectId}
                link={subjectId}
              />
            )}
          </For>
        </Show>
      </div>
    </Show>
  );
}
