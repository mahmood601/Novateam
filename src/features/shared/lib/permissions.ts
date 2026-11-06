/**
 * permissions.ts
 * ──────────────
 * Client-side MIRROR of the database function has_perm().
 *
 * ⚠️ This is for the UI only (hide buttons, pick which pages to show).
 *    The real enforcement is RLS + triggers in Postgres. If this file and
 *    the database ever disagree, the database wins — the worst case here is
 *    a button that shows and then gets a "not allowed" error.
 */
import type { Role } from "./roles";

export type Scope = "quiz" | "lecture" | "subjects" | "admins";
export type Level = "contribute" | "publish" | "manage";

export type Grant = {
  id: number;
  user_id: string;
  scope: Scope;
  /** null = all subjects */
  subject_id: string | null;
  level: Level;
  expires_at: string | null;
  granted_by: string | null;
  created_at?: string;
};

// Same ordering as the Postgres enum perm_level: contribute < publish < manage
const RANK: Record<Level, number> = { contribute: 1, publish: 2, manage: 3 };

export const SCOPE_LABEL: Record<Scope, string> = {
  quiz: "الأسئلة",
  lecture: "المحاضرات",
  subjects: "إدارة المواد والأقسام",
  admins: "إدارة الأدمنز",
};

export const LEVEL_LABEL: Record<Level, string> = {
  contribute: "مساهم — يُراجَع عمله قبل النشر",
  publish: "ناشر — يعتمد وينشر ويعدّل",
  manage: "مدير — وينقل ويحذف",
};

export const LEVEL_SHORT: Record<Level, string> = {
  contribute: "مساهم",
  publish: "ناشر",
  manage: "مدير",
};

export function isGrantActive(
  g: Pick<Grant, "expires_at">,
  now: number = Date.now(),
): boolean {
  return !g.expires_at || new Date(g.expires_at).getTime() > now;
}

/**
 * May this user do `min` on `scope` in `subjectId`?
 * - super-admin: always yes
 * - admin: needs an active grant that covers the subject
 *   (a grant with subject_id = null covers every subject)
 * - subjectId = null asks about ALL-subjects grants only
 *   (e.g. creating a new subject)
 */
export function hasPerm(
  role: Role | null | undefined,
  grants: Grant[],
  scope: Scope,
  subjectId: string | null | undefined,
  min: Level = "contribute",
): boolean {
  if (role === "super-admin") return true;
  if (role !== "admin") return false;
  return grants.some(
    (g) =>
      g.scope === scope &&
      isGrantActive(g) &&
      RANK[g.level] >= RANK[min] &&
      (g.subject_id === null ||
        (subjectId != null && g.subject_id === subjectId)),
  );
}

/** Holds ANY active grant of this scope (used to decide which menu cards to show). */
export function hasAnyPerm(
  role: Role | null | undefined,
  grants: Grant[],
  scope: Scope,
  min: Level = "contribute",
): boolean {
  if (role === "super-admin") return true;
  if (role !== "admin") return false;
  return grants.some(
    (g) => g.scope === scope && isGrantActive(g) && RANK[g.level] >= RANK[min],
  );
}
