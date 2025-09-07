import { ID, Query } from "appwrite";
import { databases } from "./appwrite";
import toast from "solid-toast";
import { setQStore } from "../stores/QStores";
import { reconcile } from "solid-js/store";
import { useUser } from "../context/user";
const dbID = import.meta.env.VITE_DB_ID;

const user = useUser();

// TODO: replace it with correct data type
export async function insertQuestion(subjectId: string, data: any) {
  try {
    const response = await databases.createDocument(
      dbID,
      subjectId,
      ID.unique(),
      {
        question: data.question,
        explanation: data.explanation,
        firstOption: data.firstOption,
        secondOption: data.secondOption,
        thirdOption: data.thirdOption,
        fourthOption: data.fourthOption,
        fifthOption: data.fifthOption,
        correctIndex: data.correctIndex,
        year: data.year,
        season: data.season,
        user_id: data.user_id,
      },
    );
    setQStore(
      reconcile({
        subject: "",
        year: "",
        season: "",
        question: "",
        explanation: "",
        firstOption: "",
        secondOption: "",
        thirdOption: "",
        fourthOption: "",
        fifthOption: "",
        correctIndex: [],
        user_id: "",
      }),
    );

    toast.success("Question added successfully 🎉");
  } catch (error: any) {
    toast.error("there is an error 😕: \n" + error);
  }
}

export async function updateQuestion(
  subjectId: string,
  questionId: string,
  data: any,
) {
  try {
    const response = await databases.updateDocument(
      dbID,
      subjectId,
      questionId,
      {
        question: data.question,
        explanation: data.explanation,
        firstOption: data.firstOption,
        secondOption: data.secondOption,
        thirdOption: data.thirdOption,
        fourthOption: data.fourthOption,
        fifthOption: data.fifthOption,
        correctIndex: data.correctIndex,
        year: data.year,
        season: data.season,
        user_id: data.user_id,
      },
    );
    setQStore(
      reconcile({
        subject: "",
        year: "",
        season: "",
        question: "",
        explanation: "",
        firstOption: "",
        secondOption: "",
        thirdOption: "",
        fourthOption: "",
        fifthOption: "",
        correctIndex: [],
        user_id: "",
      }),
    );
    toast.success("Question updated successfully 🎉");
    return response;
  } catch (error: any) {
    toast.error("there is an error 😕: " + error);
    return { erorr: error.message };
  }
}
export async function deleteQuestion(subjectId: string, questionId: string) {
  try {
    const response = await databases.deleteDocument(
      dbID,
      subjectId,
      questionId,
    );
    toast.success("Question deleted successfully 🎉");
    return response;
  } catch (error: any) {
    toast.error("there is an error 😕: " + error);
    return { erorr: error.message };
  }
}

export async function listQuestions(
  subjectId: string,
  selectQueries: any,
  equalQueries: { attribute: string; value: string }[],
  pageIndex?: number,
) {
  try {
    const queries = [Query.limit(5), Query.select(selectQueries)];

    if (pageIndex) {
      queries.push(Query.offset(pageIndex * 5)); // (PageNum - 1) * offset
    }

    equalQueries.forEach((element) => {
      queries.push(Query.equal(element.attribute, element.value));
    });

    const response = await databases.listDocuments(dbID, subjectId, queries);
    return response;
  } catch (error: any) {
    toast.error("there is an error 😕: " + error.message);
    return { error: error.message };
  }
}

export async function listQuestion(subjectId: string, id?: string) {
  try {
    const queries = [
      Query.select([
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
      Query.equal("$id", `${id}`),
    ];

    const response = await databases.listDocuments(dbID, subjectId, queries);
    return response.documents[0];
  } catch (error: any) {
    toast.error("there is an error 😕: " + error.message);
    return { error: error.message };
  }
}

export async function listQuestionsToIndexeddb(subjectId: string) {
  const response = await databases.listDocuments(dbID, subjectId);
  return response;
}
