import { supabase } from "./supabase";

// ─── Ensure user row exists in "users" table ─────────────────────────────────
export async function ensureUserExists(context: {
  name: string;
  userId: string;
  year?: string;
}) {
  const { userId, name, year } = context;
  if (!userId) throw new Error("No userId provided");

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insertError } = await supabase
      .from("users")
      .insert({ id: userId, name, year: year ?? null });

    if (insertError) throw insertError;
    return true; // user added
  }

  return false; // user already exists
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
export async function getUserRole(userId: string): Promise<"student" | "admin"> {
  if (!userId) return "student";

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "student";
  return data.role === "admin" ? "admin" : "student";
}
