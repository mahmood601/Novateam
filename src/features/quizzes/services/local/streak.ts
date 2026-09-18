// ─── Streak Service ───────────────────────────────────────────────────────────
// يحفظ الأيام التي فيها activity حقيقي (إجابة سؤال واحد على الأقل)
// المفتاح: "activity_days" → JSON array من strings بصيغة "YYYY-MM-DD"
// مستقل تماماً عن sync_* keys

const STORAGE_KEY = "activity_days";

// تحويل Date إلى "YYYY-MM-DD" (local time, مش UTC)
function toDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadDays(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveDays(days: Set<string>): void {
  // نحتفظ بآخر 365 يوم فقط لتجنب تضخم localStorage
  const sorted = [...days].sort().slice(-365);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
}

// ─── تُستدعى عند كل إجابة ────────────────────────────────────────────────────
export function recordActivityToday(): void {
  const today = toDateStr();
  const days = loadDays();
  if (!days.has(today)) {
    days.add(today);
    saveDays(days);
  }
}

// ─── تحسب الـ streak الحالي (أيام متتالية حتى اليوم أو أمس) ──────────────────
export function calcStreak(): number {
  const days = loadDays();
  if (days.size === 0) return 0;

  const today = toDateStr();
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

  // الـ streak ينتهي إذا لم يكن اليوم أو أمس فيه activity
  const anchor = days.has(today)
    ? today
    : days.has(yesterday)
      ? yesterday
      : null;

  if (!anchor) return 0;

  // نمشي للخلف من الـ anchor يوماً بيوم
  let streak = 0;
  let cursor = new Date(anchor + "T12:00:00"); // وسط النهار لتجنب DST issues

  while (true) {
    const str = toDateStr(cursor);
    if (!days.has(str)) break;
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return streak;
}

// ─── عدد الأيام الفريدة كلها (للـ "أيام نشاط" الإجمالي) ─────────────────────
export function countActiveDays(): number {
  return loadDays().size;
}