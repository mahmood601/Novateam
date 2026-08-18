import { supabase } from "../../supabase";
import { db, PASSAGES_SYNC_KEY, resetPassagesSync } from "./db";
import type { Passage } from "../../../types";

export async function getPassagesForSubject(
  subject: string,
): Promise<Passage[]> {
  return db.passages.where("subject_id").equals(subject).toArray();
}

export async function getPassageById(
  passageId: string,
): Promise<Passage | undefined> {
  return db.passages.get(passageId);
}

export async function syncPassagesOfflineFirst(
  subject: string,
): Promise<boolean> {
  try {
    const lastSync = localStorage.getItem(PASSAGES_SYNC_KEY(subject));
    const TEN_MINUTES = 10 * 60 * 1000;
    const isFresh =
      lastSync && Date.now() - new Date(lastSync).getTime() < TEN_MINUTES;

    if (isFresh) return true;
    if (!navigator.onLine) return true;

    const { data, error } = await supabase
      .from("passages")
      .select("*")
      .eq("subject_id", subject);

    if (error || !data) return false;

    if (data.length > 0) {
      const passages: Passage[] = data.map((row: any) => ({
        $id: row.id,
        subject_id: row.subject_id,
        season_id: row.season_id ?? null,
        year_id: row.year_id ?? null,
        content: row.content,
        image_url: row.image_url ?? null,
      }));

      await db.passages.bulkPut(passages);
    }

    localStorage.setItem(PASSAGES_SYNC_KEY(subject), new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export async function clearPassages(): Promise<boolean> {
  try {
    await db.passages.clear();
    return true;
  } catch {
    return false;
  }
}

export { resetPassagesSync };
