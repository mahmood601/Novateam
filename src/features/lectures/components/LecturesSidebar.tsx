import { createResource, createMemo, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { syncAndGetLectures } from "../services/local/indexeddb/lectures";
import {
  syncAndGetSections,
  getSeasons,
} from "../../quizzes/services/local/indexeddb/sections";

interface Props {
  subjectId: string;
  open?: boolean;
}

export default function LecturesSidebar(props: Props) {
  // قائمة المحاضرات (metadata من الكاش المحلي، stale-while-revalidate)
  const [lectures] = createResource(
    () => props.subjectId,
    (subjectId) => syncAndGetLectures(subjectId),
  );

  // أسماء الفصول (sections بنوع season) — نفس الجدول المحلي اللي تستخدمه
  // الكويزات أصلاً، عشان نعرض اسم حقيقي بدل "الفصل 3"
  const [seasons] = createResource(
    () => props.subjectId,
    (subjectId) => syncAndGetSections(subjectId).then(() => getSeasons(subjectId)),
  );

  const seasonName = (seasonId: number) =>
    seasons()?.find((s) => s.id === seasonId)?.name ?? `الفصل ${seasonId}`;

  const sortedLectures = createMemo(() =>
    [...(lectures() ?? [])].sort((a, b) => a.season_id - b.season_id),
  );

  return (
    <nav
      dir="rtl"
      aria-label="قائمة المحاضرات"
      class={`lecture-sidebar ${props.open ? "lecture-sidebar--open" : ""}`}
    >

      <Show
        when={!lectures.loading}
        fallback={<p class="p-4 text-sm opacity-60">جاري التحميل...</p>}
      >
        <Show
          when={sortedLectures().length > 0}
          fallback={
            <p class="p-4 text-sm opacity-60">لا توجد محاضرات منشورة بعد لهذه المادة</p>
          }
        >
          <ul class="flex flex-col gap-0.5 p-2">
            <For each={sortedLectures()}>
              {(lecture) => (
                <li>
                  <A
                    href={`/${props.subjectId}/lectures/${lecture.season_id}`}
                    end
                    class="block rounded-lg px-3 py-2 text-sm opacity-80 transition hover:bg-[var(--sidebar-accent)] hover:opacity-100"
                    activeClass="bg-[var(--sidebar-accent)] font-bold opacity-100"
                  >
                    {seasonName(lecture.season_id)}
                  </A>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </nav>
  );
}
