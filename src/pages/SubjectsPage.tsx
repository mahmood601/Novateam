import { getSubjectsOfflineFirst } from "../services/local/indexeddb";
import Box from "../components/Box";
import "../index.css";
import { inject } from "@vercel/analytics";
import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
} from "solid-js";
import { checkSubjectForUpdates } from "../services/questionUpdates";

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
        <div class="bg-rainbow-graident fixed z-[100] flex h-screen w-screen items-center justify-center">
          <div class="bg-main-light items-center flex h-fit w-11/12 flex-col rounded-md p-10 text-center">
            <p dir="rtl" class="text-main-dark mb-3 text-2xl font-bold">
                Nova App هو تطبيق اختبارات متقدم لطلاب الطب في جامعة
              طرطوس مدعم بميزات تسهل الدراسة{" "}
            </p>
            <div class=" p-2 flex w-fit flex-row-reverse items-center justify-center gap-2 rounded-md bg-darker-light-1">
              <label dir="rtl" class="text-main-dark font-bold" for="year">
                اختر السنة:
              </label>
              <select
                dir="rtl"
                class="text-main-dark bg-transparent border-main-dark rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-main"
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
      <div
        class="dark:bg-main-dark bg-main-light relative flex flex-wrap items-center justify-center gap-5 py-22"
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
              <Box subject={subject.id} info={subject.name} link={subject.id} />
            )}
          </For>
        </Show>
      </div>
    </Show>
  );
}
