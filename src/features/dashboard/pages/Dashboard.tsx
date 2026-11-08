import { createResource, createSignal, For, Show } from "solid-js";
import { getSubjectsOfflineFirst } from "../../quizzes/services/local/indexeddb";
import { A } from "@solidjs/router";
import { useUser } from "../../shared/context/user";

const YEARS = [
  { id: "second", name: "الثانية" },
  { id: "third", name: "الثالثة" },
  { id: "fourth", name: "الرابعة" },
  { id: "fifth", name: "الخامسة" },
];

export default function Dashboard() {
  const { can, canAny } = useUser();
  const [yearKey, setYearKey] = createSignal<string>("second");
  const [subjects] = createResource(
    () => yearKey(),
    (year) => getSubjectsOfflineFirst(year),
  );

  // Only subjects where I hold a quiz or lecture grant (super-admin sees all)
  const visible = () =>
    (subjects() ?? []).filter(
      (s) => can("quiz", s.id) || can("lecture", s.id),
    );

  return (
    <div class="h-dvh bg-base-light px-5 dark:bg-base-dark" dir="rtl">
      {/* أضفنا mx-auto لضبط المحاذاة */}
      <div class="mx-auto flex h-full max-w-lg flex-col overflow-hidden pt-22 pb-22">
        
        <Show when={canAny("subjects", "manage")}>
          <A
            href="/dashboard/manage"
            class="mb-4 flex shrink-0 items-center gap-3 rounded-4xl bg-gradient-to-r from-cyan-400 to-blue-500 p-4 text-white shadow-md"
          >
            <span class="text-2xl">🛠️</span>
            <span class="flex-1 font-bold">إدارة المواد والأقسام</span>
            <span>←</span>
          </A>
        </Show>

        <Show when={canAny("admins", "manage")}>
          <A
            href="/dashboard/admins"
            class="mb-4 flex shrink-0 items-center gap-3 rounded-4xl bg-gradient-to-r from-fuchsia-400 to-purple-500 p-4 text-white shadow-md"
          >
            <span class="text-2xl">👥</span>
            <span class="flex-1 font-bold">إدارة الأدمنز والصلاحيات</span>
            <span>←</span>
          </A>
        </Show>

        {/* شريط اختيار السنة */}
        <div class="mb-4 shrink-0 rounded-4xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
          <p class="mb-3 text-xs font-bold text-ink-muted-light">📅 السنة الدراسية</p>
          <div class="flex flex-wrap justify-around gap-1">
            <For each={YEARS}>
              {(y) => (
                <button
                  onClick={() => setYearKey(y.id)}
                  class={`w-15 rounded-2xl p-2 text-xs font-bold transition-all ${
                    yearKey() === y.id
                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                      : "bg-chip-light text-ink-soft-light hover:bg-darker-light-2 dark:bg-chip-dark dark:text-ink-soft-dark"
                  }`}
                >
                  {y.name}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* بطاقة المواد: overflow-hidden هنا لمنع انكسار الحواف المنحنية rounded-4xl */}
        <div class="flex flex-1 min-h-0 flex-col overflow-hidden rounded-4xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
          <p class="mb-3 shrink-0 text-xs font-bold text-ink-muted-light">
            📚 المواد
          </p>
          
          <Show
            when={!subjects.loading}
            fallback={
              <div class="animate-pulse py-8 text-center text-ink-muted-light">
                جاري التحميل... ⏳
              </div>
            }
          >
            <Show
              when={visible().length > 0}
              fallback={
                <p class="py-8 text-center text-ink-muted-light">
                  {(subjects() ?? []).length > 0
                    ? "لم تُمنح صلاحية على مواد هذه السنة بعد 🔒"
                    : "لا توجد مواد لهذه السنة 📭"}
                </p>
              }
            >
              {/* التعديل الجوهري: نقل overflow-y-auto إلى الحاوية المباشرة لعناصر قائمة SolidJS */}
              <div class="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto pl-1">
                <For each={visible()}>
                  {(sub) => (
                    <A
                      href={`/dashboard/${sub.id}`}
                      class="flex items-center gap-3 rounded-2xl border border-line-light bg-base-light p-4 text-right transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:shadow-sm dark:border-line-dark dark:bg-base-dark dark:hover:border-cyan-700 dark:hover:bg-cyan-900/20"
                    >
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-black text-white shadow-sm">
                        {sub.name.charAt(0)}
                      </span>
                      <div class="flex-1">
                        <p class="font-bold text-ink-light dark:text-ink-dark">
                          {sub.name}
                        </p>
                        <p class="text-[11px] text-ink-muted-light">{sub.id}</p>
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