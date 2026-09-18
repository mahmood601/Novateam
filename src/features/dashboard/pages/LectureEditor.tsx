import { createResource, For, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { getSeasonsFromRemote } from "../../shared/services/sections";

export default function LectureEditor() {
  const subjectId = useParams().subject!;
  const [seasons] = createResource(() => getSeasonsFromRemote(subjectId));

  return (
    <div class="flex h-dvh w-full flex-col items-center overflow-hidden justify-center gap-5 px-5 pt-22 pb-22">
      <Show
        when={seasons.loading}
        fallback={
          <Show
            when={(seasons() ?? []).length > 0}
            fallback={
              <div class="text-muted-foreground rounded-4xl border border-dashed px-4 py-10 text-center text-sm dark:bg-slate-800">
                لا توجد فصول متاحة الآن.
              </div>
            }
          >
            <div class="flex min-h-0 flex-1 w-full flex-col gap-3 py-2 overflow-y-scroll">
              <For
                each={seasons()?.filter((season) => season.name != "غير مصنف")}
              >
                {(season) => (
                  <A
                    href={`/dashboard/${subjectId}/edit-lecture/${season.id}/editor`}
                    class="hover:border-main dark:border-lighter-dark-2 bg-main-light relative flex flex-row-reverse justify-between gap-2 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800"
                  >
                    <div>
                      <p class="text-foreground text-sm font-bold">
                        {season.name}
                      </p>
                    </div>
                    <span class="bg-main text-main-light rounded-full px-3 py-1 text-xs font-bold transition">
                      فتح
                    </span>
                  </A>
                )}
              </For>
            </div>
          </Show>
        }
      >
        <div class="text-muted-foreground rounded-3xl px-4 py-10 text-center text-sm shadow-md dark:bg-slate-800">
          جاري تحميل الفصول...
        </div>
      </Show>
    </div>
  );
}
