// Types for documentsManipulation split module
export type Section = {
  id: number;
  subject_id: string;
  type: "season" | "year";
  value: string;
  name: string;
};

export type QuestionUI = {
  $id: string;
  subject_id: string;
  season_id: number | null;
  year_id: number | null;
  question: string;
  explanation: string | null;
  options: string[];
  correctIndex: number;
  user_id: string | null;
  seasonName?: string;
  seasonValue?: string;
  yearName?: string;
  yearValue?: string;
  passage_id?: string | null;
  image_url?: string | null;
};

export type PassageUI = {
  $id: string;
  subject_id: string;
  season_id: number | null;
  year_id: number | null;
  content: string;
  image_url?: string | null;
};
