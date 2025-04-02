import { Account, Client, Databases } from "appwrite";
const projectID = import.meta.env.VITE_PROJECT_ID;

const client = new Client();

client
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject(projectID);
  

export const account = new Account(client)
export const databases = new Databases(client)
