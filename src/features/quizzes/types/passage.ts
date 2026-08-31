export type Passage = {
  $id: string;
  subject_id: string;
  season_id: number | null;
  year_id: number | null;
  content: string;
  image_url?: string | null;
};
