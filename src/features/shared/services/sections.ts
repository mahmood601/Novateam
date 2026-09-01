import { supabase } from "./supabase";
import toast from "solid-toast";
import { Section } from "../../quizzes/services/types";

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

// Get seasons only without years
export async function getSeasonsFromRemote(subjectId: string): Promise<Section[]> {
  const { data, error } = await supabase
    .from("sections")
    .select("id, subject_id, type, value, name")
    .eq("subject_id", subjectId)
    .eq("type", "season")
    .order("value", { ascending: true });

  if (error) {
    toast.error("فشل تحميل الفصول: " + error.message);
    return [];
  }
  return data ?? [];
}

export async function getSeasonNameFromRemote(subjectId: string, value: number | string): Promise<string> {
  const { data, error } = await supabase
    .from("sections")
    .select("name")
    .eq("subject_id", subjectId)
    .eq("type", "season")
    .eq("value", value)

  if (error) {
    toast.error("فشل تحميل الفصل: " + error.message);
    return "";
  }
  return data?.[0]?.name ?? "";
}
