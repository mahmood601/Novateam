import { supabase } from "../../shared/services/supabase";
import toast from "solid-toast";
import { setQStore } from "../stores/QStores";
import { reconcile } from "solid-js/store";
import { toSnake, toCamel, emptyQStore } from "./helpers";
import { QuestionStatus, QuestionUI } from "./types";

// Postgres (RLS) answers "you may not" to UPDATE/DELETE with NO error and ZERO
// rows. Every write below asks for the affected rows back and counts them.
const DENIED = "لا تملك صلاحية على هذا السؤال (أو أنه لم يعد موجوداً)";

export async function insertQuestion(subjectId: string, data: any) {
  // Ask the database what status the row actually got: a contributor's
  // question is saved as "pending" no matter what the client sent.
  const { data: row, error } = await supabase
    .from("questions")
    .insert({ ...toSnake(data), subject_id: subjectId })
    .select("status")
    .single();

  if (error) {
    toast.error("there is an error 😕: " + error.message);
    return;
  }

  setQStore(reconcile(emptyQStore as any));
  if (row?.status && row.status !== "published") {
    toast.success("أُضيف السؤال وهو بانتظار مراجعة المشرف ✅");
  } else {
    toast.success("Question added successfully 🎉");
  }
}

export async function updateQuestion(
  subjectId: string,
  questionId: string,
  data: any,
) {
  const { data: rows, error } = await supabase
    .from("questions")
    .update({ ...toSnake(data), subject_id: subjectId })
    .eq("id", questionId)
    .select("id");

  if (error) {
    toast.error("there is an error 😕: " + error.message);
    return { error: error.message };
  }
  if (!rows || rows.length === 0) {
    toast.error(DENIED);
    return { error: DENIED };
  }

  setQStore(reconcile(emptyQStore as any));
  toast.success("Question updated successfully 🎉");
}

export async function deleteQuestion(subjectId: string, questionId: string) {
  const { data: rows, error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("subject_id", subjectId)
    .select("id");

  if (error) {
    toast.error("there is an error 😕: " + error.message);
    return { error: error.message };
  }
  if (!rows || rows.length === 0) {
    toast.error(DENIED);
    return { error: DENIED };
  }

  toast.success("Question deleted successfully 🎉");
}

/** Publish / unpublish. Needs "publish" on the subject (checked by Postgres). */
export async function setQuestionStatus(
  questionId: string,
  status: QuestionStatus,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from("questions")
    .update({ status })
    .eq("id", questionId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: DENIED };
  return { error: null };
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
