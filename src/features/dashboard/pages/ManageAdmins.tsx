import { createResource, createSignal, For, Show } from "solid-js";
import toast from "solid-toast";
import { useUser } from "../../shared/context/user";
import {
  demoteUser,
  grantPerm,
  listStaff,
  revokePerm,
  searchUsersByName,
  type StaffMember,
} from "../../shared/services/grants";
import {
  isGrantActive,
  LEVEL_LABEL,
  LEVEL_SHORT,
  SCOPE_LABEL,
  type Grant,
  type Level,
  type Scope,
} from "../../shared/lib/permissions";
import { listAllSubjects } from "../services/manage";

const inputCls =
  "w-full rounded-xl border border-line-light bg-surface-light p-2 text-sm text-ink-light dark:border-line-dark dark:bg-base-dark dark:text-ink-dark";

type Form = {
  userId: string;
  userName: string;
  scope: Scope;
  subject: string; // "" = all subjects
  level: Level;
  expires: string; // yyyy-mm-dd or ""
};

const EMPTY: Form = {
  userId: "",
  userName: "",
  scope: "quiz",
  subject: "",
  level: "contribute",
  expires: "",
};

const ALL_SCOPES: Scope[] = ["quiz", "lecture", "subjects", "admins"];
const ALL_LEVELS: Level[] = ["contribute", "publish", "manage"];

