import { createResource, createSignal, For, Show } from "solid-js";
import toast from "solid-toast";
import { supabase } from "../../../services/supabase";
import type { Section } from "../../../services/documentsManipulation";

export function SuggestionsManager(props: {
  subjectId: string;
  sections: Section[];
  onApplied: () => void;
}) {
  const [filter, setFilter] = createSignal<"pending" | "approved" | "rejected">("pending");

  const [suggestions, { refetch }] = createResource(
    () => ({ subjectId: props.subjectId, status: filter() }),
    async ({ subjectId, status }) => {
      if (!subjectId || !status) return [];

      const { data, error } = await supabase
        .from("question_suggestions")
        .select(`
        *,
        question:questions(id, question, season_id),
        suggested_by_user:users(name) 
      `)
        .eq("subject_id", subjectId)
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase Query Error:", error.message);
        return [];
      }

      return data ?? [];
    },
    { initialValue: [] },
  );

  const seasons = () => props.sections.filter((s) => s.type === "season");
  const getSeasonName = (id: number | null) => seasons().find((s) => s.id === id)?.name ?? "غير محدد";

  const handleApprove = async (suggestion: any) => {
    const { error } = await supabase
      .from("questions")
      .update({ season_id: suggestion.suggested_season_id })
      .eq("id", suggestion.question_id);

    if (error) {
      toast.error("فشل التطبيق");
      return;
    }

    await supabase
      .from("question_suggestions")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", suggestion.id);

    toast.success("تم تطبيق الاقتراح ✓");
    refetch();
    props.onApplied();
  };

  const handleReject = async (id: string) => {
    await supabase
      .from("question_suggestions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);

    toast.success("تم رفض الاقتراح");
    refetch();
  };

  return (
    <div class="space-y-4 pb-16" dir="rtl">
      <div class="flex gap-2 rounded-2xl bg-white dark:bg-slate-800 p-3 shadow-sm">
        <For
          each={[
            { key: "pending", label: "⏳ قيد المراجعة", color: "text-amber-600" },
            { key: "approved", label: "✅ مقبولة", color: "text-green-600" },
            { key: "rejected", label: "❌ مرفوضة", color: "text-red-500" },
          ] as const}
        >
          {(item) => (
            <button
              onClick={() => setFilter(item.key)}
              class={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                filter() === item.key
                  ? `bg-slate-100 dark:bg-slate-700 ${item.color}`
                  : "text-slate-400"
              }`}
            >
              {item.label}
            </button>
          )}
        </For>
      </div>

      <Show when={suggestions.loading}>
        <p class="text-center text-sm text-slate-400 py-10">جاري التحميل...</p>
      </Show>

      <Show when={!suggestions.loading && (suggestions()?.length ?? 0) === 0}>
        <div class="rounded-2xl bg-white dark:bg-slate-800 p-10 text-center shadow-sm">
          <p class="text-3xl mb-2">🎉</p>
          <p class="text-slate-400 text-sm">لا توجد مقترحات {filter() === "pending" ? "قيد المراجعة" : ""}</p>
        </div>
      </Show>

      <For each={suggestions()}>
        {(s) => (
          <div class="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm space-y-3">
            <p class="text-sm font-bold leading-relaxed line-clamp-2">
              {s.question?.question}
            </p>

            <div class="flex items-center gap-2 text-xs">
              <span class="rounded-full bg-red-50 dark:bg-red-900/20 px-3 py-1 text-red-500 line-through">
                {getSeasonName(s.current_season_id)}
              </span>
              <span class="text-slate-400">←</span>
              <span class="rounded-full bg-green-50 dark:bg-green-900/20 px-3 py-1 text-green-600 font-bold">
                {getSeasonName(s.suggested_season_id)}
              </span>
            </div>

            <Show when={s.note}>
              <p class="text-xs text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2">
                💬 {s.note}
              </p>
            </Show>

            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>👤 {s.suggested_by_user?.name ?? "مجهول"}</span>
              <span>{new Date(s.created_at).toLocaleDateString("ar-SA")}</span>
            </div>

            <Show when={filter() === "pending"}>
              <div class="flex gap-2 pt-1">
                <button
                  onClick={() => handleApprove(s)}
                  class="flex-1 rounded-full bg-green-500 py-2 text-xs font-bold text-white"
                >
                  ✓ قبول وتطبيق
                </button>
                <button
                  onClick={() => handleReject(s.id)}
                  class="flex-1 rounded-full border border-red-200 py-2 text-xs font-bold text-red-500"
                >
                  ✕ رفض
                </button>
              </div>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}
