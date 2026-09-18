import { createResource, createSignal, For, Show } from "solid-js";
import { getSubjectsOfflineFirst } from "../../quizzes/services/local/indexeddb";
import { A } from "@solidjs/router";

const YEARS = [
  { id: "second", name: "الثانية" },
  { id: "third", name: "الثالثة" },
  { id: "fourth", name: "الرابعة" },
  { id: "fifth", name: "الخامسة" },
];

export default function Dashboard() {
  const [yearKey, setYearKey] = createSignal<string>("second");
  const [subjects] = createResource(
    () => yearKey(),
    (year) => getSubjectsOfflineFirst(year),
  );

  return (
    <div class="h-dvh bg-[#f8fafc] px-5 dark:bg-[#0f172a]" dir="rtl">
      {/* أضفنا mx-auto لضبط المحاذاة */}
      <div class="mx-auto flex h-full max-w-lg flex-col overflow-hidden pt-22 pb-22">
        
        {/* شريط اختيار السنة */}
        <div class="mb-4 shrink-0 rounded-4xl bg-white p-4 shadow-sm dark:bg-slate-800">
          <p class="mb-3 text-xs font-bold text-slate-400">📅 السنة الدراسية</p>
          <div class="flex flex-wrap justify-around gap-1">
            <For each={YEARS}>
              {(y) => (
                <button
                  onClick={() => setYearKey(y.id)}
                  class={`w-15 rounded-2xl p-2 text-xs font-bold transition-all ${
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

        {/* بطاقة المواد: overflow-hidden هنا لمنع انكسار الحواف المنحنية rounded-4xl */}
        <div class="flex flex-1 min-h-0 flex-col overflow-hidden rounded-4xl bg-white p-4 shadow-sm dark:bg-slate-800">
          <p class="mb-3 shrink-0 text-xs font-bold text-slate-400">
            📚 المواد
          </p>
          
          <Show
            when={!subjects.loading}
            fallback={
              <div class="animate-pulse py-8 text-center text-slate-400">
                جاري التحميل... ⏳
              </div>
            }
          >
            <Show
              when={(subjects() ?? []).length > 0}
              fallback={
                <p class="py-8 text-center text-slate-400">
                  لا توجد مواد لهذه السنة 📭
                </p>
              }
            >
              {/* التعديل الجوهري: نقل overflow-y-auto إلى الحاوية المباشرة لعناصر قائمة SolidJS */}
              <div class="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto pl-1">
                <For each={subjects()}>
                  {(sub) => (
                    <A
                      href={`/dashboard/${sub.id}`}
                      class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-cyan-700 dark:hover:bg-cyan-900/20"
                    >
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-black text-white shadow-sm">
                        {sub.name.charAt(0)}
                      </span>
                      <div class="flex-1">
                        <p class="font-bold text-slate-700 dark:text-slate-200">
                          {sub.name}
                        </p>
                        <p class="text-[11px] text-slate-400">{sub.id}</p>
                      </div>
                      <span class="text-slate-300 dark:text-slate-600">←</span>
                    </A>
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