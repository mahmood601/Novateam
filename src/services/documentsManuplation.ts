import { supabase } from "./supabase";
import toast from "solid-toast";
import { setQStore } from "../stores/QStores";
import { reconcile } from "solid-js/store";

// Types

export type Section = {
  id: number;
  subject_id: string;
  type: "season" | "year";
  value: string;
  name: string;
};

export type QuestionUI = {
  $id: string;
  subject_id: string;
  season_id: number | null;
  year_id: number | null;
  question: string;
  explanation: string | null;
  options: string[];           
  correctIndex: number;
  user_id: string | null;
  seasonName?: string;
  seasonValue?: string;
  yearName?: string;
  yearValue?: string;
};

const emptyQStore = {
  subject:      "",
  season_id:    null as number | null,
  year_id:      null as number | null,
  question:     "",
  explanation:  "",
  options:      ["", "", "", ""] as string[],
  correctIndex: 0 as number,
  user_id:      "",
};

//  Helpers 

function toSnake(data: any) {
  return {
    season_id:     data.season_id   ?? null,
    year_id:       data.year_id     ?? null,
    question:      data.question,
    explanation:   data.explanation || null,
    options:       (data.options as string[]).filter(Boolean),
    correct_index: data.correctIndex,
    created_by:    data.user_id     || null,
  };
}

function toCamel(row: any): QuestionUI {
  return {
    $id:          row.id,
    subject_id:   row.subject_id,
    season_id:    row.season_id,
    year_id:      row.year_id,
    question:     row.question,
    explanation:  row.explanation,
    options:      row.options ?? [],
    correctIndex: row.correct_index,
    user_id:      row.created_by,
    seasonName:   row.season?.name,
    seasonValue:  row.season?.value,
    yearName:     row.year?.name,
    yearValue:    row.year?.value,
  };
}

//  Sections

export async function getSections(subjectId: string): Promise<Section[]> {
  const { data, error } = await supabase
    .from("sections")
    .select("id, subject_id, type, value, name")
    .eq("subject_id", subjectId)
    .order("type")
    .order("value");

  if (error) {
    toast.error("فشل تحميل الفصول: " + error.message);
    return [];
  }
  return data ?? [];
}

// INSERT 

export async function insertQuestion(subjectId: string, data: any) {
  const { error } = await supabase
    .from("questions")
    .insert({ ...toSnake(data), subject_id: subjectId });

  if (error) {
    toast.error("there is an error 😕: " + error.message);
    return;
  }

  setQStore(reconcile(emptyQStore as any));
  toast.success("Question added successfully 🎉");
}

// UPDATE 

export async function updateQuestion(
  subjectId: string,
  questionId: string,
  data: any,
) {
  const { error } = await supabase
    .from("questions")
    .update({ ...toSnake(data), subject_id: subjectId })
    .eq("id", questionId);

  if (error) {
    toast.error("there is an error 😕: " + error.message);
    return { error: error.message };
  }

  setQStore(reconcile(emptyQStore as any));
  toast.success("Question updated successfully 🎉");
}

// DELETE 

export async function deleteQuestion(subjectId: string, questionId: string) {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("subject_id", subjectId);

  if (error) {
    toast.error("there is an error 😕: " + error.message);
    return { error: error.message };
  }

  toast.success("Question deleted successfully 🎉");
}

//  LIST paginated (DevMode) 

export async function listQuestions(
  subjectId: string,
  _selectFields: string[],
  filters: { attribute: string; value: string }[],
  pageIndex: number = 0,
) {
  const from = pageIndex * 5;
  const to   = from + 4;

  let query = supabase
    .from("questions")
    .select(
      `*, season:sections!season_id(id,name,value),
           year:sections!year_id(id,name,value)`,
      { count: "exact" },
    )
    .eq("subject_id", subjectId)
    .range(from, to);

  for (const f of filters) {
    if (f.attribute === "season" || f.attribute === "year") {
      const { data: sec } = await supabase
        .from("sections")
        .select("id")
        .eq("subject_id", subjectId)
        .eq("type", f.attribute)
        .eq("value", f.value)
        .maybeSingle();

      if (sec) {
        query = query.eq(
          f.attribute === "season" ? "season_id" : "year_id",
          sec.id,
        );
      }
    }
  }

  const { data, error, count } = await query;

  if (error) {
    toast.error("there is an error 😕: " + error.message);
    return { error: error.message };
  }

  return { documents: (data ?? []).map(toCamel), total: count ?? 0 };
}

//  SINGLE question 

export async function getQuestion(
  subjectId: string,
  questionId: string,
): Promise<QuestionUI | null> {
  const { data, error } = await supabase
    .from("questions")
    .select(
      `*, season:sections!season_id(id,name,value),
           year:sections!year_id(id,name,value)`,
    )
    .eq("subject_id", subjectId)
    .eq("id", questionId)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel(data);
}
