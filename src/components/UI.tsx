import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import Box from "./Box";
import "../index.css";
import subjects from "./subjects";
import { inject } from "@vercel/analytics";
import years from "./years";

export default function UI() {
  inject();

  const [year, setYear] = createSignal<"second" | "third" | "fourth" | "">("");

  onMount(() => {
    if (localStorage.getItem("year")) {
      setYear(localStorage.year);
    }
  });

  return (
    <Show
      when={year() != ""}
      fallback={
        <div class="bg-rainbow-graident fixed z-[100] flex h-screen w-screen items-center justify-center">
          <div class="bg-main-dark flex h-fit w-fit flex-col rounded-md p-10 text-center">
            <label class="text-main-light" for="year">
              اختر السنة
            </label>
            <select
            value={year()}
              onInput={(e) => {
                setYear(e.target.value);
                localStorage.setItem('year', year())
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
