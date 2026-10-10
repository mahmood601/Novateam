import { createResource, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
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
  "w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200";

export default function ManageSubjects() {
  const [yearKey, setYearKey] = createSignal("second");
  const [subjects, { refetch }] = createResource(yearKey, listSubjects);

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
    <div class="min-h-dvh bg-[#f8fafc] px-5 dark:bg-[#0f172a]" dir="rtl">
      <div class="mx-auto flex max-w-lg flex-col gap-4 pt-22 pb-28">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-black text-slate-800 dark:text-white">
            إدارة المواد
          </h1>
          <button
            onClick={openNew}
            class="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-md"
          >
            + مادة
          </button>
        </div>

        {/* Year tabs */}
        <div class="flex justify-around gap-1 rounded-4xl bg-white p-3 shadow-sm dark:bg-slate-800">
          <For each={YEARS}>
            {(y) => (
              <button
                onClick={() => setYearKey(y.id)}
                class={`w-15 rounded-2xl p-2 text-xs font-bold transition-all ${
                  yearKey() === y.id
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
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
            <div class="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-800">
              <p class="text-sm font-bold text-slate-600 dark:text-slate-200">
                {editingId() ? "تعديل المادة" : "مادة جديدة"}
              </p>
              <label class="text-xs text-slate-400">
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
              <label class="text-xs text-slate-400">
                الاسم
                <input
                  class={inputCls}
                  value={f().name}
                  onInput={(e) => setForm({ ...f(), name: e.currentTarget.value })}
                />
              </label>
              <div class="flex gap-2">
                <label class="flex-1 text-xs text-slate-400">
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
                <label class="flex-1 text-xs text-slate-400">
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
                  class="flex-1 rounded-xl bg-slate-100 p-2 text-sm font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </Show>

        {/* Subjects list */}
        <div class="flex flex-col gap-2 rounded-4xl bg-white p-4 shadow-sm dark:bg-slate-800">
          <Show when={!subjects.loading} fallback={<p class="py-6 text-center text-slate-400">جاري التحميل... ⏳</p>}>
            <Show
              when={(subjects() ?? []).length > 0}
              fallback={<p class="py-6 text-center text-slate-400">لا توجد مواد 📭</p>}
            >
              <For each={subjects()}>
                {(s) => (
                  <div class="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div class="flex-1">
                      <p class="font-bold text-slate-700 dark:text-slate-200">{s.name}</p>
                      <p class="text-[11px] text-slate-400" dir="ltr">{s.id}</p>
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
                    <button onClick={() => remove(s)} class="rounded-xl bg-red-50 px-3 py-1 text-xs font-bold text-red-600 dark:bg-red-900/30">
                      حذف
                    </button>
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
