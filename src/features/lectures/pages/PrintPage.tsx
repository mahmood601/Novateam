// src/pages/PrintPage.jsx
import { useSearchParams } from "@solidjs/router";
import { createResource, Show, Suspense } from "solid-js";
import { getLecture } from "@/features/shared/services/lecturesUpdates";
import LecturePrint from "../components/Print/LecturePrint";
import { getSeasonNameFromRemote, getSeasonsFromRemote } from "@/features/shared/services/sections";
import { getSubjectInfo, trasnlationMap } from "@/features/shared/services/subjects";
import { createEffect } from "solid-js";

export default function PrintPage() {
  const [params] = useSearchParams();
  const subjectId = params.subject as string;
  const seasonValue = params.season as string;

  const [seasons] = createResource(() => getSeasonsFromRemote(subjectId));
  const seasonIndex = () => {
    const list = seasons();
    const targetSeasonId = Number.parseInt(seasonValue ?? "", 10);

    if (!list || list.length === 0 || Number.isNaN(targetSeasonId)) return -1;

    return list.findIndex((season) => Number(season.id) === targetSeasonId);
  };

  const lectureNumber = () => {
    const index = seasonIndex();
    return index >= 0 ? index + 1 : undefined;
  };

  const [lecture] = createResource(() =>
    getLecture({ subjectId: params.subject, seasonId: params.season }),
  );

  const content = () => lecture()?.data?.[0]?.content?.raw;

  const [seasonName] = createResource(() => getSeasonNameFromRemote(subjectId, seasonValue));
  const [subjectInfo] = createResource(() =>
    getSubjectInfo(subjectId).then((res) => ({
      name: res?.name,
      year_key: trasnlationMap[res?.year_key],
      semester: trasnlationMap[res?.semester],
    })),
  );

  const resourcesReady = () => {
    const seasonsReady = !!seasons() && !seasons.loading;
    const lectureReady = !!lecture()?.data && !!content();
    const seasonNameReady = seasonName() !== undefined && !seasonName.loading;
    const subjectInfoReady = !!subjectInfo() && !subjectInfo.loading;

    return seasonsReady && lectureReady && seasonNameReady && subjectInfoReady;
  };

  return (
    <Suspense fallback={<div>جار التحميل...</div>}>
    <Show when={resourcesReady()} fallback={<div>جار التحميل...</div>}>
      {(data) => {
        return (
          <LecturePrint
            subjectName={subjectInfo()?.name ?? ""}
            lectureNumber={lectureNumber() ?? ""}
            subjectId={params.subject}
            seasonName={seasonName() ?? ""}
            doctorName={lecture()?.data?.[0].doctor_name || ""}
            content={content() ?? ""}
            lectureTitle={seasonName()}
            year={subjectInfo()?.year_key}
            semester={subjectInfo()?.semester}
          />
        );
      }}
    </Show>
    </Suspense>
  );
}
