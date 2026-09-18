import toast from "solid-toast";
import { db, SCHEMA_KEY, SCHEMA_VERSION } from "./db";
import { clearAnswers } from "./answers";
import { clearPassages } from "./passage";
import { clearQuestions } from "./questions";
import { clearSections, clearSubjects } from "./sections";

export async function checkAndMigrateIfNeeded(): Promise<void> {
  const saved = parseInt(localStorage.getItem(SCHEMA_KEY) ?? "0");

  if (!saved) {
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  }
  if (saved > 0 && saved < SCHEMA_VERSION) {
    toast.loading("جاري تحديث قاعدة البيانات...", { id: "migration" });
    await db.questions.clear();
    await db.passages.clear();

    Object.keys(localStorage)
      .filter((k) => k.startsWith("sync_") || k.startsWith("passages_sync_"))
      .forEach((k) => localStorage.removeItem(k));

    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));

    console.log(`DB migrated to schema v${SCHEMA_VERSION}`);
    toast.success("تم تحديث قاعدة البيانات", {
      id: "migration",
      duration: 2000,
    });
  }
}

export async function clearAllSyncKeys(): Promise<boolean> {
  try {
    const keys = Object.keys(localStorage).filter(
      (key) => key.startsWith("sync_") || key.startsWith("passages_sync_"),
    );
    keys.forEach((key) => localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

export async function clearDBAfterChangeYear() {
  try {
    await clearAnswers();
    await clearQuestions();
    await clearSections();
    await clearSubjects();
    await clearPassages();
    await clearAllSyncKeys();

    return true;
  } catch {
    return false;
  }
}
