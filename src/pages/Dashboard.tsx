import { createEffect, createResource, createSignal, For, Match, Show, Suspense, Switch } from "solid-js";
import { useLocation, useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { supabase } from "../services/supabase";
import { getSections, type QuestionUI, type Section } from "../services/documentsManipulation";
import { fetchUserNames } from "../services/user";
import { useUser } from "../context/user";
import toast from "solid-toast";
import { QuestionCard } from "../components/Dashboard/components/QuestionCard";
import { SmartImporter } from "../components/Dashboard/components/SmartImporter";
import { ManualForm } from "../components/Dashboard/components/ManualForm";
import { PassageManager } from "../components/Dashboard/components/PassageManager";
import { BulkActionBar } from "../components/Dashboard/components/BulkActionBar";
import { SubjectPicker } from "../components/Dashboard/components/SubjectPicker";
import { SuggestionsManager } from "../components/Dashboard/components/SuggestionsManager";

export type qModeT = "insert" | "edit" | "delete" | "";
export { ManualForm } from "../components/Dashboard/components/ManualForm";
export { SectionSelectors } from "../components/Dashboard/components/SectionSelectors";
export { SubjectPicker } from "../components/Dashboard/components/SubjectPicker";

const PAGE_SIZE = 10;

export default function Dashboard() {
  const params = useParams();
  const location = useLocation();
  const { user } = useUser();
  const navigate = useNavigate();

  const [pickedSubject, setPickedSubject] = createSignal<string | null>(null);
  const subjectId = () => params.subject || pickedSubject();

  const [searchParams, setSearchParams] = useSearchParams();
  const isInFavorite = () => location.pathname.includes("favorite");

  const [page, setPage] = createSignal(0);
  const [mode, setMode] = createSignal<"smart" | "manual">("smart");
  const [showAdd, setShowAdd] = createSignal(false);
  const [editTarget, setEditTarget] = createSignal<QuestionUI | null>(null);
  const [mainTab, setMainTab] = createSignal<"questions" | "passages" | "suggestions">("questions");

  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set<string>());
  const [selectionMode, setSelectionMode] = createSignal(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set<string>());
    setSelectionMode(false);
  };

  const toggleSelectAll = () => {
    const currentIds = data()?.questions.map((q) => q.$id) ?? [];
    const allSelected = currentIds.every((id) => selectedIds().has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        currentIds.forEach((id) => next.delete(id));
        if (next.size === 0) setSelectionMode(false);
      } else {
        currentIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const filterSeasonId = () => (searchParams.season ? Number(searchParams.season) : null);
  const filterYearId = () => (searchParams.year ? Number(searchParams.year) : null);

  const [sections] = createResource(() => getSections(subjectId() ?? ""));

  const [data, { refetch }] = createResource(
    () => ({
      p: page(),
      seasonId: filterSeasonId(),
      yearId: filterYearId(),
    }),
    async ({ p, seasonId, yearId }) => {
      let query = supabase
        .from("questions")
        .select(
          `*, image_url, season:sections!season_id(id,name,value),
               year:sections!year_id(id,name,value)`,
          { count: "exact" },
        )
        .eq("subject_id", subjectId() ?? "");

      if (seasonId) query = query.eq("season_id", seasonId);
      if (yearId) query = query.eq("year_id", yearId);

      const { data: rows, count, error } = await query
        .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(error.message);
        return {
          questions: [],
          total: 0,
          namesMap: new Map<string, string>(),
          passagesMap: new Map<string, string>(),
        };
      }

      const questions: QuestionUI[] = (rows ?? []).map((row: any) => ({
        $id: row.id,
        subject_id: row.subject_id,
        season_id: row.season_id,
        year_id: row.year_id,
        question: row.question,
        explanation: row.explanation,
        options: row.options ?? [],
        correctIndex: row.correct_index,
        user_id: row.created_by,
        passage_id: row.passage_id,
        seasonName: row.season?.name,
        seasonValue: row.season?.value,
        yearName: row.year?.name,
        yearValue: row.year?.value,
        image_url: row.image_url,
      }));

      const userIds = questions.map((q) => q.user_id).filter(Boolean) as string[];
      const namesMap = await fetchUserNames(userIds);

      const passageIds = [...new Set(questions.map((q) => q.passage_id).filter(Boolean))] as string[];
      const passagesMap = new Map<string, string>();
      if (passageIds.length > 0) {
        const { data: passageRows } = await supabase
          .from("passages")
          .select("id, content")
          .in("id", passageIds);
        (passageRows ?? []).forEach((r: any) => passagesMap.set(r.id, r.content));
      }

      return { questions, total: count ?? 0, namesMap, passagesMap };
    },
  );

  const openEdit = (q: QuestionUI) => {
    setEditTarget(q);
    setMode("manual");
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onFormComplete = () => {
    setShowAdd(false);
    setEditTarget(null);
    refetch();
  };

  createEffect(() => {
    if (user() && user()?.role !== "admin") {
      navigate("/", { replace: true });
    }
  });

  if (!subjectId()) {
    return <SubjectPicker onSelect={(id) => {
      setPickedSubject(id);
      navigate(`/dashboard/${id}`, { replace: true });
    }} />;
  }

  return (
    <Show when={!isInFavorite()}>
      <div class="min-h-screen bg-[#f8fafc] px-5 pt-22 pb-10 dark:bg-[#0f172a]" dir="rtl">
        <div class="mx-auto mb-8 flex max-w-4xl items-center justify-between rounded-[2.5rem] bg-white/80 p-6 shadow-sm backdrop-blur-md dark:bg-slate-800/80">
          <div>
            <h1 class="text-2xl font-black text-slate-800 dark:text-white">
              إدارة المحتوى
            </h1>
            <div class="mt-3 flex items-center gap-1">
              <p class="text-sm text-slate-400">
                المادة: <span class="font-bold text-slate-600 dark:text-slate-300">{subjectId()}</span>
              </p>
              <button
                onClick={() => {
                  setPickedSubject(null);
                  navigate("/dashboard", { replace: true });
                }}
                class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                title="تغيير المادة"
              >
                تغيير ↩
              </button>
            </div>
          </div>
          <div class="flex flex-col-reverse items-center gap-2 lg:flex-row">
            <button
              onClick={() => {
                if (selectionMode()) {
                  clearSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              class={`flex h-7 w-7 items-center justify-center rounded-full text-lg transition-all ${
                selectionMode()
                  ? "bg-cyan-500 text-white shadow-lg"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
              }`}
              title={selectionMode() ? "إلغاء وضع التحديد" : "تحديد متعدد"}
            >
              {selectionMode() ? "✕" : "☑"}
            </button>
            <button
              onClick={() => {
                setEditTarget(null);
                setShowAdd(!showAdd());
              }}
              class={`flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg transition-all ${
                showAdd()
                  ? "rotate-45 bg-slate-800"
                  : "bg-gradient-to-tr from-cyan-400 to-fuchsia-500"
              }`}
            >
              +
            </button>
          </div>
        </div>

        <Show when={mainTab() === "questions"}>
          <Show when={showAdd()}>
            <div class="mb-12 rounded-[3rem] border-4 border-cyan-50 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <Show when={!editTarget()}>
                <div class="mx-auto mb-8 flex w-fit rounded-full bg-slate-100 p-1 dark:bg-slate-900">
                  <button
                    onClick={() => setMode("smart")}
                    class={`rounded-full px-8 py-2 font-bold transition-all ${mode() === "smart" ? "bg-white text-cyan-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
                  >
                    🚀 ذكي
                  </button>
                  <button
                    onClick={() => setMode("manual")}
                    class={`rounded-full px-8 py-2 font-bold transition-all ${mode() === "manual" ? "bg-white text-fuchsia-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
                  >
                    ✍️ يدوي
                  </button>
                </div>
              </Show>

              <Switch>
                <Match when={mode() === "smart" && !editTarget()}>
                  <SmartImporter
                    subjectId={subjectId() ?? ""}
                    sections={sections() ?? []}
                    onComplete={onFormComplete}
                  />
                </Match>
                <Match when={mode() === "manual" || !!editTarget()}>
                  <ManualForm
                    subjectId={subjectId() ?? ""}
                    sections={sections() ?? []}
                    editQuestion={editTarget()}
                    onComplete={onFormComplete}
                  />
                </Match>
              </Switch>
            </div>
          </Show>
        </Show>

        <Show when={sections()}>
          <div class="mx-auto mb-6 max-w-4xl">
            <div class="rounded-[2rem] bg-white p-4 shadow-sm dark:bg-slate-800">
              <p class="mb-3 text-xs font-bold text-slate-400">
                🔍 تصفية الأسئلة
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-slate-500 dark:text-slate-400">
                    الفصل
                  </label>
                  <select
                    class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                    onChange={(e) => {
                      setPage(0);
                      setSearchParams({ season: e.currentTarget.value || undefined });
                    }}
                  >
                    <option value="">الكل</option>
                    <For each={sections()?.filter((s: Section) => s.type === "season").sort((a, b) => +a.value - +b.value)}>
                      {(s) => (
                        <option value={s.id} selected={filterSeasonId() === s.id}>
                          {s.name}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-slate-500 dark:text-slate-400">
                    السنة
                  </label>
                  <select
                    class="rounded-2xl bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300 dark:bg-slate-900 dark:text-white"
                    onChange={(e) => {
                      setPage(0);
                      setSearchParams({ year: e.currentTarget.value || undefined });
                    }}
                  >
                    <option value="">الكل</option>
                    <For each={sections()?.filter((s: Section) => s.type === "year").sort((a, b) => +b.value - +a.value)}>
                      {(y) => (
                        <option value={y.id} selected={filterYearId() === y.id}>
                          {y.name}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </div>
              <Show when={filterSeasonId() || filterYearId()}>
                <button
                  onClick={() => {
                    setPage(0);
                    setSearchParams({ season: undefined, year: undefined });
                  }}
                  class="mt-2 text-xs text-red-400 underline"
                >
                  ✕ إلغاء الفلترة
                </button>
              </Show>
            </div>
          </div>
        </Show>

        <div class="mx-auto mb-6 flex w-fit max-w-4xl rounded-full bg-slate-100 p-1 dark:bg-slate-900">
          <button
            onClick={() => setMainTab("questions")}
            class={`rounded-full px-4 py-2 text-sm font-bold transition-all ${mainTab() === "questions" ? "bg-white text-cyan-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
          >
            📋 الأسئلة
          </button>
          <button
            onClick={() => setMainTab("passages")}
            class={`rounded-full px-4 py-2 text-sm font-bold transition-all ${mainTab() === "passages" ? "bg-white text-amber-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
          >
            🗒️ المقالات
          </button>
          <button
            onClick={() => setMainTab("suggestions")}
            class={`rounded-full px-4 py-2 text-sm font-bold transition-all ${mainTab() === "suggestions" ? "bg-white text-green-600 shadow-sm dark:bg-slate-700" : "text-slate-400"}`}
          >
            💡 المقترحات
          </button>
        </div>

        <div class="mx-auto max-w-4xl pb-12">
          <Show when={mainTab() === "passages"}>
            <PassageManager subjectId={subjectId() ?? ""} />
          </Show>

          <Show when={mainTab() === "suggestions"}>
            <SuggestionsManager subjectId={subjectId() ?? ""} sections={sections() ?? []} onApplied={refetch} />
          </Show>

          <Show when={mainTab() === "questions"}>
            <Suspense fallback={<div class="animate-pulse p-20 text-center text-slate-400">جاري تحميل الأسئلة... 🧬</div>}>
              <Show
                when={(data()?.total ?? 0) > 0}
                fallback={
                  <p class="py-20 text-center text-slate-400">
                    {filterSeasonId() || filterYearId()
                      ? "لا توجد أسئلة لهذا الفلتر 🔍"
                      : "لا توجد أسئلة بعد 🎯"}
                  </p>
                }
              >
                <p class="mb-4 text-sm text-slate-400">
                  إجمالي:{" "}
                  <span class="font-bold text-slate-600 dark:text-slate-300">
                    {data()?.total}
                  </span>
                  <Show when={filterSeasonId() || filterYearId()}>
                    <span class="mr-2 text-cyan-500">(مُفلترة)</span>
                  </Show>
                  <Show when={selectionMode()}>
                    <button
                      onClick={toggleSelectAll}
                      class="mr-3 text-xs font-bold text-cyan-600 underline"
                    >
                      {(data()?.questions ?? []).every((q) => selectedIds().has(q.$id))
                        ? "إلغاء تحديد الصفحة"
                        : `تحديد الصفحة (${data()?.questions.length})`}
                    </button>
                    <Show when={selectedIds().size > 0}>
                      <span class="mr-1 text-xs font-bold text-cyan-700">
                        — {selectedIds().size} محدد إجمالاً
                      </span>
                    </Show>
                  </Show>
                </p>

                <div class="mb-10 grid gap-4">
                  <For each={data()?.questions}>
                    {(q, i) => (
                      <QuestionCard
                        question={q}
                        index={page() * PAGE_SIZE + i() + 1}
                        subjectId={subjectId() ?? ""}
                        namesMap={data()?.namesMap ?? new Map()}
                        passagesMap={data()?.passagesMap ?? new Map()}
                        onRefetch={refetch}
                        onEdit={openEdit}
                        isSelected={selectedIds().has(q.$id)}
                        onToggleSelect={toggleSelect}
                        selectionMode={selectionMode()}
                      />
                    )}
                  </For>
                </div>

                <Show when={(data()?.total ?? 0) > PAGE_SIZE}>
                  <div class="mt-12 flex flex-wrap justify-center gap-2 pb-12">
                    <For each={Array.from({ length: Math.ceil((data()?.total ?? 0) / PAGE_SIZE) })}>
                      {(_, i) => (
                        <button
                          onClick={() => {
                            setPage(i());
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          class={`h-8 w-8 rounded-full p-1 text-sm font-bold transition-all ${
                            page() === i()
                              ? "scale-110 bg-cyan-500 text-white"
                              : "bg-white text-slate-400 shadow-sm hover:bg-slate-50"
                          }`}
                        >
                          {i() + 1}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </Suspense>
          </Show>
        </div>
      </div>

      <Show when={selectedIds().size > 0}>
        <BulkActionBar
          selectedIds={selectedIds()}
          sections={sections() ?? []}
          subjectId={subjectId() ?? ""}
          onClear={clearSelection}
          onComplete={() => {
            clearSelection();
            refetch();
          }}
        />
      </Show>
    </Show>
  );
}
