export type Answer = {
  $id: string;
  subject: string;
  season_id: number | null;
  year_id: number | null;
  answer: boolean;
  answeredAt: number;
  attempts: number;
  [key: string]: any;
};
