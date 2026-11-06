import { createResource, Show } from "solid-js";
import { Send } from "lucide-solid";
import ContentCredit from "../../shared/components/ContentCredit";
import { getLectureCredit } from "../../shared/services/authors";
import { db } from "../../quizzes/services/local/indexeddb/db";

export const TELEGRAM_BOT_URL = "https://t.me/nova_pwa_bot";

interface Props {
  subjectId: string;
  seasonId: number;
}

// آخر عنصر في صفحة عرض المحاضرة: من أضافها + آخر تعديل + تواصل مع الفريق.
export default function LectureFooter(props: Props) {
  const [credit] = createResource(
    () => [props.subjectId, props.seasonId] as const,
    async ([subjectId, seasonId]) => {
      const remote = await getLectureCredit(subjectId, seasonId);
      if (remote) return remote;
      // offline: على الأقل تاريخ آخر تعديل من الكاش المحلي
      const local = await db.lectures
        .where("[subject_id+season_id]")
        .equals([subjectId, seasonId])
        .first()
        .catch(() => undefined);
      return local
        ? { created_by: null, updated_by: null, updated_at: local.updated_at }
        : null;
    },
  );

  return (
    <footer dir="rtl" class="lecture-footer">
      <Show when={credit()}>
        {(c) => (
          <ContentCredit
            class="lecture-footer__credit"
            addedLabel="أضافها"
            createdBy={c().created_by}
            updatedBy={c().updated_by}
            updatedAt={c().updated_at}
          />
        )}
      </Show>

      <div class="lecture-footer__contact">
        <div class="lecture-footer__text">
          <p class="lecture-footer__title">لاحظت خطأ أو عندك اقتراح؟</p>
          <p class="lecture-footer__hint">
            تواصل مع فريق نوفا مباشرة عبر تلجرام.
          </p>
        </div>
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="lecture-footer__btn"
        >
          <Send size={16} />
          تواصل مع الفريق
        </a>
      </div>
    </footer>
  );
}
