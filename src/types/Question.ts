export interface Question {
    id: string;
    subject: string;
    year: string;
    season: string;
    options: string[];
    correct: number[];
    explanation?: string;
    createdBy?: string; 
}