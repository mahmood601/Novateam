import { useParams } from "@solidjs/router";
import { createResource, createSignal } from "solid-js";
import LecturesLayout from "../components/LecturesLayout";
import LectureContent from "../components/LectureContent";
import { getSubjectInfo } from "@/features/shared/services/subjects";
import {
  syncAndGetSections,
  getSeasons,
} from "../../quizzes/services/local/indexeddb/sections";
import type { LectureTocEntry } from "../lib/lectureContentHtml";

export default function LectureViewPage() {
  const params = useParams<{ subject: string; seasonId: string }>();
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
        onToc={(toc: LectureTocEntry[]) => setHeading(toc[0]?.text ?? "")}
      />
    </LecturesLayout>
  );
}