import { Query } from "appwrite";
import { databases } from "../services/appwrite";
import { Dexie, Table } from "dexie";

// Define types for questions and answers
export type Question = {
  $id: string;
  subject: string;
  season: string;
  year: string;
  [key: string]: any;
};

export type Answer = {
  $id: string;
  subject: string;
  [key: string]: any;
};

export type Favorite = {
  $id: string; // use question.$id
  questionId: string;
  subject: string;
  snapshot?: Partial<Question>;
  note?: string;
  savedAt: number;
};

// Dexie DB setup
class AppDB extends Dexie {
  questions!: Table<Question, "$id">;
  answers!: Table<Answer, "$id">;
  favorites!: Table<Favorite, "$id">;

  constructor() {
    super("db");
    this.version(1).stores({
      questions: `
        $id,
        subject,
        season,
        year,
        [subject+season],
        [subject+year]
      `,
      answers: `
        $id,
        subject,
        season,
        year,
        [subject+season],
        [subject+year]
      `,
      favorites: `
        $id,
        questionId,
        subject,
        [subject+questionId]
      `,
    });
  }
}

const db = new AppDB();

const unusedKeys = new Set([
  "$createdAt",
  "$permissions",
  "$sequence",
  "$updatedAt",
]);

// Add or update questions for a subject
export async function addQuestionsToFirstDB(subject: string) {
  const existingQuestions = await db.questions
    .where("subject")
    .equals(subject)
    .toArray();

  try {
    const questionsResponse = await databases.listDocuments(
      import.meta.env.VITE_DB_ID,
      subject,
      [
        Query.limit(500),
        Query.select([
          "$id",
          "question",
          "explanation",
          "firstOption",
          "secondOption",
          "thirdOption",
          "fourthOption",
          "fifthOption",
          "correctIndex",
          "year",
          "season",
        ]),
      ],
    );

    const questions: Question[] = questionsResponse.documents.map((q: any) => {
      q.subject = subject;
      return Object.fromEntries(
        Object.entries(q).filter(([key]) => !unusedKeys.has(key)),
      ) as Question;
    });

    if (existingQuestions.length === 0) {
      await db.questions.bulkPut(questions);
    } else {
      const existingIds = new Set(existingQuestions.map((q) => q.$id));
      const newIds = new Set(questions.map((q) => q.$id));
      const deletedIds = [...existingIds].filter((id) => !newIds.has(id));

      if (deletedIds.length > 0) {
        await db.questions.where("$id").anyOf(deletedIds).delete();
        await db.answers.where("$id").anyOf(deletedIds).delete();
        await db.favorites.where("$id").anyOf(deletedIds).delete();
      }

      await db.questions.bulkPut(questions);
    }
  } catch (error) {
    console.error("Failed to sync questions:", error);
    throw error;
  }
}

// Add answers to progress
export async function addAnswersToProgress(answers: Answer[]) {
  await db.answers.bulkPut(answers);
}

// Save a question as favorite (uses question.$id as favorite $id)
export async function addFavoriteForQuestion(
  question: Question,
  note?: string,
  userAnswer?: string,
): Promise<void> {
  const fav: Favorite = {
    $id: question.$id,
    questionId: question.$id,
    subject: question.subject,
    snapshot: {
      $id: question.$id,
      question: question.question,
      explanation: question.explanation,
      firstOption: question.firstOption,
      secondOption: question.secondOption,
      thirdOption: question.thirdOption,
      fourthOption: question.fourthOption,
      fifthOption: question.fifthOption,
      correctIndex: question.correctIndex,
      userAnswer: userAnswer,
      year: question.year,
      season: question.season,
    },
    note: note ?? "",
    savedAt: Date.now(),
  };

  await db.favorites.put(fav);
}

// Remove favorite by question id
export async function removeFavorite(questionId: string): Promise<void> {
  await db.favorites.delete(questionId);
}

// Update note for a favorite
export async function updateFavoriteNote(
  questionId: string,
  note: string,
): Promise<void> {
  await db.favorites.update(questionId, { note, savedAt: Date.now() });
}

// Toggle favorite (add if missing, remove if exists). Returns true if added, false if removed.
export async function toggleFavorite(
  question: Question,
  note?: string,
): Promise<boolean> {
  const exists = await isFavorite(question.$id);
  if (exists) {
    await removeFavorite(question.$id);
    return false;
  } else {
    await addFavoriteForQuestion(question, note);
    return true;
  }
}

// Check if question is favorited
export async function isFavorite(questionId: string): Promise<boolean> {
  const item = await db.favorites.get(questionId);
  return !!item;
}

// Get all favorites (optionally filter by subject)
export async function getFavorites(subject?: string): Promise<Favorite[]> {
  if (subject) {
    return db.favorites.where("subject").equals(subject).toArray();
  }
  return db.favorites.toArray();
}

// Get single favorite
export async function getFavorite(
  questionId: string,
): Promise<Favorite | undefined> {
  return db.favorites.get(questionId);
}

// Get questions with filter (by season or year)
export async function getQuestionsOrAnswersWithFilter(
  subject: string,
  type: "questions" | "answers",
  sectionName: "season" | "year",
  sectionValue: string,
): Promise<Question[] | Answer[]> {
  return db[type]
    .where(`[subject+${sectionName}]`)
    .equals([subject, sectionValue])
    .toArray();
}

// Get all questions for a subject
export async function getQuestions(subject: string): Promise<Question[]> {
  return db.questions.where("subject").equals(subject).toArray();
}

// Get all answers for a subject
export async function getAnswers(subject: string): Promise<Answer[]> {
  return db.answers.where("subject").equals(subject).toArray();
}

export async function deleteAnswersWithFilter(
  subject: string,
  sectionName: "season" | "year",
  sectionValue: string,
): Promise<void> {
  db.answers
    .where(`[subject+${sectionName}]`)
    .equals([subject, sectionValue])
    .delete();
}
