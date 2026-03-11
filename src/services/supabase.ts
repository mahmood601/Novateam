// import { Account, Client, Databases } from "appwrite";
// const projectID = import.meta.env.VITE_PROJECT_ID;

// const client = new Client();

// client
//   .setEndpoint("https://cloud.appwrite.io/v1")
//   .setProject(projectID);
  

// export const account = new Account(client)
// export const databases = new Databases(client)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);