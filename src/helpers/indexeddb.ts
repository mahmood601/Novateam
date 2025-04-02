import { listQuestionsToIndexeddb } from "../lib/appwrite/documentsManuplation";
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
});

db.version(1).stores({
  questions: `
  $id,
  subject,
  season,
  year`,
});

const unusedKeys = new Set([
  "$collectionId",
  "$createdAt",
  "$databaseId",
  "$permissions",
]);

export async function addQuestionsToFirstDB(subject: string) {
  const questions = (await listQuestionsToIndexeddb(subject)).documents;
  if (questions.error == null) {
    questions.forEach((q) => (q.subject = subject));
    const filteredQs = questions.map((obj) => {
      return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !unusedKeys.has(key)),
      );
    });
    const existingQuestions = await db.questions
      .where("subject")
      .equals(subject)
      .toArray();

    const existingIds = new Set(existingQuestions.map((q) => q.$id));
    const newIds = new Set(filteredQs.map((q) => q.$id));
  
    const deletedIds = [...existingIds].filter((id) => !newIds.has(id));

    if (deletedIds.length > 0) {
      await db.questions.bulkDelete(deletedIds);
      await db.answers.where("$id").anyOf(deletedIds).delete();
    }

    db.questions.bulkPut(filteredQs);
  }
}

export async function addAnswersToProgress(answers: any) {
  console.log(answers);

  db.answers.bulkPut(answers);
}

export async function getQuestions(
  subject: string,
  sectionName?: "season" | "year",
  sectionValue?: string,
) {
  const questions = db.questions.where("subject").equals(subject);
  if (sectionName && sectionValue) {
    questions.and((item) => item[sectionName] == sectionValue);
  }

  return questions.toArray();
}

export async function getAnswers(subject: string) {
  const questions = db.answers.where("subject").equals(subject).toArray();
  return questions;
}
