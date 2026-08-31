/**
 * imageUpload.ts
 * ──────────────
 * رفع صورة السؤال إلى Supabase Storage وإرجاع الرابط العام
 */

import { supabase } from "./supabase";

const BUCKET = "questions-images";

async function compressImage(file: File, maxPx = 1200): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], file.name, { type: "image/webp" })),
        "image/webp",
        0.82
      );
    };
    img.src = url;
  });
}

export async function uploadQuestionImage(file: File): Promise<string> {
 const compressed = await compressImage(file);
  const path = `${crypto.randomUUID()}.webp`;
  const fileToUpload = compressed;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileToUpload, { upsert: true, contentType: "image/webp" });

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
