import type { Question } from "./question";

export type Favorite = {
  $id: string;
  questionId: string;
  subject: string;
  snapshot?: Partial<Question>;
  note?: string;
  savedAt: number;
};
