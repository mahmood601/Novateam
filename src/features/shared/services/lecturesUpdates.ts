import { supabase } from "./supabase"; // عدّل المسار حسب مكان إعداد supabase عندك

// ============================================
// إنشاء أو تحديث (Create / Update)
// ============================================
export async function upsertLecture({
  subjectId,
  seasonId,
  rawContent,
  userId,
  // The caller says what it INTENDS. Postgres has the last word: without
  // "publish" permission a "published" request is saved as "pending".
  status = "published",
}) {
  const { data: existing, error: lookupError } = await supabase
    .from("formatted_lectures")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId)
    .maybeSingle();

  if (lookupError) {
    console.error("[upsertLecture] فشل التحقق من المحاضرة:", lookupError.message);
    return { data: null, error: mapError(lookupError) };
  }

  const values = {
    content: { raw: rawContent },
    status,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from("formatted_lectures")
      .update(values)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("[upsertLecture] فشل تحديث المحاضرة:", error.message);
      return { data: null, error: mapError(error) };
    }

    return { data, error: null };
  }

  const { data, error } = await supabase
    .from("formatted_lectures")
    .insert({
      subject_id: subjectId,
      season_id: seasonId,
      ...values,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("[upsertLecture] فشل إنشاء المحاضرة:", error.message);
    return { data: null, error: mapError(error) };
  }

  return { data, error: null };
}

export async function updateDoctorName(subjectId, seasonId, doctorName, userId) {
  const trimmed = (doctorName ?? "").trim();

  if (!trimmed) {
    return {
      data: null,
      error: { message: "اسم الدكتور لا يمكن أن يكون فارغاً", code: "invalid_doctor_name" },
    };
  }

  const { data, error } = await supabase
    .from("formatted_lectures")
    .update({
      doctor_name: trimmed,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId)
    .select()
    .single();

  if (error) {
    console.error("[updateDoctorName] فشل التحديث:", error.message);
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
// قراءة خفيفة — updated_at فقط (للتحقق من تغيّر المحاضرة دون جلب المحتوى)
// ============================================
export async function getLectureUpdatedAt({ subjectId, seasonId, status } = {}) {
  let query = supabase
    .from("formatted_lectures")
    .select("id, updated_at")
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return { data: null, error: mapError(error) };
  return { data: Array.isArray(data) ? (data[0] ?? null) : data, error: null };
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
      content: { raw: rawContent },
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
  if (!["draft", "pending", "published"].includes(status)) {
    return {
      data: null,
      error: {
        message: "حالة غير صالحة، يجب أن تكون draft أو pending أو published",
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
  // .select("id") matters: when RLS refuses a DELETE, Postgres does NOT raise
  // an error — it just deletes 0 rows. Counting the returned rows is the only
  // way to tell "deleted" from "silently refused".
  const { data, error } = await supabase
    .from("formatted_lectures")
    .delete()
    .eq("subject_id", subjectId)
    .eq("season_id", seasonId)
    .select("id");

  if (error) {
    console.error("[deleteLecture] فشل الحذف:", error.message);
    return { success: false, error: mapError(error) };
  }
  if (!data || data.length === 0) {
    return {
      success: false,
      error: { message: "لا تملك صلاحية حذف هذه المحاضرة", code: "denied" },
    };
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
  // رمز 42501 = رفضت سياسة RLS العملية (لا صلاحية)
  if (error.code === "42501") {
    return {
      message: "لا تملك صلاحية تعديل هذه المحاضرة (منشورة أو تخص مستخدماً آخر)",
      code: error.code,
    };
  }
  // رمز PGRST116 = لم يتم إيجاد أي صف (single() بدون نتيجة)
  // ومع RLS يعني أيضاً أن العملية رُفضت بصمت (صفر صفوف)
  if (error.code === "PGRST116") {
    return { message: "المحاضرة غير موجودة أو لا تملك صلاحية عليها", code: error.code };
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

// ============================================
// حالات المحاضرات لمادة (للوحة التحكم)
// ============================================
export async function getLectureStatuses(
  subjectId: string,
): Promise<Map<number, string>> {
  const { data, error } = await supabase
    .from("formatted_lectures")
    .select("season_id, status")
    .eq("subject_id", subjectId);

  const map = new Map<number, string>();
  if (error) {
    console.error("[getLectureStatuses]", error.message);
    return map;
  }
  for (const row of data ?? []) map.set(row.season_id, row.status);
  return map;
}
