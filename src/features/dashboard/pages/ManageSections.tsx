import { createResource, createSignal, For, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import toast from "solid-toast";
import {
  createSection,
  deleteSection,
  getSubject,
  listSections,
  updateSection,
  type SectionRow,
} from "../services/manage";

const inputCls =
  "w-full rounded-xl border border-line-light bg-surface-light p-2 text-sm text-ink-light dark:border-line-dark dark:bg-base-dark dark:text-ink-dark";

type FormState = { type: SectionRow["type"]; value: string; name: string };

export default function ManageSections() {
  const params = useParams();
  const subjectId = () => params.subject!;

  const [subject] = createResource(subjectId, getSubject);
  const [sections, { refetch }] = createResource(subjectId, listSections);

  const [form, setForm] = createSignal<FormState | null>(null);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [busy, setBusy] = createSignal(false);

  const openNew = () => {
    setEditingId(null);
    setForm({ type: "season", value: "", name: "" });
  };
  const openEdit = (s: SectionRow) => {
    setEditingId(s.id);
    setForm({ type: s.type, value: s.value, name: s.name });
  };

  const save = async () => {
    const f = form();
    if (!f) return;
    setBusy(true);
    const id = editingId();
    const res = id
      ? await updateSection(id, f)
      : await createSection({ ...f, subject_id: subjectId() });
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success("تم الحفظ ✓");
    setForm(null);
    refetch();
  };

  const remove = async (s: SectionRow) => {
    if (!confirm(`حذف القسم "${s.name}"؟`)) return;
    const res = await deleteSection(s);
    if (!res.ok) return void toast.error(res.error);
    toast.success("تم الحذف ✓");
    refetch();
  };

  const group = (type: SectionRow["type"]) =>
    (sections() ?? [])
      .filter((s) => s.type === type)
      .sort((a, b) => +a.value - +b.value);

  const Group = (p: { title: string; type: SectionRow["type"] }) => (
    <div class="flex flex-col gap-2 rounded-4xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
      <p class="text-xs font-bold text-ink-muted-light">{p.title}</p>
      <Show when={group(p.type).length > 0} fallback={<p class="py-3 text-center text-sm text-ink-muted-light">لا يوجد</p>}>
        <For each={group(p.type)}>
          {(s) => (
            <div class="flex items-center gap-2 rounded-2xl border border-line-light bg-base-light p-3 dark:border-line-dark dark:bg-base-dark">
              <span class="w-8 text-center text-xs font-black text-ink-muted-light">{s.value}</span>
              <p class="flex-1 font-bold text-ink-light dark:text-ink-dark">{s.name}</p>
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
    </div>
  );

  return (
    <div class="min-h-dvh bg-base-light px-5 dark:bg-base-dark" dir="rtl">
      <div class="mx-auto flex max-w-lg flex-col gap-4 pt-22 pb-28">
        <A href="/dashboard/manage" class="text-xs text-ink-muted-light">← المواد</A>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-black text-ink-light dark:text-ink-dark">
            أقسام: {subject()?.name ?? subjectId()}
          </h1>
          <button
            onClick={openNew}
            class="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-md"
          >
            + قسم
          </button>
        </div>

        <Show when={form()}>
          {(f) => (
            <div class="flex flex-col gap-3 rounded-3xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
              <p class="text-sm font-bold text-ink-soft-light dark:text-ink-dark">
                {editingId() ? "تعديل القسم" : "قسم جديد"}
              </p>
              <label class="text-xs text-ink-muted-light">
                النوع
                <select
                  class={inputCls}
                  value={f().type}
                  onChange={(e) => setForm({ ...f(), type: e.currentTarget.value as FormState["type"] })}
                >
                  <option value="season">فصل / محاضرة</option>
                  <option value="year">سنة امتحانية</option>
                </select>
              </label>
              <div class="flex gap-2">
                <label class="w-24 text-xs text-ink-muted-light">
                  الرقم (للترتيب)
                  <input
                    class={inputCls}
                    dir="ltr"
                    inputmode="numeric"
                    value={f().value}
                    onInput={(e) => setForm({ ...f(), value: e.currentTarget.value })}
                  />
                </label>
                <label class="flex-1 text-xs text-ink-muted-light">
                  الاسم
                  <input
                    class={inputCls}
                    value={f().name}
                    onInput={(e) => setForm({ ...f(), name: e.currentTarget.value })}
                  />
                </label>
              </div>
              <div class="flex gap-2">
                <button disabled={busy()} onClick={save} class="flex-1 rounded-xl bg-blue-500 p-2 text-sm font-bold text-white disabled:opacity-50">
                  {busy() ? "..." : "حفظ"}
                </button>
                <button onClick={() => setForm(null)} class="flex-1 rounded-xl bg-chip-light p-2 text-sm font-bold text-ink-soft-light dark:bg-chip-dark dark:text-ink-soft-dark">
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </Show>

        <Show when={!sections.loading} fallback={<p class="py-6 text-center text-ink-muted-light">جاري التحميل... ⏳</p>}>
          {Group({ title: "📖 الفصول / المحاضرات", type: "season" })}
          {Group({ title: "📅 السنوات الامتحانية", type: "year" })}
        </Show>
      </div>
    </div>
  );
}
