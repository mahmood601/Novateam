import { createResource, createSignal, For, Show } from "solid-js";
import toast from "solid-toast";
import { deletePassage, getPassages, updatePassage, type PassageUI } from "../../../services/documentsManipulation";

export function PassageManager(props: { subjectId: string }) {
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
    await updatePassage(editingId()!, editText());
    setSavingId(null);
    setEditingId(null);
    toast.success("تم حفظ المقالة");
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المقالة؟ سيتم إلغاء ربطها بجميع الأسئلة.")) return;
    await deletePassage(id);
    toast.success("تم حذف المقالة");
    refetch();
  };

  return (
    <div class="space-y-4 pb-16" dir="rtl">
      <Show
        when={(passages() ?? []).length > 0}
        fallback={<p class="py-10 text-center text-slate-400">لا توجد مقالات بعد 📄</p>}
      >
        <p class="text-sm text-slate-400">
          إجمالي: <span class="font-bold text-slate-600 dark:text-slate-300">{passages()?.length}</span>
        </p>
        <For each={passages()}>
          {(p) => (
            <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[10px] text-slate-400">
                  {p.$id.slice(0, 8)}
                </span>
              </div>

              <Show
                when={editingId() === p.$id}
                fallback={
                  <p class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {p.content}
                  </p>
                }
              >
                <textarea
                  value={editText()}
                  onInput={(e) => setEditText(e.currentTarget.value)}
                  rows={6}
                  dir="rtl"
                  class="w-full rounded-xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                />
              </Show>

              <div class="flex justify-end gap-2">
                <Show when={editingId() === p.$id}>
                  <button
                    onClick={() => setEditingId(null)}
                    class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500 dark:bg-slate-700"
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
                  <button
                    onClick={() => startEdit(p)}
                    class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    تعديل ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(p.$id)}
                    class="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-500 dark:bg-red-900/20"
                  >
                    حذف 🗑️
                  </button>
                </Show>
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
