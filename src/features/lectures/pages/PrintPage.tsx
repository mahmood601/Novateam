// src/pages/PrintPage.jsx
import { useSearchParams } from "@solidjs/router";
import { createEffect, createResource, Show, Suspense } from "solid-js";
import { getLecture } from "@/features/shared/services/lecturesUpdates";
import { parseMarkdown } from "../lib/parseMarkdown";
import LecturePrint from "../components/Print/LecturePrint";

export default function PrintPage() {
  const [params] = useSearchParams();
  const [lecture] = createResource(() =>
    getLecture({ subjectId: params.subject, seasonId: params.season }),
  );

  const [html] = createResource(
    () => lecture()?.data?.[0]?.content?.raw,
    parseMarkdown,
  );

  

  return (
    <Suspense fallback={<div>جار التحميل...</div>}>
    <Show when={lecture()?.data && html()} fallback={<div>جار التحميل...</div>}>
      {(data) => {
        return (
          <LecturePrint
            subjectName={params.subject}
            lectureNumber={params.season}
            subjectId={params.subject}
            doctorName={"fkdsj"}
            content={html() ?? ""}
            lectureTitle={"mks;"}
            year="mds"
            semester="mds"
          />
        );
      }}
    </Show>
    </Suspense>
  );
}
