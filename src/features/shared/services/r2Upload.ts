/**
 * r2Upload.ts  (الاسم قديم، أبقيناه حتى لا يتغير الاستيراد في المحرر)
 * ─────────────────────────────────────────────────────────────────
 * صور المحاضرات: تحويل إلى WebP على الجهاز → رفع عبر Supabase Edge
 * Function (upload-image) إلى imgbb → إرجاع الرابط.
 */

import { supabase } from "./supabase";

/** فك الترميز → تصغير (أطول ضلع ≤ maxPx) → ترميز WebP. */
export async function toWebP(file: File, maxPx = 1600, quality = 0.82): Promise<Blob> {
  // imageOrientation يُبقي صور الهاتف مستقيمة (تدوير EXIF).
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxPx / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/webp", quality),
  );
  // بعض المتصفحات تعيد PNG بصمت إن لم تستطع ترميز WebP.
  if (!blob || blob.type !== "image/webp") {
    throw new Error("هذا المتصفح لا يدعم تحويل الصور إلى WebP");
  }
  return blob;
}

export async function uploadLectureImage(file: File): Promise<string> {
  if (!navigator.onLine) throw new Error("لا يوجد اتصال بالإنترنت");

  const webp = await toWebP(file);

  // invoke يضيف توكن المستخدم تلقائيًا في ترويسة Authorization.
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    "upload-image",
    { body: webp, headers: { "Content-Type": "image/webp" } },
  );

  if (error || !data?.url) {
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    throw new Error(
      status === 403 ? "ليس لديك صلاحية رفع الصور"
      : status === 413 ? "الصورة كبيرة جدًا"
      : "فشل رفع الصورة",
    );
  }
  return data.url;
}