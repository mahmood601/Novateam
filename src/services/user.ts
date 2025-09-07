import { ID, Query } from "appwrite";
import { databases } from "./appwrite";
const dbID = import.meta.env.VITE_DB_ID;

export async function ensureUserExists(context: {
  name: string;
  userId: string;
  year: string;
}) {
  const userId = context.userId;
  const name = context.name;
  const year = context.year;


  if (!userId) throw new Error("No userId in context");

  // Check if user exists
  const result = await databases.listDocuments(dbID, "users", [
    Query.equal("user_id", userId),
  ]);

  if (result.total === 0) {
    // Add user if not exists
    await databases.createDocument(dbID, "users", ID.unique(), {
      name: name,
      user_id: userId,
      year: year
    });
    return true; // User added
  }

  return false; // User already exists
}

export async function getUserNameById(userId: string): Promise<string | null> {
    if (!userId) return null;

    const result = await databases.listDocuments(dbID, "users", [
        Query.equal("user_id", userId),
    ]);

    if (!result.documents || result.documents.length === 0) return null;

    const doc = result.documents[0] as Record<string, any>;
    const name = doc.name;
    return typeof name === "string" ? name : null;
}