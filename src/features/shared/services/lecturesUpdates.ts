import { supabase } from "./supabase"; // عدّل المسار حسب مكان إعداد supabase عندك

// ============================================
// إنشاء (Create)
// ============================================
export async function upsertLecture({
  subjectId,
  seasonId,
  rawContent,
  userId,
  doctorName
}) {
  const { data, error } = await supabase
    .from("formatted_lectures")
    .upsert(
      {
        subject_id: subjectId,
        season_id: seasonId,
        content: { raw: rawContent },
        doctor_name: doctorName, 
        status: "published", // يمكنك تعديل الحالة حسب الحاجة
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "subject_id,season_id" },
    )
    .select()
    .single();

  if (error) {
    console.error("[createLecture] فشل الإنشاء:", error.message);
    return { data: null, error: mapError(error) };
  }

  return { data, error: null };
}

// ============================================
// قراءة (Read) — محاضرة واحدة
// ============================================
export async function getLecture({ subjectId, seasonId, status } = {}) {
  
  let query = supabase
    .from("formatted_lectures")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    console.error("[getLecture] فشل الجلب:", error.message);
    return { data: null, error: mapError(error) };
  }

  return { data, error: null };
}

// ============================================
// قراءة (Read) — قائمة محاضرات، مع فلاتر اختيارية
// ============================================
export async function listLectures({ subjectId, seasonId, status } = {}) {
  let query = supabase
    .from("formatted_lectures")
    .select("*")
    .order("created_at", { ascending: false });

  if (subjectId) query = query.eq("subject_id", subjectId);
  if (seasonId) query = query.eq("season_id", seasonId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    console.error("[listLectures] فشل الجلب:", error.message);
    return { data: [], error: mapError(error) };
  }

  return { data, error: null };
}

// ============================================
// تحديث (Update) — محتوى المحاضرة
// ============================================
export async function updateLectureContent({
  subjectId,
  seasonId,
  rawContent,
  userId,
}) {
  const { data, error } = await supabase
    .from("formatted_lectures")
    .update({
      content_json: { raw: rawContent },
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId)
    .select()
    .single();

  if (error) {
    console.error("[updateLectureContent] فشل التحديث:", error.message);
    return { data: null, error: mapError(error) };
  }

  return { data, error: null };
}

// ============================================
// تحديث (Update) — حالة النشر فقط
// ============================================
export async function updateLectureStatus(subjectId, seasonId, status, userId) {
  if (!["draft", "published"].includes(status)) {
    return {
      data: null,
      error: {
        message: "حالة غير صالحة، يجب أن تكون draft أو published",
        code: "invalid_status",
      },
    };
  }

  const { data, error } = await supabase
    .from("formatted_lectures")
    .update({
      status,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId)
    .select()
    .single();

  if (error) {
    console.error("[updateLectureStatus] فشل تحديث الحالة:", error.message);
    return { data: null, error: mapError(error) };
  }

  return { data, error: null };
}

// ============================================
// حذف (Delete)
// ============================================
export async function deleteLecture(subjectId, seasonId) {
  const { error } = await supabase
    .from("formatted_lectures")
    .delete()
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId);

  if (error) {
    console.error("[deleteLecture] فشل الحذف:", error.message);
    return { success: false, error: mapError(error) };
  }

  return { success: true, error: null };
}

// ============================================
// ترجمة أخطاء Supabase الشائعة لرسائل مفهومة
// ============================================
function mapError(error) {
  // رمز 23505 = تكرار قيمة فريدة (unique violation)
  if (error.code === "23505") {
    return { message: "هذه المحاضرة موجودة مسبقاً", code: error.code };
  }
  // رمز 23503 = مرجع غير موجود (foreign key violation) — مثلاً subject_id أو section_id غير صحيح
  if (error.code === "23503") {
    return { message: "المادة أو القسم المحدد غير موجود", code: error.code };
  }
  // رمز PGRST116 = لم يتم إيجاد أي صف (single() بدون نتيجة)
  if (error.code === "PGRST116") {
    return { message: "المحاضرة غير موجودة", code: error.code };
  }
  // خطأ شبكة عام
  if (error.message?.includes("fetch")) {
    return {
      message: "تعذر الاتصال بالخادم، تحقق من الإنترنت",
      code: "network_error",
    };
  }
  // أي خطأ آخر غير متوقع
  return {
    message: "حدث خطأ غير متوقع، حاول مرة أخرى",
    code: error.code ?? "unknown",
  };
}
