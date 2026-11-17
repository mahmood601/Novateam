import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import toast from "solid-toast";
import { A, useParams } from "@solidjs/router";
import { getSeasonsFromRemote } from "../../shared/services/sections";
import {
  getLectureStatuses,
  updateLectureStatus,
  updateLecturesStatus,
} from "../../shared/services/lecturesUpdates";
import { useUser } from "../../shared/context/user";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  published: { text: "منشورة", cls: "bg-green-50 text-green-600" },
  pending: { text: "بانتظار المراجعة", cls: "bg-amber-50 text-amber-600" },
  draft: { text: "مسودة", cls: "bg-chip-light text-ink-soft-light" },
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

  // ── Bulk selection ──────────────────────────────────────────────
  // Only seasons that already HAVE a saved lecture can be selected: a season
  // without a row has no status to change.
  const [selected, setSelected] = createSignal<Set<number>>(new Set<number>());
  const [busy, setBusy] = createSignal(false);

  const visibleSeasons = () =>
    (seasons() ?? []).filter((season) => season.name != "غير مصنف");
  const selectableIds = createMemo(() =>
    visibleSeasons()
      .map((s) => s.id as number)
      .filter((id) => statuses()?.has(id)),
  );
  const allSelected = () =>
    selectableIds().length > 0 &&
    selectableIds().every((id) => selected().has(id));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected() ? new Set<number>() : new Set(selectableIds()));
  const clearSelection = () => setSelected(new Set<number>());

  const bulkChange = async (next: "published" | "draft") => {
    // Skip lectures already in the target state: the counts stay honest.
    const ids = [...selected()].filter((id) =>
      next === "published"
        ? statuses()?.get(id) !== "published"
        : statuses()?.get(id) === "published",
    );
    if (ids.length === 0) {
      toast.error(
        next === "published"
          ? "كل المحاضرات المحددة منشورة بالفعل"
          : "لا توجد محاضرات منشورة بين المحددة",
      );
      return;
    }
    if (
      next === "draft" &&
      !confirm(`إلغاء نشر ${ids.length} محاضرة؟ ستختفي عن الطلاب.`)
    ) {
      return;
    }

    setBusy(true);
    const { count, error } = await updateLecturesStatus(
      subjectId,
      ids,
      next,
      user()?.id,
    );
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (count === 0) {
      toast.error("لا تملك صلاحية على هذه المحاضرات");
      return;
    }
    const verb = next === "published" ? "نُشرت" : "أُلغي نشر";
    if (count < ids.length) {
      toast.error(`${verb} ${count} من ${ids.length} فقط — لا تملك صلاحية الباقي`);
    } else {
      toast.success(`${verb} ${count} محاضرة ✓`);
    }
    clearSelection();
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
              <div class="text-muted-foreground rounded-4xl border border-dashed px-4 py-10 text-center text-sm dark:bg-surface-dark">
                لا توجد فصول متاحة الآن.
              </div>
            }
          >
            <div class="flex min-h-0 flex-1 w-full flex-col gap-3 py-2 overflow-y-scroll">
              <Show when={canPublish() && selectableIds().length > 0}>
                <button
                  onClick={toggleAll}
                  class="self-start rounded-xl bg-chip-light px-3 py-1.5 text-xs font-bold text-ink-soft-light hover:bg-darker-light-2 dark:bg-chip-dark"
                >
                  {allSelected() ? "إلغاء تحديد الكل" : "تحديد الكل"}
                </button>
              </Show>
              <For each={visibleSeasons()}>
                {(season) => {
                  const status = () => statuses()?.get(season.id) as string | undefined;
                  return (
                    <div class="flex flex-col gap-2">
                     <div class="flex items-center gap-3">
                      {/* Checkbox is a SIBLING of the link, not inside it:
                          clicking it must select, not navigate. */}
                      <Show when={canPublish() && status()}>
                        <input
                          type="checkbox"
                          checked={selected().has(season.id)}
                          onChange={() => toggle(season.id)}
                          class="h-5 w-5 shrink-0 accent-main"
                          aria-label={`تحديد ${season.name}`}
                        />
                      </Show>
                      <A
                        href={`/dashboard/${subjectId}/edit-lecture/${season.id}/editor`}
                        class="min-w-0 flex-1 hover:border-main dark:border-lighter-dark-2 bg-main-light relative flex flex-row-reverse items-center justify-between gap-2 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-surface-dark"
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
                     </div>

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
                          class="rounded-xl bg-chip-light py-1.5 text-xs font-bold text-ink-soft-light hover:bg-darker-light-2 dark:bg-chip-dark"
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
        <div class="text-muted-foreground rounded-3xl px-4 py-10 text-center text-sm shadow-md dark:bg-surface-dark">
          جاري تحميل الفصول...
        </div>
      </Show>

      <Show when={canPublish() && selected().size > 0}>
        <div
          class="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2"
          dir="rtl"
        >
          <div class="flex flex-wrap items-center gap-2 rounded-[2rem] bg-slate-900 p-4 text-white shadow-2xl">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-black">
              {selected().size}
            </span>
            <span class="flex-1 text-sm font-bold">محاضرة محددة</span>
            <button
              onClick={() => bulkChange("published")}
              disabled={busy()}
              class="rounded-xl bg-green-500 px-4 py-2 text-sm font-bold transition hover:bg-green-400 disabled:opacity-50"
            >
              نشر ✓
            </button>
            <button
              onClick={() => bulkChange("draft")}
              disabled={busy()}
              class="rounded-xl bg-slate-600 px-4 py-2 text-sm font-bold transition hover:bg-slate-500 disabled:opacity-50"
            >
              إلغاء النشر
            </button>
            <button
              onClick={clearSelection}
              class="rounded-xl bg-slate-700 px-3 py-2 text-sm font-bold transition hover:bg-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
