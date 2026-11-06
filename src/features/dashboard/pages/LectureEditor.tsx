import { createResource, For, Show } from "solid-js";
import toast from "solid-toast";
import { A, useParams } from "@solidjs/router";
import { getSeasonsFromRemote } from "../../shared/services/sections";
import {
  getLectureStatuses,
  updateLectureStatus,
} from "../../shared/services/lecturesUpdates";
import { useUser } from "../../shared/context/user";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  published: { text: "منشورة", cls: "bg-green-50 text-green-600" },
  pending: { text: "بانتظار المراجعة", cls: "bg-amber-50 text-amber-600" },
  draft: { text: "مسودة", cls: "bg-slate-100 text-slate-500" },
};

export default function LectureEditor() {
  const subjectId = useParams().subject!;
  const { user, can } = useUser();
  const [seasons] = createResource(() => getSeasonsFromRemote(subjectId));
  const [statuses, { refetch }] = createResource(() =>
    getLectureStatuses(subjectId),
  );

  const canPublish = () => can("lecture", subjectId, "publish");

  const changeStatus = async (
    seasonId: number,
    next: "published" | "draft",
  ) => {
    if (next === "draft" && !confirm("إلغاء نشر المحاضرة؟ ستختفي عن الطلاب.")) {
      return;
    }
    const { error } = await updateLectureStatus(
      subjectId,
      seasonId,
      next,
      user()?.id,
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next === "published" ? "تم نشر المحاضرة ✓" : "أُلغي النشر");
    refetch();
  };

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
                {(season) => {
                  const status = () => statuses()?.get(season.id) as string | undefined;
                  return (
                    <div class="flex flex-col gap-2">
                      <A
                        href={`/dashboard/${subjectId}/edit-lecture/${season.id}/editor`}
                        class="hover:border-main dark:border-lighter-dark-2 bg-main-light relative flex flex-row-reverse items-center justify-between gap-2 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800"
                      >
                        <div class="flex flex-col items-end gap-1">
                          <p class="text-foreground text-right text-sm font-bold">
                            {season.name}
                          </p>
                          <Show when={status()}>
                            <span
                              class={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_LABEL[status()!]?.cls ?? ""}`}
                            >
                              {STATUS_LABEL[status()!]?.text ?? status()}
                            </span>
                          </Show>
                        </div>
                        <span class="bg-main text-main-light h-fit rounded-full px-3 py-1 text-xs font-bold transition">
                          فتح
                        </span>
                      </A>

                      {/* Approving is a publisher action. Buttons live OUTSIDE the
                          link on purpose: a button inside <a> is invalid HTML. */}
                      <Show when={canPublish() && status() && status() !== "published"}>
                        <button
                          onClick={() => changeStatus(season.id, "published")}
                          class="rounded-xl bg-green-50 py-1.5 text-xs font-bold text-green-600 hover:bg-green-100 dark:bg-green-900/20"
                        >
                          نشر ✓
                        </button>
                      </Show>
                      <Show when={canPublish() && status() === "published"}>
                        <button
                          onClick={() => changeStatus(season.id, "draft")}
                          class="rounded-xl bg-slate-100 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:bg-slate-700"
                        >
                          إلغاء النشر
                        </button>
                      </Show>
                    </div>
                  );
                }}
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
