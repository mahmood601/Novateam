import { createResource, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useUser } from "../../shared/context/user";
import toast from "solid-toast";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
  type SubjectRow,
} from "../services/manage";

const YEARS = [
  { id: "second", name: "الثانية" },
  { id: "third", name: "الثالثة" },
  { id: "fourth", name: "الرابعة" },
  { id: "fifth", name: "الخامسة" },
];

const EMPTY: SubjectRow = { id: "", name: "", year_key: "second", semester: null };

const inputCls =
  "w-full rounded-xl border border-line-light bg-surface-light p-2 text-sm text-ink-light dark:border-line-dark dark:bg-base-dark dark:text-ink-dark";

export default function ManageSubjects() {
  const [yearKey, setYearKey] = createSignal("second");
  const [subjects, { refetch }] = createResource(yearKey, listSubjects);

  // Creating / deleting a subject needs an ALL-subjects grant; editing a
  // subject or its sections works with a grant on just that subject.
  const { can } = useUser();
  const canCreate = () => can("subjects", null, "manage");
  const visible = () =>
    (subjects() ?? []).filter((s) => can("subjects", s.id, "manage"));

  // null = form closed, editing() = id of the subject being edited (or null for new)
  const [form, setForm] = createSignal<SubjectRow | null>(null);
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY, year_key: yearKey() });
  };
  const openEdit = (s: SubjectRow) => {
    setEditingId(s.id);
    setForm({ ...s });
  };

  const save = async () => {
    const f = form();
    if (!f) return;
    setBusy(true);
    const res = editingId()
      ? await updateSubject(f.id, f)
      : await createSubject({ ...f, id: f.id.trim() });
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success("تم الحفظ ✓");
    setForm(null);
    refetch();
  };

  const remove = async (s: SubjectRow) => {
    if (!confirm(`حذف المادة "${s.name}" نهائياً؟`)) return;
    const res = await deleteSubject(s.id);
    if (!res.ok) return void toast.error(res.error);
    toast.success("تم الحذف ✓");
    refetch();
  };

  return (
    <div class="min-h-dvh bg-base-light px-5 dark:bg-base-dark" dir="rtl">
      <div class="mx-auto flex max-w-lg flex-col gap-4 pt-22 pb-28">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-black text-ink-light dark:text-ink-dark">
            إدارة المواد
          </h1>
          <Show when={canCreate()}>
            <button
              onClick={openNew}
              class="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-md"
            >
              + مادة
            </button>
          </Show>
        </div>

        {/* Year tabs */}
        <div class="flex justify-around gap-1 rounded-4xl bg-surface-light p-3 shadow-sm dark:bg-surface-dark">
          <For each={YEARS}>
            {(y) => (
              <button
                onClick={() => setYearKey(y.id)}
                class={`w-15 rounded-2xl p-2 text-xs font-bold transition-all ${
                  yearKey() === y.id
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                    : "bg-chip-light text-ink-soft-light dark:bg-chip-dark dark:text-ink-soft-dark"
                }`}
              >
                {y.name}
              </button>
            )}
          </For>
        </div>

        {/* Add / edit form */}
        <Show when={form()}>
          {(f) => (
            <div class="flex flex-col gap-3 rounded-3xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
              <p class="text-sm font-bold text-ink-soft-light dark:text-ink-dark">
                {editingId() ? "تعديل المادة" : "مادة جديدة"}
              </p>
              <label class="text-xs text-ink-muted-light">
                المعرّف (إنجليزي، لا يمكن تغييره لاحقاً)
                <input
                  class={inputCls}
                  dir="ltr"
                  disabled={!!editingId()}
                  value={f().id}
                  onInput={(e) => setForm({ ...f(), id: e.currentTarget.value })}
                  placeholder="e.g. anatomy-2"
                />
              </label>
              <label class="text-xs text-ink-muted-light">
                الاسم
                <input
                  class={inputCls}
                  value={f().name}
                  onInput={(e) => setForm({ ...f(), name: e.currentTarget.value })}
                />
              </label>
              <div class="flex gap-2">
                <label class="flex-1 text-xs text-ink-muted-light">
                  السنة
                  <select
                    class={inputCls}
                    value={f().year_key}
                    onChange={(e) => setForm({ ...f(), year_key: e.currentTarget.value })}
                  >
                    <For each={YEARS}>
                      {(y) => <option value={y.id}>{y.name}</option>}
                    </For>
                  </select>
                </label>
                <label class="flex-1 text-xs text-ink-muted-light">
                  الفصل
                  <select
                    class={inputCls}
                    value={f().semester ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...f(),
                        semester: (e.currentTarget.value || null) as SubjectRow["semester"],
                      })
                    }
                  >
                    <option value="">—</option>
                    <option value="first">الأول</option>
                    <option value="second">الثاني</option>
                  </select>
                </label>
              </div>
              <div class="flex gap-2">
                <button
                  disabled={busy()}
                  onClick={save}
                  class="flex-1 rounded-xl bg-blue-500 p-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy() ? "..." : "حفظ"}
                </button>
                <button
                  onClick={() => setForm(null)}
                  class="flex-1 rounded-xl bg-chip-light p-2 text-sm font-bold text-ink-soft-light dark:bg-chip-dark dark:text-ink-soft-dark"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </Show>

        {/* Subjects list */}
        <div class="flex flex-col gap-2 rounded-4xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
          <Show when={!subjects.loading} fallback={<p class="py-6 text-center text-ink-muted-light">جاري التحميل... ⏳</p>}>
            <Show
              when={visible().length > 0}
              fallback={<p class="py-6 text-center text-ink-muted-light">لا توجد مواد 📭</p>}
            >
              <For each={visible()}>
                {(s) => (
                  <div class="flex items-center gap-2 rounded-2xl border border-line-light bg-base-light p-3 dark:border-line-dark dark:bg-base-dark">
                    <div class="flex-1">
                      <p class="font-bold text-ink-light dark:text-ink-dark">{s.name}</p>
                      <p class="text-[11px] text-ink-muted-light" dir="ltr">{s.id}</p>
                    </div>
                    <A
                      href={`/dashboard/manage/${s.id}`}
                      class="rounded-xl bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-600 dark:bg-cyan-900/30"
                    >
                      الأقسام
                    </A>
                    <button onClick={() => openEdit(s)} class="rounded-xl bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 dark:bg-amber-900/30">
                      تعديل
                    </button>
                    <Show when={canCreate()}>
                      <button onClick={() => remove(s)} class="rounded-xl bg-red-50 px-3 py-1 text-xs font-bold text-red-600 dark:bg-red-900/30">
                        حذف
                      </button>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
