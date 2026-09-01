// src/pages/PrintPage.jsx
import { useSearchParams } from "@solidjs/router";
import {  createResource, Show, Suspense } from "solid-js";
import { getLecture } from "@/features/shared/services/lecturesUpdates";
import { parseMarkdown } from "../lib/parseMarkdown";
import LecturePrint from "../components/Print/LecturePrint";
import { getSeasonNameFromRemote } from "@/features/shared/services/sections";
import { getSubjectInfo, trasnlationMap } from "@/features/shared/services/subjects";

export default function PrintPage() {
  const [params] = useSearchParams();
  const subjectId = params.subject as string;
  const seasonValue = params.season as string;
  
  const [lecture] = createResource(() =>
    getLecture({ subjectId: params.subject, seasonId: params.season }),
  );

  const [html] = createResource(
    () => lecture()?.data?.[0]?.content?.raw,
    parseMarkdown,
  );

  const [seasonName] = createResource(()=> getSeasonNameFromRemote(subjectId, seasonValue))
  const [subjectInfo] = createResource(()=> getSubjectInfo(subjectId).then(res => { return { name: res?.name, year_key: trasnlationMap[res?.year_key], semester: trasnlationMap[res?.semester] } }) )  

  return (
    <Suspense fallback={<div>جار التحميل...</div>}>
    <Show when={lecture()?.data && html()} fallback={<div>جار التحميل...</div>}>
      {(data) => {
        return (
          <LecturePrint
            subjectName={subjectInfo()?.name ?? ""}
            lectureNumber={params.season}
            subjectId={params.subject}
            seasonName={seasonName() ?? ""}
            doctorName={data()?.doctorName || ""}
            content={html() ?? ""}
            lectureTitle={seasonName()}
            year={subjectInfo()?.year_key }
            semester={subjectInfo()?.semester }
          />
        );
      }}
    </Show>
    </Suspense>
  );
}
