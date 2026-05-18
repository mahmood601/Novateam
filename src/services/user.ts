import { supabase } from "./supabase";

// ─── Ensure user row exists in "users" table ─────────────────────────────────
// upsert بدل select + insert — طلب واحد لـ Supabase بدل طلبين.
// ignoreDuplicates: true يعني لو الـ row موجود ما يلمسه (يحافظ على name/role الحالي).
export async function ensureUserExists(context: {
  name: string;
  userId: string;
  year?: string;
}) {
  const { userId, name, year } = context;
  if (!userId) throw new Error("No userId provided");

  const { error } = await supabase
    .from("users")
    .upsert(
      { id: userId, name, year: year ?? null },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (error) throw error;
}

// ─── Batch: جلب أسماء قائمة من IDs بطلب واحد ────────────────────────────────
// بدل N طلب (كل card يطلب بنفسه)، طلب واحد يرجع Map<id, name>
export async function fetchUserNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))]; // إزالة التكرار والفراغات
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .in("id", ids);

  if (error || !data) return new Map();

  return new Map(
    data
      .filter((row) => typeof row.name === "string")
      .map((row) => [row.id, row.name as string]),
  );
}

// ─── Get user display name by ID ──────────────────────────────────────────────
export async function getUserNameById(userId: string): Promise<string | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return typeof data.name === "string" ? data.name : null;
}

// ─── Get user role ────────────────────────────────────────────────────────────
export async function getUserRole(
  userId: string,
): Promise<"student" | "admin"> {
  if (!userId) return "student";

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "student";
  return data.role === "admin" ? "admin" : "student";
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; 
    // year?: string
   },
): Promise<boolean> {
  if (!userId) throw new Error("No userId provided");

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
  return true;
}