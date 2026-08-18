import { createSignal, For, Show } from "solid-js";
import toast from "solid-toast";
import { supabase } from "../../../services/supabase";
import type { Section } from "../../../services/documentsManipulation";

export function BulkActionBar(props: {
  selectedIds: Set<string>;
  sections: Section[];
  subjectId: string;
  onClear: () => void;
  onComplete: () => void;
}) {
  const [moving, setMoving] = createSignal(false);
  const [targetSeasonId, setTargetSeasonId] = createSignal<number | null>(null);
  const [targetYearId, setTargetYearId] = createSignal<number | null>(null);
  const [showPanel, setShowPanel] = createSignal(false);

  const count = () => props.selectedIds.size;

  const handleMove = async () => {
    if (!targetSeasonId() && !targetYearId()) {
      toast.error("اختر فصلاً أو سنة للنقل إليها");
      return;
    }

    setMoving(true);
    const ids = [...props.selectedIds];
    const updates: any = {};
    if (targetSeasonId()) updates.season_id = targetSeasonId();
    if (targetYearId()) updates.year_id = targetYearId();

    const { error } = await supabase.from("questions").update(updates).in("id", ids);

    setMoving(false);

    if (error) {
      toast.error("فشل النقل: " + error.message);
      return;
    }

    toast.success(`تم نقل ${count()} سؤال ✅`);
    props.onClear();
    props.onComplete();
    setShowPanel(false);
  };

  const handleDelete = async () => {
    if (!confirm(`هل تريد حذف ${count()} سؤال محدد؟ لا يمكن التراجع!`)) return;

    setMoving(true);
    const ids = [...props.selectedIds];
    const { error } = await supabase.from("questions").delete().in("id", ids);

    setMoving(false);

    if (error) {
      toast.error("فشل الحذف: " + error.message);
      return;
    }

    toast.success(`تم حذف ${count()} سؤال 🗑️`);
    props.onClear();
    props.onComplete();
  };

  return (
    <div class="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2" dir="rtl">
      <div class="flex items-center gap-3 rounded-[2rem] bg-slate-900 p-4 text-white shadow-2xl">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-black">
          {count()}
        </span>
        <span class="flex-1 text-sm font-bold">سؤال محدد</span>

        <button
          onClick={() => setShowPanel(!showPanel())}
          class="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold transition hover:bg-cyan-400"
        >
          نقل 📦
        </button>
        <button
          onClick={handleDelete}
          disabled={moving()}
          class="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold transition hover:bg-red-400 disabled:opacity-50"
        >
          حذف 🗑️
        </button>
        <button
          onClick={props.onClear}
          class="rounded-xl bg-slate-700 px-3 py-2 text-sm font-bold transition hover:bg-slate-600"
        >
          ✕
        </button>
      </div>

      <Show when={showPanel()}>
        <div class="mt-2 rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-800">
          <p class="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            نقل {count()} سؤال إلى:
          </p>
          <div class="mb-4 grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-500">الفصل</label>
              <select
                class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                onChange={(e) =>
                  setTargetSeasonId(e.currentTarget.value ? Number(e.currentTarget.value) : null)
                }
              >
                <option value="">بدون تغيير</option>
                <For each={props.sections.filter((s) => s.type === "season")}>
                  {(s) => <option value={s.id}>{s.name}</option>}
                </For>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-500">السنة</label>
              <select
                class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                onChange={(e) =>
                  setTargetYearId(e.currentTarget.value ? Number(e.currentTarget.value) : null)
                }
              >
                <option value="">بدون تغيير</option>
                <For each={props.sections.filter((s) => s.type === "year")}>
                  {(y) => <option value={y.id}>{y.name}</option>}
                </For>
              </select>
            </div>
          </div>
          <button
            onClick={handleMove}
            disabled={moving() || (!targetSeasonId() && !targetYearId())}
            class="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-black text-white shadow-lg transition disabled:opacity-50"
          >
            {moving() ? "جاري النقل..." : `نقل ${count()} سؤال ✅`}
          </button>
        </div>
      </Show>
    </div>
  );
}
