import { Dexie, type Table } from "dexie";
import type {
  Answer,
  AppFont,
  CachedSection,
  CachedSubject,
  CachedYear,
  Favorite,
  Passage,
  Question,
} from "../../../types";
export type {
  Answer,
  AppFont,
  CachedSection,
  CachedSubject,
  CachedYear,
  Favorite,
  Passage,
  Question,
} from "../../../types";

export const SCHEMA_VERSION = 6;
export const SCHEMA_KEY = "db_schema_version";
export const SYNC_KEY = (subject: string) => `sync_${subject}`;
export const PASSAGES_SYNC_KEY = (subject: string) => `passages_sync_${subject}`;

class AppDB extends Dexie {
  questions!: Table<Question, string>;
  answers!: Table<Answer, string>;
  favorites!: Table<Favorite, string>;
  sections!: Table<CachedSection, number>;
  subjects!: Table<CachedSubject, string>;
  years!: Table<CachedYear, string>;
  passages!: Table<Passage, string>;
  appFont!: Table<AppFont, string>;

  constructor() {
    super("db");

    this.version(2).stores({
      questions: `
        $id,
        subject,
        season_id,
        year_id,
        [subject+season_id],
        [subject+year_id]
      `,
      answers: `
        $id,
        subject,
        season_id,
        year_id,
        [subject+season_id],
        [subject+year_id]
      `,
      favorites: `
        $id,
        questionId,
        subject,
        [subject+questionId]
      `,
      sections: `
        id,
        subject_id,
        type,
        [subject_id+type]
      `,
      subjects: `id, *year_keys`,
      years: `id`,
    });

    this.version(3).stores({
      years: `id, *subjects`,
    });

    this.version(4).stores({
      questions: `
        $id,
        subject,
        season_id,
        year_id,
        passage_id,
        [subject+season_id],
        [subject+year_id]
      `,
      passages: `
        $id,
        subject_id,
        season_id,
        year_id,
        [subject_id+season_id],
        [subject_id+year_id]
      `,
    });

    this.version(5).stores({
      answers: `
        $id,
        subject,
        season_id,
        year_id,
        answeredAt,
        [subject+season_id],
        [subject+year_id]
      `,
    });

    this.version(6).stores({
      appFont: `id`,
    });
  }
}

const db = new AppDB();
export { db };

export function saveLastSync(subject: string) {
  localStorage.setItem(SYNC_KEY(subject), new Date().toISOString());
}

export function getLastSync(subject: string): string | null {
  return localStorage.getItem(SYNC_KEY(subject));
}

export function resetSync(subject: string) {
  localStorage.removeItem(SYNC_KEY(subject));
}

export function resetPassagesSync(subject: string) {
  localStorage.removeItem(PASSAGES_SYNC_KEY(subject));
}
