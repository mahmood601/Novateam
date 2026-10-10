// Central role helpers. Every permission check should go through these.
export type Role = "student" | "admin" | "super-admin";

// Normalize any raw DB value into a known role (unknown -> student)
export function parseRole(raw: unknown): Role {
  return raw === "admin" || raw === "super-admin" ? raw : "student";
}

// admin AND super-admin both have the existing admin permissions
export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "admin" || role === "super-admin";
}

export function isSuperAdminRole(role: Role | null | undefined): boolean {
  return role === "super-admin";
}
