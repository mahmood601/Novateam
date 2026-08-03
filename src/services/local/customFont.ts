import { db, AppFont } from "./indexeddb";

// ─── خط التطبيق المخصص ──────────────────────────────────────────────────────
// ملاحظة: هذا خاص بخط واجهة التطبيق بالكامل، وليس بمحرر المحاضرات
// (ميزة خط المحرر غير مفعّلة حالياً).

const FONT_ID = "app-font";
const FONT_FAMILY = "AppCustomFont";
const ACTIVE_KEY = "custom-font-active";
const NAME_KEY = "custom-font-name";

const ALLOWED_EXT = /\.(ttf|otf|woff2?|ttc)$/i;
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

let loadedFace: FontFace | null = null;

export function getCachedFontName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function isCustomFontActive(): boolean {
  return localStorage.getItem(ACTIVE_KEY) === "1";
}

export async function getCustomFont(): Promise<AppFont | undefined> {
  try {
    return await db.appFont.get(FONT_ID);
  } catch {
    return undefined;
  }
}

/** يقرأ الخط المحفوظ من IndexedDB ويطبّقه على واجهة التطبيق */
export async function applyStoredFont(): Promise<string | null> {
  const record = await getCustomFont();
  if (!record) return null;
  return applyFontRecord(record);
}

async function applyFontRecord(record: AppFont): Promise<string | null> {
  try {
    const buffer = await record.blob.arrayBuffer();
    const face = new FontFace(FONT_FAMILY, buffer);
    await face.load();

    // نظّف الخط القديم إن وُجد قبل إضافة الجديد
    if (loadedFace) {
      document.fonts.delete(loadedFace);
    }

    document.fonts.add(face);
    loadedFace = face;

    document.documentElement.style.setProperty("--app-font", `"${FONT_FAMILY}"`);
    localStorage.setItem(ACTIVE_KEY, "1");
    localStorage.setItem(NAME_KEY, record.name);

    return record.name;
  } catch {
    return null;
  }
}

/** يتحقق من صيغة وحجم الملف قبل حفظه */
function validateFontFile(file: File): string | null {
  if (!ALLOWED_EXT.test(file.name)) {
    return "صيغة الملف غير مدعومة. الصيغ المسموحة: ttf, otf, woff, woff2";
  }
  if (file.size > MAX_SIZE) {
    return "حجم الملف كبير جداً (الحد الأقصى 8 ميجا)";
  }
  return null;
}

/** يحفظ ملف الخط الذي رفعه المستخدم محلياً ويطبّقه فوراً */
export async function saveCustomFont(
  file: File,
): Promise<{ ok: boolean; name?: string; error?: string }> {
  const validationError = validateFontFile(file);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const record: AppFont = {
      id: FONT_ID,
      name: file.name,
      blob: file,
      addedAt: Date.now(),
    };
    await db.appFont.put(record);

    const applied = await applyFontRecord(record);
    if (!applied) {
      // فشل تحميل الخط نفسه (ملف تالف مثلاً) — تراجع عن الحفظ
      await db.appFont.delete(FONT_ID);
      return { ok: false, error: "لم نتمكن من قراءة هذا الملف كخط صالح" };
    }

    return { ok: true, name: applied };
  } catch {
    return { ok: false, error: "فشل حفظ الخط، حاول مرة أخرى" };
  }
}

/** يحذف الخط المخصص ويعيد التطبيق إلى الخط الافتراضي */
export async function removeCustomFont(): Promise<void> {
  try {
    await db.appFont.delete(FONT_ID);
  } catch {
    // تجاهل
  }

  if (loadedFace) {
    document.fonts.delete(loadedFace);
    loadedFace = null;
  }

  document.documentElement.style.removeProperty("--app-font");
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(NAME_KEY);
}
