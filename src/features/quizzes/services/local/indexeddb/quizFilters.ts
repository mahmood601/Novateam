import { db } from "./db";
import type { Answer, Question } from "../../../types";
import { getFavorites } from "./favorites";

// ============================================
// Composable quiz filters
// ============================================
// season/year are now multi-select — the user can pick several lectures
// (seasons) and/or several years together, not just one. An empty/absent
// array means "الكل" (all) for that dimension — there's no separate
// "all" flag, picking nothing IS all, and the UI's "الكل" chip just
// clears the array back to empty.
//
// Any subset of the four dimensions (season, year, favorite, weak) can
// be active together — this is the "open" filter model, replacing the
// old one-filter-per-route pages (season_id-N / year_id-N / favorite /
// weak as separate pages).
//
// Dexie compound indexes only match a single value per query, but
// `.anyOf()` lets us match several season/year ids in one indexed query
// (no full table scan). When BOTH season and year are multi-selected, we
// query by season (indexed) and filter year in memory — per-subject
// question counts are small enough for this to be cheap (same tradeoff
// already used by the search page's filter panel).

export type QuizFilters = {
  seasonIds?: number[]; // empty/undefined = كل الفصول
  yearIds?: number[]; // empty/undefined = كل السنين
  favoriteOnly?: boolean;
  weakOnly?: boolean;
};

export function hasActiveFilters(f: QuizFilters): boolean {
  return !!(f.seasonIds?.length || f.yearIds?.length || f.favoriteOnly || f.weakOnly);
}

export function activeFilterCount(f: QuizFilters): number {
  return [
    f.seasonIds?.length ? 1 : 0,
    f.yearIds?.length ? 1 : 0,
    f.favoriteOnly ? 1 : 0,
    f.weakOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
}

// Stable string key for the active combo — used to key session/progress
// storage so switching filters inside the quiz behaves like a distinct
// "quiz" for resume/position tracking, same as the old per-route
// behavior, without needing a route change per combination.
export function filtersKey(f: QuizFilters): string {
  const parts = [
    f.seasonIds?.length ? `s${[...f.seasonIds].sort((a, b) => a - b).join(",")}` : "",
    f.yearIds?.length ? `y${[...f.yearIds].sort((a, b) => a - b).join(",")}` : "",
    f.favoriteOnly ? "fav" : "",
    f.weakOnly ? "weak" : "",
  ].filter(Boolean);
  return parts.length ? parts.join("_") : "all";
}

async function fetchByFilterBase<
  T extends { subject: string; season_id?: number | null; year_id?: number | null },
>(
  table: "questions" | "answers",
  subject: string,
  seasonIds?: number[],
  yearIds?: number[],
): Promise<T[]> {
  const t = db[table] as any;
  const hasSeasons = !!seasonIds?.length;
  const hasYears = !!yearIds?.length;

  if (hasSeasons) {
    const rows: T[] = await t
      .where("[subject+season_id]")
      .anyOf(seasonIds!.map((id) => [subject, id]))
      .toArray();
    return hasYears ? rows.filter((r) => yearIds!.includes(r.year_id as number)) : rows;
  }
  if (hasYears) {
    return t
      .where("[subject+year_id]")
      .anyOf(yearIds!.map((id) => [subject, id]))
      .toArray();
  }
  return t.where("subject").equals(subject).toArray();
}

function sortByCreatedAt<T extends { created_at?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

// Wrong-attempt counts per question — always computed regardless of
// whether weakOnly is active, so the UI can show a "missed N times"
// badge on any question the user has gotten wrong before, not only
// while filtering by weak questions.
async function getWeakAttemptsMap(subject: string): Promise<Map<string, number>> {
  const wrongAnswers = (await db.answers.where("subject").equals(subject).toArray()).filter(
    (a: Answer) => !a.answer,
  );
  return new Map(wrongAnswers.map((a: Answer) => [a.$id, a.attempts ?? 1]));
}

export type QuizFilterResult = {
  questions: Question[];
  weakAttemptsMap: Map<string, number>;
};

export async function getQuestionsWithFilters(
  subject: string,
  filters: QuizFilters,
): Promise<QuizFilterResult> {
  let questions = await fetchByFilterBase<Question>(
    "questions",
    subject,
    filters.seasonIds,
    filters.yearIds,
  );

  const weakAttemptsMap = await getWeakAttemptsMap(subject);

  if (filters.favoriteOnly) {
    const favIds = new Set((await getFavorites(subject)).map((f) => f.questionId));
    questions = questions.filter((q) => favIds.has(q.$id));
  }

  if (filters.weakOnly) {
    questions = questions.filter((q) => weakAttemptsMap.has(q.$id));
  }

  return { questions: sortByCreatedAt(questions), weakAttemptsMap };
}

// Persisted answers for the same filter combo — used for "continue"
// resume logic, mirroring getQuestionsWithFilters (favorite/weak don't
// need to narrow this: it's only used to find the first unanswered
// question among the already-filtered `questions` list).
export async function getAnswersWithFilters(
  subject: string,
  filters: QuizFilters,
): Promise<Answer[]> {
  const rows = await fetchByFilterBase<Answer>(
    "answers",
    subject,
    filters.seasonIds,
    filters.yearIds,
  );
  return sortByCreatedAt(rows);
}

// Parses the legacy `/:subject/season_id-5` and `/:subject/year_id-2024`
// route params into the new filter shape, so existing links (from
// SelectMenu) keep working unchanged as an *initial* (single-value)
// filter — the user can still open the in-quiz filter sheet afterwards
// to add more seasons/years to the selection.
export function filtersFromLegacySection(section: string): QuizFilters {
  const [type, rawId] = section.split("-");
  const id = Number(rawId);
  if (!id) return {};
  if (type === "season_id") return { seasonIds: [id] };
  if (type === "year_id") return { yearIds: [id] };
  return {};
}

// ============================================
// Manual reset (persisted, not just in-memory)
// ============================================
// "leave solved questions solved across visits" (loaded via
// getAnswersWithFilters on mount) means the *only* way a question goes
// back to unanswered is the user explicitly resetting it — these two
// delete the persisted db.answers row(s), not just the session's
// quizState.userAnswers copy of them.

export async function getQuestionById(id: string): Promise<Question | undefined> {
  return db.questions.get(id);
}

export async function deleteAnswerById(id: string): Promise<void> {
  await db.answers.delete(id);
}

export async function deleteAnswersByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.answers.bulkDelete(ids);
}
