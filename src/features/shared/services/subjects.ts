import toast from "solid-toast";
import { supabase } from "./supabase";

export const trasnlationMap: Record<string, string> = {
 "second": "الثاني",
 "third": "الثالث",
 "fourth": "الرابع",
 "fifth": "الخامس",
};

export async function getSubjectInfo(subjectId: string): Promise<{ name: string; year_key: string; semester: string } | null> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id,name,year_key,semester")
    .eq("id", subjectId)
    

  if (error) {
    toast.error("فشل تحميل معلومات المادة: " + error.message);
    return null;
  }
  return data?.[0] ?? null;
}
