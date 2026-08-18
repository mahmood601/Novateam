import { supabase } from "../../supabase";
import yearsFallback from "../years";
import { db } from "./db";
import type { CachedSection, CachedSubject, CachedYear } from "../../../types";

export async function getSubjectsOfflineFirst(
  yearKey: string,
): Promise<CachedSubject[]> {
  const cached = await db.subjects.where("year_keys").equals(yearKey).toArray();

  if (cached.length > 0) {
    syncSubjectsInBackground(yearKey);
    return cached;
  }

  return new Promise((resolve) => {
    syncSubjectsInBackground(yearKey, resolve);
  });
}

export async function getSubjectsByYear(
  yearKey: string,
): Promise<CachedSubject[]> {
  if (!yearKey) return [];

  return db.subjects.where("year_keys").anyOf(yearKey).toArray();
}

async function syncSubjectsInBackground(
  year_key: string,
  onUpdate?: (subjects: CachedSubject[]) => void,
) {
  if (!navigator.onLine) {
    onUpdate?.([]);
    return;
  }
  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, year_key")
      .eq("year_key", year_key);

    if (!error && data && data.length > 0) {
      const subjects = (data as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        year_keys: Array.isArray(row.year_key)
          ? row.year_key
          : row.year_key
            ? [row.year_key]
            : [],
      }));

      await db.subjects.bulkPut(subjects as CachedSubject[]);
      onUpdate?.(subjects as CachedSubject[]);
      return;
    }
  } catch {
    // offline
  }
  onUpdate?.([]);
}

export async function getYearsOfflineFirst(
  subjectId?: string,
): Promise<CachedYear[]> {
  if (subjectId) {
    const cached = await db.years.where("subjects").equals(subjectId).toArray();
    if (cached.length > 0) return cached;
  } else {
    const cached = await db.years.toArray();
    if (cached.length > 0) return cached;
  }
  return buildYearsFallback();
}

function buildYearsFallback(): CachedYear[] {
  return Object.entries(yearsFallback).map(([id, data]) => ({
    id,
    name: data.name,
    subjects: data.subjects,
  }));
}

export async function syncAndGetSections(
  subjectId: string,
  onUpdate?: (sections: CachedSection[]) => void,
): Promise<CachedSection[]> {
  const cached = await db.sections.where("subject_id").equals(subjectId).toArray();

  if (cached.length === 0) {
    return new Promise((resolve) => {
      syncSectionsInBackground(subjectId, (fresh) => {
        onUpdate?.(fresh);
        resolve(fresh);
      });
    });
  }

  syncSectionsInBackground(subjectId, onUpdate);
  return cached;
}

async function syncSectionsInBackground(
  subjectId: string,
  onUpdate?: (sections: CachedSection[]) => void,
) {
  if (!navigator.onLine) return;
  try {
    const { data, error } = await supabase
      .from("sections")
      .select("id, subject_id, type, value, name")
      .eq("subject_id", subjectId)
      .order("type")
      .order("value");

    if (error || !data) return;

    await db.sections.where("subject_id").equals(subjectId).delete();
    await db.sections.bulkPut(data);
    onUpdate?.(data as CachedSection[]);
  } catch {
    // offline
  }
}

export async function clearSubjects(): Promise<boolean> {
  try {
    await db.subjects.clear();
    return true;
  } catch {
    return false;
  }
}

export async function clearSections(): Promise<boolean> {
  try {
    await db.sections.clear();
    return true;
  } catch {
    return false;
  }
}

export async function getSeasons(subject: string): Promise<CachedSection[]> {
  return db.sections
    .where(`[subject_id+type]`)
    .equals([subject, "season"])
    .toArray();
}

export async function getSeasonName(
  subject: string,
  seasonId: number | null,
): Promise<string | null> {
  if (!seasonId) return null;
  const sections = await getSeasons(subject);
  return sections.find((s) => s.id === seasonId)?.name ?? null;
}

export async function getYearName(
  subject: string,
  yearId: number | null,
): Promise<string | null> {
  if (!yearId) return null;
  const sections = await db.sections
    .where(`[subject_id+type]`)
    .equals([subject, "year"])
    .toArray();
  return sections.find((s) => s.id === yearId)?.name ?? null;
}
