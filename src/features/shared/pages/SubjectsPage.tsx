import { getSubjectsOfflineFirst } from "../../quizzes/services/local/indexeddb";
import Box from "../components/Box";
import "@/styles/index.css";
import { inject } from "@vercel/analytics";
import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
} from "solid-js";
import { checkSubjectForUpdates } from "../../quizzes/services/questionUpdates";

export default function SubjectsPage() {
  inject();

  const [yearKey, setYearKey] = createSignal<string | null>(
    localStorage.getItem("year"),
  );

  // offline-first: IDB أولاً، Supabase في الخلفية
  const years = [
    {
      id: "second",
      name: "الثانية",
    },
    {
      id: "third",
      name: "الثالثة",
    },
    {
      id: "fourth",
      name: "الرابعة",
    },
    {
      id: "fifth",
      name: "الخامسة",
    },
  ];

  const [yearSubjects] = createResource(
    () => yearKey(),
    async (year) => {
      if (!year) return [];
      return getSubjectsOfflineFirst(year);
    },
  );

  createEffect(() => {
    // ينتظر حتى يكتمل الـ resource ويكون فيه بيانات
    if (!yearSubjects.loading && (yearSubjects()?.length ?? 0) > 0) {
      for (const sub of yearSubjects()!) {
        checkSubjectForUpdates(sub.id, sub.name);
      }
    }
  });

  return (
    <Show
      when={yearKey()}
      fallback={
        <div class="bg-rainbow-graident fixed z-100 flex h-screen w-screen items-center justify-center">
          <div class="bg-main-light flex h-fit w-11/12 flex-col items-center rounded-md p-10 text-center">
            <div class="bg-darker-light-1 flex w-fit flex-row-reverse items-center justify-center gap-2 rounded-md p-2">
              <label dir="rtl" class="text-main-dark font-bold" for="year">
                اختر السنة:
              </label>
              <select
                dir="rtl"
                class="text-main-dark border-main-dark focus:ring-main rounded-md bg-transparent p-2 focus:ring-2 focus:outline-none"
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
                <For each={years}>
                  {(year) => (
                    <option value={year.id} class="text-main-dark bg-white">
                      {year.name}
                    </option>
                  )}
                </For>
              </select>
            </div>
          </div>
        </div>
      }
    >
      <div class="dark:bg-main-dark bg-darker-light-1 flex h-dvh flex-col overflow-hidden px-5 pt-18">
        <div
          class="dark:bg-main-dark bg-darker-light-1 mb-24 flex flex-wrap p-2 items-center justify-center gap-4 overflow-y-auto"
          dir="rtl"
        >
          <Show
            when={!yearSubjects.loading && (yearSubjects()?.length ?? 0) > 0}
            fallback={
              <div class="py-10 text-center text-gray-400">
                لا توجد مواد مسجلة لهذه السنة في قاعدة البيانات المحلية.
              </div>
            }
          >
            <For each={yearSubjects()}>
              {(subject) => (
                <Box
                  subject={subject.id}
                  info={subject.name}
                  link={subject.id}
                />
              )}
            </For>
          </Show>
        </div>
      </div>
    </Show>
  );
}
