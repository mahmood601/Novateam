import { useParams, useSearchParams } from "@solidjs/router";
import { createResource, createSignal } from "solid-js";
import LecturesLayout from "../components/LecturesLayout";
import LectureContent from "../components/LectureContent";
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

  const [subjectInfo] = createResource(subjectId, (id) => getSubjectInfo(id));
  const [seasons] = createResource(subjectId, (id) =>
    syncAndGetSections(id).then(() => getSeasons(id)),
  );
  const lectureName = () =>
    seasons()?.find((s) => s.id === seasonId())?.name ?? `الفصل ${seasonId()}`;

  const breadcrumb = () => [
    { label: subjectInfo()?.name ?? subjectId(), href: `/` },
    { label: lectureName(), href: `/${subjectId()}` },
    { label: heading() || "..." },
  ];

  return (
    <LecturesLayout breadcrumb={breadcrumb()}>
      <LectureContent
        subjectId={subjectId()}
        seasonId={seasonId()}
        highlightQuery={searchParams.q}
        onToc={(toc: LectureTocEntry[]) => setHeading(toc[0]?.text ?? "")}
      />
    </LecturesLayout>
  );
}
