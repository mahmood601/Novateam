import { createStore } from "solid-js/store";

export type QuestionChange = {
  id: string;
  type: "added" | "modified" | "deleted";
  question: string; // نص السؤال للعرض
  subject: string;
};

export type SubjectUpdate = {
  subject: string;
  subjectName: string;
  remoteModified: number;
  changes: QuestionChange[];
};

type UpdateStore = {
  // هل نافذة التحديث مفتوحة
  panelOpen: boolean;
  // هل يتم تحميل التغييرات الآن
  loading: boolean;
  // هل يتم تطبيق التحديث
  applying: boolean;
  // قائمة المواد التي عندها تحديث
  pending: SubjectUpdate[];
};

const [updateStore, setUpdateStore] = createStore<UpdateStore>({
  panelOpen: false,
  loading: false,
  applying: false,
  pending: [],
});

export { updateStore, setUpdateStore };

// ─── helpers ──────────────────────────────────────────────────────────────────

export function hasPendingUpdates() {
  return updateStore.pending.length > 0;
}

export function totalChanges() {
  return updateStore.pending.reduce((sum, s) => sum + s.changes.length, 0);
}
