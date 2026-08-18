import { createResource, createSignal, For, Show } from "solid-js";
import { getSubjectsOfflineFirst } from "../../../services/local/indexeddb";

const YEARS = [
  { id: "second", name: "الثانية" },
  { id: "third", name: "الثالثة" },
  { id: "fourth", name: "الرابعة" },
  { id: "fifth", name: "الخامسة" },
];

export function SubjectPicker(props: { onSelect: (subjectId: string) => void }) {
  const [yearKey, setYearKey] = createSignal<string>("second");
  const [subjects] = createResource(() => yearKey(), (year) => getSubjectsOfflineFirst(year));

  return (
    <div class="h-screen bg-[#f8fafc] px-5 pt-22 dark:bg-[#0f172a]" dir="rtl">
      <div class="mx-auto max-w-lg pb-22">
        <div class="mb-8 text-center">
          <div class="mb-3 flex justify-center">
            <span class="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 text-3xl shadow-lg">
              🎛️
            </span>
          </div>
          <h1 class="text-2xl font-black text-slate-800 dark:text-white">لوحة الإدارة</h1>
          <p class="mt-1 text-sm text-slate-400">اختر المادة التي تريد إدارتها</p>
        </div>

        <div class="mb-4 rounded-[2rem] bg-white p-4 shadow-sm dark:bg-slate-800">
          <p class="mb-3 text-xs font-bold text-slate-400">📅 السنة الدراسية</p>
          <div class="flex flex-wrap gap-2 justify-around">
            <For each={YEARS}>
              {(y) => (
                <button
                  onClick={() => setYearKey(y.id)}
                  class={`rounded-2xl p-2 w-17 text-sm font-bold transition-all ${
                    yearKey() === y.id
                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {y.name}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="rounded-[2rem] bg-white p-4 shadow-sm dark:bg-slate-800">
          <p class="mb-3 text-xs font-bold text-slate-400">📚 المواد</p>
          <Show
            when={!subjects.loading}
            fallback={<div class="animate-pulse py-8 text-center text-slate-400">جاري التحميل... ⏳</div>}
          >
            <Show
              when={(subjects() ?? []).length > 0}
              fallback={<p class="py-8 text-center text-slate-400">لا توجد مواد لهذه السنة 📭</p>}
            >
              <div class="grid gap-2">
                <For each={subjects()}>
                  {(sub) => (
                    <button
                      onClick={() => props.onSelect(sub.id)}
                      class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-cyan-700 dark:hover:bg-cyan-900/20"
                    >
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-black text-white shadow-sm">
                        {sub.name.charAt(0)}
                      </span>
                      <div class="flex-1">
                        <p class="font-bold text-slate-700 dark:text-slate-200">{sub.name}</p>
                        <p class="text-[11px] text-slate-400">{sub.id}</p>
                      </div>
                      <span class="text-slate-300 dark:text-slate-600">←</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
