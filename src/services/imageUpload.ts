/**
 * imageUpload.ts
 * ──────────────
 * رفع صورة السؤال إلى Supabase Storage وإرجاع الرابط العام
 */

import { supabase } from "./supabase";

const BUCKET = "questions-images";

export async function uploadQuestionImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (error) {
    console.error(error);
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteQuestionImage(url: string): Promise<void> {
  // استخرج اسم الملف من الرابط
  const path = url.split(`${BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
