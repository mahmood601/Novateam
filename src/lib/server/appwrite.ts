import { cache, redirect } from "@solidjs/router";
import { Client, Account } from "node-appwrite";
import { getCookie } from "vinxi/http";

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("66c87f03002e87f36185")
    .setKey("04201ee82d28e6c41b869173ebf0b94458b291241618bb5eb3bebb173a016d5540bb46a80765131b9405ca58902c9dddf861e049205cd41bc98b5849059d1c5e82fa7478ff5b670a01f5235c5d13b13cb31005d0319302f44b30f1b14c035756230c590c31f9a3db5f73ac09628a3d805b934338c7954fe563f5b3e9309127e2")


  // .setEndpoint(import.meta.env.VITE_APPWRTE_ENDPOINT)
  // .setProject(import.meta.env.VITE_APPWRITE_PROJECT)
  // .setKey(import.meta.env.VITE_APPWRITE_API_KEY)

  return {
    get account() {
      return new Account(client);
    },
  };
}

export async function createSessionClient() {
  "use server";

  try {
    const client = new Client()
      .setEndpoint("https://cloud.appwrite.io/v1")
      .setProject("66c87f03002e87f36185")



    // .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    // .setProject(import.meta.env.VITE_APPWRITE_PROJECT)

    const session = getCookie("nova") !== undefined ? getCookie('nova') : null; // Also this as SESSION_COOKIE


    if (!session) {
      throw new Error("No user session")
    }

    client.setSession(session);

    return {
      get account() {
        return new Account(client);
      },
    }
  }
  catch (error) {
    throw redirect("/login")
  }
}

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch (error) {
    return null;
  }
}

export const user = async (dir: string) => {
  "use server"
  const isLoggedIn = await getLoggedInUser()


  if (isLoggedIn) {
    throw redirect(dir)
  }

}
