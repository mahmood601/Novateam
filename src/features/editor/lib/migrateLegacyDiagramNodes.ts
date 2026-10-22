// Backward compatibility for persisted documents from before the
// `mermaid` -> `diagram` node rename.
export function migrateLegacyDiagramNodes<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => migrateLegacyDiagramNodes(item)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      next[key] = migrateLegacyDiagramNodes(child);
    }
    if (next.type === "mermaid") {
      next.type = "diagram";
    }
    return next as T;
  }

  return value;
}
