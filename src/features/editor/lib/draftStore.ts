// Local autosave for the lecture editor. Drafts live in their own small
// IndexedDB database (not the app's main one) so a schema change or cache
// reset elsewhere in Nova can never wipe unsaved editor work.

import { Dexie, type Table } from "dexie";
import type { JSONContent } from "@tiptap/core";

export type EditorDraft = {
  key: string; // `${subjectId}:${seasonId}`
  content: JSONContent;
  savedAt: number;
};

class DraftDB extends Dexie {
  drafts!: Table<EditorDraft, string>;
  constructor() {
    super("nova-editor-drafts");
    this.version(1).stores({ drafts: "key" });
  }
}

const draftDb = new DraftDB();
const draftKey = (subjectId: string, seasonId: string) =>
  `${subjectId}:${seasonId}`;

export async function saveDraft(
  subjectId: string,
  seasonId: string,
  content: JSONContent,
): Promise<boolean> {
  try {
    await draftDb.drafts.put({
      key: draftKey(subjectId, seasonId),
      content,
      savedAt: Date.now(),
    });
    return true;
  } catch (e) {
    console.error("[draft] local save failed", e);
    return false;
  }
}

export async function loadDraft(
  subjectId: string,
  seasonId: string,
): Promise<EditorDraft | undefined> {
  try {
    return await draftDb.drafts.get(draftKey(subjectId, seasonId));
  } catch {
    return undefined;
  }
}

export async function clearDraft(subjectId: string, seasonId: string) {
  try {
    await draftDb.drafts.delete(draftKey(subjectId, seasonId));
  } catch {
    /* nothing to clear */
  }
}
