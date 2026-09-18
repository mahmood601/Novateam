import { QuestionUI } from "./types";

export const emptyQStore = {
  subject: "",
  season_id: null as number | null,
  year_id: null as number | null,
  question: "",
  explanation: "",
  options: ["", "", "", ""] as string[],
  correctIndex: 0 as number,
  user_id: "",
};

export function toSnake(data: any) {
  return {
    season_id: data.season_id ?? null,
    year_id: data.year_id ?? null,
    question: data.question,
    explanation: data.explanation || null,
    options: (data.options as string[]).filter(Boolean),
    correct_index: data.correctIndex,
    created_by: data.user_id || null,
    passage_id: data.passage_id ?? null,
  };
}

export function toCamel(row: any): QuestionUI {
  return {
    $id: row.id,
    subject_id: row.subject_id,
    season_id: row.season_id,
    year_id: row.year_id,
    question: row.question,
    explanation: row.explanation,
    options: row.options ?? [],
    correctIndex: row.correct_index,
    user_id: row.created_by,
    seasonName: row.season?.name,
    seasonValue: row.season?.value,
    yearName: row.year?.name,
    yearValue: row.year?.value,
    passage_id: row.passage_id ?? null,
  };
}
