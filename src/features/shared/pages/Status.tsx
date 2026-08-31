/**
 * Sections.tsx
 * ─────────────
 * صفحة عامة — عرض محتويات جدول sections (الدورات والفصول لكل مادة)
 * تبويب لكل مادة → دوراتها (years) → فصولها/محاضراتها (seasons)
 * لا تتطلب تسجيل دخول
 */

import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { supabase } from "../services/supabase";

type SubjectRow = { id: string; name: string };
type SectionRow = {
  id: number;
  subject_id: string;
  type: "year" | "season";
  value: string;
  name: string;
};

type SeasonEntry = {
  id: number;
  value: string;
  name: string;
};

type YearEntry = {
  id: number;
  value: string;
  name: string;
};

type SubjectSections = {
  id: string;
  name: string;
  years: YearEntry[];
  seasons: SeasonEntry[]; // مشتركة بين كل الدورات
};

const YEAR_EMOJIS = ["📅", "🗓️", "📆", "🗒️", "📋"];
const SEASON_BULLET = "👈";



async function fetchSections(): Promise<SubjectSections[]> {
  const [{ data: subjects }, { data: sections }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase
      .from("sections")
      .select("id, subject_id, type, value, name")
      .order("value"),
  ]);

  if (!subjects || !sections) return [];

  const sectionsList = sections as SectionRow[];

  return (subjects as SubjectRow[])
    .map((subject) => {
      const subjectSections = sectionsList.filter(
        (s) => s.subject_id === subject.id,
      );

      const years = subjectSections
        .filter((s) => s.type === "year")
        .sort((a, b) => {
          const av = Number(a.value);
          const bv = Number(b.value);
          if (!isNaN(av) && !isNaN(bv)) return bv - av; // أحدث أولاً
          return b.value.localeCompare(a.value, "ar");
        })
        .map((year) => ({ id: year.id, value: year.value, name: year.name }));

      const seasons = subjectSections
        .filter((s) => s.type === "season")
        .sort((a, b) => {
          const av = Number(a.value);
          const bv = Number(b.value);
          if (!isNaN(av) && !isNaN(bv)) return av - bv;
          return a.name.localeCompare(b.name, "ar");
        })
        .map((s) => ({ id: s.id, value: s.value, name: s.name }));

      return { id: subject.id, name: subject.name, years, seasons };
    })
    .filter((s) => s.years.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export default function SectionsPage() {
  const [data, { refetch }] = createResource(fetchSections);
  const [activeId, setActiveId] = createSignal<string | null>(null);

  // اختر أول مادة تلقائياً
  createMemo(() => {
    const list = data();
    if (list && list.length > 0 && activeId() === null) {
      setActiveId(list[0].id);
    }
  });

  const active = createMemo(
    () => data()?.find((s) => s.id === activeId()) ?? null,
  );

  return (
    <div class="bg-darker-light-1 dark:bg-main-dark min-h-screen" dir="rtl">
      <div class="mx-auto max-w-xl">
        {/* ─── Header ─── */}
        <header class="flex items-center justify-between px-4 pt-5 pb-3">
          <div>
            <h1 class="text-lg font-bold">تصنيف الأقسام</h1>
            <p class="text-xs text-slate-400">الدورات والفصول لكل مادة</p>
          </div>
          <RefreshButton loading={data.loading} onClick={refetch} />
        </header>

        {/* ─── Tabs (المواد) ─── */}

        <Show when={!data.loading} fallback={<TabsSkeleton />}>
          <div class="scrollbar-none w-11/12 justify-self-center rounded-full bg-darker-light-2 dark:bg-lighter-dark-2 flex content-center gap-2 overflow-x-auto px-2 py-2 mb-3">
            <For each={data()}>
              {(subject) => (
                <button
                  onClick={() => {
                    setActiveId(subject.id);
                  }}
                  class="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition"
                  style={{
                    background:
                      activeId() === subject.id
                        ? "var(--color-main)"
                        : "",
                    color: activeId() === subject.id ? "#fff" : undefined,
                  }}
                >
                  {subject.name}
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* ─── محتوى المادة المختارة ─── */}
        <Show when={active()}>
          {(subject) => (
            <div class="space-y-3 px-4 pb-10">
              {/* ملخص */}
              <div class="bg-main-light dark:bg-lighter-dark-1 flex items-center justify-between rounded-2xl px-4 py-3">
                <div>
                  <p class="text-sm font-bold">{subject().name}</p>
                  <p class="text-xs text-slate-400">
                    {subject().years.length} دورة
                    <Show when={subject().seasons.length > 0}>
                      {" · "}
                      {subject().seasons.length} فصل
                    </Show>
                  </p>
                </div>
                <div class="flex gap-2">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-bold"
                    style={{
                      color: "var(--color-main)",
                      background:
                        "color-mix(in srgb, var(--color-main) 14%, transparent)",
                    }}
                  >
                    {subject().years.length} دورة
                  </span>
                  <Show when={subject().seasons.length > 0}>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        color: "var(--color-true)",
                        background:
                          "color-mix(in srgb, var(--color-true) 14%, transparent)",
                      }}
                    >
                      {subject().seasons.length} فصل
                    </span>
                  </Show>
                </div>
              </div>

              {/* الدورات */}
              <div class="overflow-hidden rounded-2xl bg-main-light dark:bg-lighter-dark-1">
                <div class="px-4 py-2.5 border-b border-darker-light-2 dark:border-lighter-dark-2">
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">الدورات</p>
                </div>
                <div class="px-4 py-1">
                  <For each={subject().years}>
                    {(year, idx) => (
                      <div
                        class="flex items-center gap-3 py-2.5"
                        classList={{
                          "border-b border-darker-light-1 dark:border-lighter-dark-2":
                            idx() < subject().years.length - 1,
                        }}
                      >
                        <span class="text-sm">{YEAR_EMOJIS[idx() % YEAR_EMOJIS.length]}</span>
                        <span class="flex-1 text-sm font-bold">{year.name}</span>
                        <span
                          class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono"
                          style={{ color: "var(--color-secondary)" }}
                        >
                          #{year.value}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              {/* الفصول — مرة واحدة للمادة كلها */}
              <Show when={subject().seasons.length > 0}>
                <SeasonsCard seasons={subject().seasons} />
              </Show>

              <Show when={subject().seasons.length === 0}>
                <div class="rounded-2xl bg-main-light dark:bg-lighter-dark-1 px-4 py-4 text-center text-xs text-slate-400">
                  لا توجد فصول مسجلة لهذه المادة
                </div>
              </Show>
            </div>
          )}
        </Show>

        <Show when={data.loading}>
          <ContentSkeleton />
        </Show>

        <Show when={data.error}>
          <div class="mx-4 rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-500">
            حدث خطأ أثناء تحميل البيانات
          </div>
        </Show>

        <p class="pb-4 text-center text-[11px] text-slate-400">
          يتحدث مباشرة من قاعدة البيانات
        </p>
      </div>
    </div>
  );
}

// ─── SeasonsCard ───────────────────────────────────────────────────────────

function SeasonsCard(props: { seasons: SeasonEntry[] }) {
  return (
    <div class="overflow-hidden rounded-2xl bg-main-light dark:bg-lighter-dark-1">
      <div class="px-4 py-2.5 border-b border-darker-light-2 dark:border-lighter-dark-2">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">الفصول / المحاضرات</p>
      </div>
      <div class="px-4 py-1">
        <For each={props.seasons}>
          {(season, idx) => (
            <div
              class="flex items-center gap-3 py-2.5"
              classList={{
                "border-b border-darker-light-1 dark:border-lighter-dark-2":
                  idx() < props.seasons.length - 1,
              }}
            >
              <span class="text-sm">{SEASON_BULLET}</span>
              <span class="flex-1 truncate text-xs">{season.name}</span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono"
                style={{ color: "var(--color-secondary)" }}
              >
                #{season.value}
              </span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────────────

function TabsSkeleton() {
  return (
    <div class="flex animate-pulse gap-2 overflow-x-auto px-4 pb-3">
      <For each={[1, 2, 3, 4, 5]}>
        {() => (
          <div class="h-8 w-20 shrink-0 rounded-full bg-darker-light-2 dark:bg-lighter-dark-2" />
        )}
      </For>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div class="animate-pulse space-y-3 px-4">
      <div class="h-16 rounded-2xl bg-darker-light-2 dark:bg-lighter-dark-2" />
      <For each={[1, 2, 3]}>
        {() => (
          <div class="h-12 rounded-2xl bg-darker-light-2 dark:bg-lighter-dark-2" />
        )}
      </For>
    </div>
  );
}

function RefreshButton(props: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => props.onClick()}
      class="flex size-9 items-center justify-center rounded-full bg-main-light text-slate-500 transition active:scale-95 dark:bg-lighter-dark-1 dark:text-slate-300"
      aria-label="تحديث"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4"
        classList={{ "animate-spin": props.loading }}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}