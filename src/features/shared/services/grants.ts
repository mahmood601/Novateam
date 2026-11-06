/**
 * grants.ts
 * ─────────
 * Reading grants + the three RPCs that change roles/grants.
 * The RPCs (grant_perm / revoke_perm / demote_user) hold ALL the rules
 * (no self-promotion, no granting more than you have, ...). The client
 * only translates their error messages into Arabic.
 */
import { supabase } from "./supabase";
import type { Grant, Level, Scope } from "../lib/permissions";
import type { Role } from "../lib/roles";

export type Result = { ok: true } | { ok: false; error: string };
export type StaffMember = {
  id: string;
  name: string;
  role: Role;
  grants: Grant[];
};
export type UserHit = { id: string; name: string; role: Role };

const GRANT_COLUMNS =
  "id, user_id, scope, subject_id, level, expires_at, granted_by, created_at";

/** null = could not load (offline / error) — callers keep their cached copy. */
export async function fetchMyGrants(userId: string): Promise<Grant[] | null> {
  const { data, error } = await supabase
    .from("admin_grants")
    .select(GRANT_COLUMNS)
    .eq("user_id", userId);
  if (error || !data) return null;
  return data as Grant[];
}

/** Admins + super-admins with their grants (RLS limits who may call this usefully). */
export async function listStaff(): Promise<StaffMember[]> {
  const [usersRes, grantsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, role")
      .in("role", ["admin", "super-admin"])
      .order("name"),
    supabase.from("admin_grants").select(GRANT_COLUMNS),
  ]);
  if (usersRes.error) throw new Error(usersRes.error.message);
  if (grantsRes.error) throw new Error(grantsRes.error.message);

  const grants = (grantsRes.data ?? []) as Grant[];
  return (usersRes.data ?? []).map((u: any) => ({
    id: u.id,
    name: u.name,
    role: u.role as Role,
    grants: grants.filter((g) => g.user_id === u.id),
  }));
}

export async function searchUsersByName(q: string): Promise<UserHit[]> {
  const clean = q.replace(/[%_,()]/g, " ").trim();
  if (clean.length < 2) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, name, role")
    .ilike("name", `%${clean}%`)
    .limit(8);
  if (error) return [];
  return (data ?? []) as UserHit[];
}

// ─── RPCs ────────────────────────────────────────────────────────────────────

const ERRORS: [string, string][] = [
  ["your own permissions", "لا يمكنك تعديل صلاحياتك بنفسك"],
  ["SQL editor only", "السوبر أدمن يُدار من قاعدة البيانات فقط"],
  ["more than you have", "لا يمكنك منح أكثر مما تملك"],
  ["delegate admin management", "تفويض إدارة الأدمنز للسوبر أدمن فقط"],
  ["made by someone else", "هذه الصلاحية منحها شخص آخر، لا يمكنك تغييرها"],
  ["only revoke grants you made", "يمكنك سحب ما منحته أنت فقط"],
  ["whose grants are all yours", "يمكنك تخفيض من منحتَه أنت فقط"],
  ["cannot demote yourself", "لا يمكنك تخفيض نفسك"],
  ["not an admin", "هذا المستخدم ليس أدمن"],
  ["unknown subject", "المادة غير موجودة"],
  ["user not found", "المستخدم غير موجود"],
  ["not allowed", "ليس لديك صلاحية لهذا الإجراء"],
  ["authentication required", "سجّل الدخول أولاً"],
  ["fetch", "تعذر الاتصال بالخادم، تحقق من الإنترنت"],
];

export function rpcErrorMessage(message: string): string {
  const hit = ERRORS.find(([needle]) => message.includes(needle));
  return hit ? hit[1] : "فشلت العملية، حاول مرة أخرى";
}

export async function grantPerm(a: {
  userId: string;
  scope: Scope;
  subject: string | null;
  level: Level;
  expires: string | null;
}): Promise<Result> {
  const { error } = await supabase.rpc("grant_perm", {
    p_user: a.userId,
    p_scope: a.scope,
    p_subject: a.subject,
    p_level: a.level,
    p_expires: a.expires,
  });
  return error ? { ok: false, error: rpcErrorMessage(error.message) } : { ok: true };
}

export async function revokePerm(grantId: number): Promise<Result> {
  const { error } = await supabase.rpc("revoke_perm", { p_grant_id: grantId });
  return error ? { ok: false, error: rpcErrorMessage(error.message) } : { ok: true };
}

export async function demoteUser(userId: string): Promise<Result> {
  const { error } = await supabase.rpc("demote_user", { p_user: userId });
  return error ? { ok: false, error: rpcErrorMessage(error.message) } : { ok: true };
}
