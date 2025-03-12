import { Client, Databases } from "appwrite";

export const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("67cbda8a002144e533ee ");
export const databases = new Databases(client)

export const DATABASE_ID="67d0343b001b59a85ee5"