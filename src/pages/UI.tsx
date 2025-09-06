import { createSignal, For, onMount, Show } from "solid-js";
import Box from "../components/Box";
import "../index.css";
import subjects from "../components/subjects";
import { inject } from "@vercel/analytics";
import years from "../components/years";
import { YearKey } from "../types/years";


export default function UI() {
  inject(); // vercel analytics
  
  
  const [year, setYear] = createSignal<YearKey | null>(null);

  onMount(() => {
    const storedYear = localStorage.getItem("year") as YearKey | null
    if (storedYear) {
      setYear(storedYear)
    }
  });

  return (
    <Show
      when={year()}
      fallback={
        <div class="bg-rainbow-graident fixed z-[100] flex h-screen w-screen items-center justify-center">
          <div class="bg-main-dark flex h-fit w-fit flex-col rounded-md p-10 text-center">
            <label class="text-main-light" for="year">
              اختر السنة
            </label>
            <select
            value={year() as string}
              onInput={(e) => {
                const newYear = e.currentTarget.value as YearKey 
                setYear(newYear);
                localStorage.setItem('year', newYear)
              }}
              class="text-main-light"
              id="year"
            >
              <For each={Object.entries(years)}>
                {(year, index) => (
                  <option value={year[0]} class="text-main-dark">
                    {Object.values(years).at(index())?.name}
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>
      }
    >
      <div class="bg-main-light dark:bg-main-dark shrink-1 overflow-x-hidden pt-10">
        <div class="flex h-full w-full justify-center overflow-hidden">
          <div class="h-10/12 w-5/6 overflow-y-scroll">
            <For each={years[year()]?.subjects}>
              {(subject) => (
                <Box
                  subject={subject}
                  info={subjects[subject].name}
                  link={`${subject}`}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
}
