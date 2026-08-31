import { createResource, For, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { getSeasonsFromRemote } from "../../quizzes/services/documentsManipulation";

export default function LectureEditor() {
  const subjectId = useParams().subject!;
  const [seasons] = createResource(() => getSeasonsFromRemote(subjectId));

  return (
    <div
      class="mt-20 flex items-center pr-6 pb-22 text-right transition-all"
      dir="rtl"
    >
      <div class="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <Show
          when={seasons.loading}
          fallback={
            <Show
              when={(seasons() ?? []).length > 0}
              fallback={
                <div class="border-border text-muted-foreground rounded-4xl border border-dashed px-4 py-10 text-center text-sm dark:bg-slate-800">
                  لا توجد فصول متاحة الآن.
                </div>
              }
            >
              <div class="grid gap-3 sm:grid-cols-2">
                <For each={seasons()?.filter(season => season.name != "غير مصنف")}>
                  {(season) => (
                    <A
                      href={`/dashboard/${subjectId}/edit-lecture/${season.id}/editor`}
                      class="group border border-transparent hover:border-main focus:ring-ring flex items-center justify-between rounded-[1.5rem] px-4 py-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:ring-2 focus:outline-none dark:bg-slate-800"
                    >
                      <div>
                        <p class="text-foreground text-sm font-bold">
                          {season.name}
                        </p>
                      </div>
                      <span class="bg-main/10 text-main group-hover:bg-main group-hover:text-main-light rounded-full px-3 py-1 text-xs font-bold transition">
                        فتح
                      </span>
                    </A>
                  )}
                </For>
              </div>
            </Show>
          }
        >
          <div class="text-muted-foreground rounded-[1.5rem] px-4 py-10 text-center text-sm shadow-md dark:bg-slate-800">
            جاري تحميل الفصول...
          </div>
        </Show>
      </div>
    </div>
  );
}
