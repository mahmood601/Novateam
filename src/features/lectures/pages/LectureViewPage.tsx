import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createResource, createSignal, on, onCleanup, onMount } from "solid-js";
import LecturesLayout from "../components/LecturesLayout";
import LectureContent from "../components/LectureContent";
import LectureTOC from "../components/LectureTOC";
import LecturePager from "../components/LecturePager";
import LectureResumeBar from "../components/LectureResumeBar";
import { getSubjectInfo } from "@/features/shared/services/subjects";
import {
  syncAndGetSections,
  getSeasons,
} from "../../quizzes/services/local/indexeddb/sections";
import type { LectureTocEntry } from "../lib/lectureContentHtml";
import "../styles/lectureSearchHighlight.css";
import "../../../../public/print/paged-print.css";
import '../styles/lectureView.css'

export default function LectureViewPage() {
  const params = useParams<{ subject: string; seasonId: string }>();
  // ?q=... set by the search page when the user taps a lecture result —
  // absent on a normal visit (sidebar/TOC navigation), which is fine
  // since LectureContent treats an empty highlightQuery as "do nothing".
  const [searchParams] = useSearchParams<{ q?: string }>();
  const subjectId = () => params.subject;
  const seasonId = () => Number(params.seasonId);

  // العنوان الحالي لآخر عنصر بالـbreadcrumb — نفس أول h1 اللي
  // annotateHeadingsWithIds ولّدته أصلاً جوا LectureContent، ما في داعي
  // لأي حساب إضافي (scroll-spy أو غيره).
  const [heading, setHeading] = createSignal("");

  const [toc, setToc] = createSignal<LectureTocEntry[]>([]);
  const navigate = useNavigate();

  const [subjectInfo] = createResource(subjectId, (id) => getSubjectInfo(id));
  const [seasons] = createResource(subjectId, (id) =>
    syncAndGetSections(id).then(() => getSeasons(id)),
  );
  const lectureName = () =>
    seasons()?.find((s) => s.id === seasonId())?.name ?? `الفصل ${seasonId()}`;

  // Previous/next across ALL seasons, ordered by id (same order as the sidebar)
  const sortedSeasons = createMemo(() =>
    [...(seasons() ?? [])].sort((a, b) => a.id - b.id),
  );
  const neighbors = createMemo(() => {
    const list = sortedSeasons();
    const i = list.findIndex((s) => s.id === seasonId());
    const toLink = (s?: { id: number; name: string }) =>
      s ? { href: `/${subjectId()}/lectures/${s.id}`, title: s.name } : undefined;
    return i === -1
      ? { prev: undefined, next: undefined }
      : { prev: toLink(list[i - 1]), next: toLink(list[i + 1]) };
  });

  // Back to the top when switching lectures (the scroller stays mounted)
  createEffect(
    on(seasonId, () => {
      document.querySelector(".lecture-content")?.scrollTo({ top: 0 });
    }, { defer: true }),
  );

  // Keyboard (desktop): in RTL, ← is "next" and → is "previous"
  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const link = e.key === "ArrowLeft" ? neighbors().next
        : e.key === "ArrowRight" ? neighbors().prev : undefined;
      if (link) navigate(link.href);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  const breadcrumb = () => [
    { label: subjectInfo()?.name ?? subjectId(), href: `/` },
    { label: lectureName(), href: `/${subjectId()}` },
    { label: heading() || "..." },
  ];

  return (
    <LecturesLayout breadcrumb={breadcrumb()} toc={<LectureTOC entries={toc()} />}>
      <LectureContent
        subjectId={subjectId()}
        seasonId={seasonId()}
        highlightQuery={searchParams.q}
        onToc={(entries: LectureTocEntry[]) => {
          setHeading(entries[0]?.text ?? "");
          setToc(entries);
        }}
      />
      <LectureResumeBar subjectId={subjectId()} seasonId={seasonId()} entries={toc()} />
      <LecturePager prev={neighbors().prev} next={neighbors().next} />
    </LecturesLayout>
  );
}
