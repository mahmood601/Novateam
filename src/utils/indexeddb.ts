import { Query } from "appwrite";
import { databases } from "../services/appwrite";
import { Dexie, EntityTable } from "dexie";

const db = new Dexie("db") as Dexie & {
  questions: EntityTable<
    {
      $id: string;
      subject: string;
      season: string;
      year: string;
    },
    "$id"
  >;
} & {
  answers: EntityTable<
    {
      $id: string;
      subject: string;
    },
    "$id"
  >;
};

db.version(1).stores({
  answers: `
  $id,
  subject`,
  questions: `
  $id,
  subject,
  season,
  year,
  [subject+season],
  [subject+year]`,
});

const unusedKeys = new Set([
  "$collectionId",
  "$createdAt",
  "$databaseId",
  "$permissions",
]);

export async function addQuestionsToFirstDB(subject: string) {
 const existingQuestions = await db.questions
    .where("subject")
    .equals(subject)
    .toArray();

  try {
    const questionsResponse = await databases.listDocuments(
      import.meta.env.VITE_DB_ID,
      subject,
     [ Query.limit(500)]
    )

    const questions = questionsResponse.documents.map((q) => {
      q.subject = subject;
      return Object.fromEntries(
        Object.entries(q).filter(([key]) => !unusedKeys.has(key)),
      );
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
      }

      await db.questions.bulkPut(questions);
    }

  } catch (error) {
    throw error
  ;
  }
}

export async function addAnswersToProgress(answers: any) {
 await db.answers.bulkPut(answers);
}

export async function getQuestionsWithFilter(
  subject: string,
  sectionName: "season" | "year",
  sectionValue: string,
) {
  return db.questions
    .where(`[subject+${sectionName}]`)
    .equals([subject, sectionValue])
    .toArray();
}

export async function getQuestions(subject: string) {
  return db.questions.where(`subject`).equals(subject).toArray();
}

export async function getAnswers(subject: string) {
  const questions = db.answers.where("subject").equals(subject).toArray();
  return questions;
}
