import { supabase } from "../../shared/services/supabase";
import toast from "solid-toast";
import { PassageUI } from "./types";

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