export default function ManageAdmins() {
  const { user, can, canAny } = useUser();
  const me = () => user()?.id ?? "";
  const isSuper = () => user()?.role === "super-admin";
  const canDelegate = () => isSuper() || can("admins", null, "manage");

  const [staff, { refetch }] = createResource(listStaff);
  const [subjects] = createResource(listAllSubjects);

  const subjectName = (id: string | null) =>
    id === null ? "كل المواد" : (subjects()?.find((s) => s.id === id)?.name ?? id);

  const [form, setForm] = createSignal<Form | null>(null);
  const [busy, setBusy] = createSignal(false);

  // ── user search (debounced) ───────────────────────────────────
  const [query, setQuery] = createSignal("");
  let timer: number | undefined;
  const onSearch = (v: string) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => setQuery(v.trim()), 300);
  };
  const [hits] = createResource(
    () => (query().length >= 2 ? query() : null),
    searchUsersByName,
  );

  // ── what the form may offer (server re-checks everything) ─────
  const fixedLevel = (s: Scope): Level | null =>
    s === "subjects" || s === "admins" ? "manage" : null;

  // A delegate can only hand out scopes/levels he holds himself
  const scopeOptions = () =>
    ALL_SCOPES.filter((s) => (s === "admins" ? isSuper() : isSuper() || canAny(s)));
  const levelOptions = (f: Form) =>
    ALL_LEVELS.filter((l) => isSuper() || can(f.scope, f.subject || null, l));

  const patch = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));

  const openFor = (m?: StaffMember) => {
    setQuery("");
    setForm({
      ...EMPTY,
      userId: m?.id ?? "",
      userName: m?.name ?? "",
      scope: scopeOptions()[0] ?? "quiz",
    });
  };

  const submit = async () => {
    const f = form();
    if (!f) return;
    if (!f.userId) {
      toast.error("اختر المستخدم أولاً");
      return;
    }
    setBusy(true);
    const res = await grantPerm({
      userId: f.userId,
      scope: f.scope,
      subject: f.scope === "admins" ? null : f.subject || null,
      level: fixedLevel(f.scope) ?? f.level,
      expires: f.expires ? new Date(`${f.expires}T23:59:59`).toISOString() : null,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("تم منح الصلاحية ✅");
    setForm(null);
    refetch();
  };

  const revoke = async (g: Grant) => {
    if (!confirm("سحب هذه الصلاحية؟")) return;
    const res = await revokePerm(g.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("تم سحب الصلاحية");
    refetch();
  };

  const demote = async (m: StaffMember) => {
    if (!confirm(`تخفيض ${m.name} إلى طالب؟ ستُسحب كل صلاحياته.`)) return;
    const res = await demoteUser(m.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("تم التخفيض");
    refetch();
  };

  // ── which buttons to show (the RPCs enforce the same rules) ───
  const canRevoke = (g: Grant, m: StaffMember) =>
    g.user_id === me() ||
    (m.role !== "super-admin" &&
      (isSuper() || (can("admins", null, "manage") && g.granted_by === me())));
  const canDemote = (m: StaffMember) =>
    m.role === "admin" &&
    m.id !== me() &&
    (isSuper() ||
      (can("admins", null, "manage") &&
        m.grants.length > 0 &&
        m.grants.every((g) => g.granted_by === me())));
  const canGrantTo = (m: StaffMember) =>
    m.id !== me() && m.role !== "super-admin" && canDelegate();

  const chipText = (g: Grant) =>
    [
      SCOPE_LABEL[g.scope],
      g.scope === "admins" ? null : subjectName(g.subject_id),
      g.scope === "quiz" || g.scope === "lecture" ? LEVEL_SHORT[g.level] : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div class="min-h-dvh bg-base-light px-5 dark:bg-base-dark" dir="rtl">
      <div class="mx-auto flex max-w-lg flex-col gap-4 pt-22 pb-28">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-black text-ink-light dark:text-ink-dark">
            إدارة الأدمنز
          </h1>
          <Show when={canDelegate()}>
            <button
              onClick={() => openFor()}
              class="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-md"
            >
              + صلاحية
            </button>
          </Show>
        </div>

        <Show when={form()}>
          {(f) => (
            <div class="flex flex-col gap-3 rounded-4xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
              {/* user picker */}
              <Show
                when={f().userId}
                fallback={
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-ink-soft-light">المستخدم</label>
                    <input
                      class={inputCls}
                      placeholder="ابحث بالاسم (حرفان على الأقل)"
                      onInput={(e) => onSearch(e.currentTarget.value)}
                    />
                    <For each={hits() ?? []}>
                      {(h) => (
                        <button
                          onClick={() => patch({ userId: h.id, userName: h.name })}
                          class="flex items-center justify-between rounded-xl bg-base-light p-2 text-right text-sm dark:bg-base-dark"
                        >
                          <span class="font-bold text-ink-light dark:text-ink-dark">
                            {h.name}
                          </span>
                          <span class="text-[10px] text-ink-muted-light">
                            {h.role === "student" ? "طالب" : "أدمن"}
                          </span>
                        </button>
                      )}
                    </For>
                  </div>
                }
              >
                <div class="flex items-center justify-between rounded-xl bg-cyan-50 p-2 text-sm dark:bg-cyan-900/20">
                  <span class="font-bold text-cyan-700 dark:text-cyan-300">
                    {f().userName}
                  </span>
                  <button
                    onClick={() => patch({ userId: "", userName: "" })}
                    class="text-xs text-ink-muted-light"
                  >
                    تغيير
                  </button>
                </div>
              </Show>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-ink-soft-light">النوع</label>
                  <select
                    class={inputCls}
                    value={f().scope}
                    onChange={(e) =>
                      patch({ scope: e.currentTarget.value as Scope, level: "contribute" })
                    }
                  >
                    <For each={scopeOptions()}>
                      {(s) => <option value={s}>{SCOPE_LABEL[s]}</option>}
                    </For>
                  </select>
                </div>

                <Show when={f().scope !== "admins"}>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-ink-soft-light">المادة</label>
                    <select
                      class={inputCls}
                      value={f().subject}
                      onChange={(e) => patch({ subject: e.currentTarget.value })}
                    >
                      <Show when={isSuper() || can(f().scope, null, "contribute")}>
                        <option value="">كل المواد</option>
                      </Show>
                      <For each={subjects() ?? []}>
                        {(s) => <option value={s.id}>{s.name}</option>}
                      </For>
                    </select>
                  </div>
                </Show>
              </div>

              <Show when={!fixedLevel(f().scope)}>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-ink-soft-light">المستوى</label>
                  <select
                    class={inputCls}
                    value={f().level}
                    onChange={(e) => patch({ level: e.currentTarget.value as Level })}
                  >
                    <For each={levelOptions(f())}>
                      {(l) => <option value={l}>{LEVEL_LABEL[l]}</option>}
                    </For>
                  </select>
                </div>
              </Show>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-ink-soft-light">
                  ينتهي في (اختياري — مفيد للمتطوعين الخارجيين)
                </label>
                <input
                  type="date"
                  class={inputCls}
                  value={f().expires}
                  onInput={(e) => patch({ expires: e.currentTarget.value })}
                />
              </div>

              <div class="flex gap-2">
                <button
                  onClick={submit}
                  disabled={busy()}
                  class="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-black text-white shadow-md disabled:opacity-50"
                >
                  {busy() ? "جاري الحفظ..." : "منح الصلاحية"}
                </button>
                <button
                  onClick={() => setForm(null)}
                  class="rounded-2xl bg-chip-light px-5 py-3 text-sm font-bold text-ink-soft-light dark:bg-chip-dark"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </Show>

        <Show
          when={!staff.loading}
          fallback={<p class="py-6 text-center text-ink-muted-light">جاري التحميل... ⏳</p>}
        >
          <Show
            when={!staff.error}
            fallback={
              <p class="py-6 text-center text-red-400">تعذر تحميل القائمة</p>
            }
          >
            <div class="flex flex-col gap-3">
              <For each={staff()}>
                {(m) => (
                  <div class="rounded-4xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
                    <div class="flex items-center gap-2">
                      <p class="flex-1 font-bold text-ink-light dark:text-ink-dark">
                        {m.name || "بدون اسم"}
                        <Show when={m.id === me()}>
                          <span class="mr-1 text-[10px] text-ink-muted-light">(أنت)</span>
                        </Show>
                      </p>
                      <span
                        class={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          m.role === "super-admin"
                            ? "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/30"
                            : "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30"
                        }`}
                      >
                        {m.role === "super-admin" ? "سوبر أدمن" : "أدمن"}
                      </span>
                    </div>

                    <Show
                      when={m.role === "admin"}
                      fallback={
                        <p class="mt-2 text-xs text-ink-muted-light">
                          صلاحيات كاملة — تُدار من قاعدة البيانات فقط
                        </p>
                      }
                    >
                      <div class="mt-2 flex flex-wrap gap-1">
                        <Show
                          when={m.grants.length > 0}
                          fallback={
                            <span class="text-xs text-amber-500">
                              بلا صلاحيات — لا يستطيع فعل شيء
                            </span>
                          }
                        >
                          <For each={m.grants}>
                            {(g) => (
                              <span
                                class={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                                  isGrantActive(g)
                                    ? "bg-chip-light text-ink-soft-light dark:bg-chip-dark dark:text-ink-soft-dark"
                                    : "bg-red-50 text-red-400 line-through dark:bg-red-900/20"
                                }`}
                              >
                                {chipText(g)}
                                <Show when={g.expires_at}>
                                  <span class="font-normal text-ink-muted-light">
                                    ⏳ {new Date(g.expires_at!).toLocaleDateString("ar")}
                                  </span>
                                </Show>
                                <Show when={canRevoke(g, m)}>
                                  <button
                                    onClick={() => revoke(g)}
                                    class="text-red-400"
                                    title="سحب"
                                  >
                                    ✕
                                  </button>
                                </Show>
                              </span>
                            )}
                          </For>
                        </Show>
                      </div>
                    </Show>

                    <div class="mt-3 flex gap-2">
                      <Show when={canGrantTo(m)}>
                        <button
                        onClick={() => {openFor(m)
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }}
                          class="rounded-xl bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-600 dark:bg-cyan-900/30"
                        >
                          + صلاحية
                        </button>
                      </Show>
                      <Show when={canDemote(m)}>
                        <button
                          onClick={() => demote(m)}
                          class="rounded-xl bg-red-50 px-3 py-1 text-xs font-bold text-red-600 dark:bg-red-900/30"
                        >
                          تخفيض إلى طالب
                        </button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
