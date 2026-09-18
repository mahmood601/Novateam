import { useParams } from "@solidjs/router";
import { createResource } from "solid-js";
import LecturesLayout from "../components/LecturesLayout";
import { getSubjectInfo } from "@/features/shared/services/subjects";

export default function LecturesListPage() {
  const params = useParams<{ subject: string }>();
  const subjectId = () => params.subject;

  const [subjectInfo] = createResource(subjectId, (id) => getSubjectInfo(id));

  const breadcrumb = () => [
    { label: subjectInfo()?.name ?? subjectId(), href: `/${subjectId()}` },
    { label: "المحاضرات" },
  ];

  return (
    <LecturesLayout breadcrumb={breadcrumb()}>
      <div class="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
        <p class="text-sm opacity-60">اختر محاضرة للبدء</p>
      </div>
    </LecturesLayout>
  );
}