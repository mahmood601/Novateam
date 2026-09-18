import { supabase } from "../../shared/services/supabase";
import toast from "solid-toast";
import { setQStore } from "../stores/QStores";
import { reconcile } from "solid-js/store";
import { toSnake, toCamel, emptyQStore } from "./helpers";
import { QuestionUI } from "./types";

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

export async function listQuestions(
  subjectId: string,
  _selectFields: string[],
  filters: { attribute: string; value: string }[],
  pageIndex: number = 0,
) {
  const from = pageIndex * 5;
  const to = from + 4;

  let query = supabase
    .from("questions")
    .select(
      `*, image_url, season:sections!season_id(id,name,value),
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
