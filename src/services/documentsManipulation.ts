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
  passage_id?: string | null;
  image_url?: string | null;
};

export type PassageUI = {
  $id: string;
  subject_id: string;
  season_id: number | null;
  year_id: number | null;
  content: string;
  image_url?: string | null;
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
    passage_id:    data.passage_id ?? null,
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
    passage_id:   row.passage_id ?? null,
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


// ─── Passages ─────────────────────────────────────────────────────────────────

export async function getPassages(subjectId: string): Promise<PassageUI[]> {
  const { data, error } = await supabase
    .from("passages")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  if (error) {
    toast.error("فشل تحميل المقالات: " + error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    $id: row.id,
    subject_id: row.subject_id,
    season_id: row.season_id ?? null,
    year_id: row.year_id ?? null,
    content: row.content,
    image_url: row.image_url ?? null,
  }));
}

export async function insertPassage(
  subjectId: string,
  data: { content: string; season_id: number | null; year_id: number | null },
): Promise<string | null> {
  const { data: row, error } = await supabase
    .from("passages")
    .insert({ subject_id: subjectId, ...data })
    .select("id")
    .single();

  if (error) {
    toast.error("فشل إضافة المقالة: " + error.message);
    return null;
  }
  return row.id as string;
}

export async function deletePassage(passageId: string): Promise<void> {
  const { error } = await supabase
    .from("passages")
    .delete()
    .eq("id", passageId);

  if (error) {
    toast.error("فشل حذف المقالة: " + error.message);
  } else {
    toast.success("تم حذف المقالة 🗑️");
  }
}

export async function updatePassage(
  passageId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from("passages")
    .update({ content })
    .eq("id", passageId);

  if (error) {
    toast.error("فشل تعديل المقالة: " + error.message);
  } else {
    toast.success("تم تعديل المقالة ✏️");
  }
}