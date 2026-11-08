import { createResource, createSignal, For, Show } from "solid-js";
import { deletePassage, getPassages, updatePassage } from "../services/passages";
import type { PassageUI } from "../services/types";
import { useUser } from "../../shared/context/user";

export function PassageManager(props: { subjectId: string }) {
  const { can } = useUser();
  // passages have no draft/pending state: editing needs "publish", deleting "manage"
  const canEditPassage = () => can("quiz", props.subjectId, "publish");
  const canDeletePassage = () => can("quiz", props.subjectId, "manage");
  const [passages, { refetch }] = createResource(() => getPassages(props.subjectId));
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editText, setEditText] = createSignal("");
  const [savingId, setSavingId] = createSignal<string | null>(null);

  const startEdit = (p: PassageUI) => {
    setEditingId(p.$id);
    setEditText(p.content);
  };

  const saveEdit = async () => {
    if (!editingId()) return;
    setSavingId(editingId());
    const ok = await updatePassage(editingId()!, editText());
    setSavingId(null);
    if (!ok) return; // keep the editor open so the text isn't lost
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المقالة؟ سيتم إلغاء ربطها بجميع الأسئلة.")) return;
    if (await deletePassage(id)) refetch();
  };

  return (
    <div class="space-y-4 pb-16" dir="rtl">
      <Show
        when={(passages() ?? []).length > 0}
        fallback={<p class="py-10 text-center text-ink-muted-light">لا توجد مقالات بعد 📄</p>}
      >
        <p class="text-sm text-ink-muted-light">
          إجمالي: <span class="font-bold text-ink-soft-light dark:text-ink-soft-dark">{passages()?.length}</span>
        </p>
        <For each={passages()}>
          {(p) => (
            <div class="space-y-3 rounded-2xl border border-line-light bg-surface-light p-5 shadow-sm dark:border-line-dark dark:bg-surface-dark">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[10px] text-ink-muted-light">
                  {p.$id.slice(0, 8)}
                </span>
              </div>

              <Show
                when={editingId() === p.$id}
                fallback={
                  <p class="text-sm leading-relaxed whitespace-pre-wrap text-ink-light dark:text-ink-dark">
                    {p.content}
                  </p>
                }
              >
                <textarea
                  value={editText()}
                  onInput={(e) => setEditText(e.currentTarget.value)}
                  rows={6}
                  dir="rtl"
                  class="w-full rounded-xl bg-base-light p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-base-dark dark:text-ink-dark"
                />
              </Show>

              <div class="flex justify-end gap-2">
                <Show when={editingId() === p.$id}>
                  <button
                    onClick={() => setEditingId(null)}
                    class="rounded-xl bg-chip-light px-4 py-2 text-sm font-bold text-ink-soft-light dark:bg-chip-dark"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={savingId() === p.$id}
                    class="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {savingId() === p.$id ? "جاري الحفظ..." : "حفظ ✏️"}
                  </button>
                </Show>
                <Show when={editingId() !== p.$id}>
                  <Show when={canEditPassage()}>
                    <button
                      onClick={() => startEdit(p)}
                      class="rounded-xl bg-chip-light px-4 py-2 text-sm font-bold text-ink-soft-light dark:bg-chip-dark dark:text-ink-dark"
                    >
                      تعديل ✏️
                    </button>
                  </Show>
                  <Show when={canDeletePassage()}>
                    <button
                      onClick={() => handleDelete(p.$id)}
                      class="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-500 dark:bg-red-900/20"
                    >
                      حذف 🗑️
                    </button>
                  </Show>
                </Show>
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
