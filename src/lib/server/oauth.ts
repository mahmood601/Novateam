import { createAdminClient } from "./appwrite";
import { OAuthProvider } from "node-appwrite";
import { action, redirect } from "@solidjs/router";

export const origin = import.meta.env.DEV ? "http://localhost:3000" : import.meta.env.VITE_SITE_ORIGIN


const loginWithOAuth = async (provider: OAuthProvider, scopes: string[]) => {
  "use server";
  try {
    const { account } = await createAdminClient()
    const redirectURL = await account.createOAuth2Token(
      provider,
      `${origin}/api/oauthCallback`,
      `${origin}/login`,
      scopes
    )

    return redirect(`${redirectURL}`)
  } catch (error) {
    console.error("Error creating OAuth token", error)
    return { error: "Failed to create OAuth token" }
  }
}

export const loginWithGoogle = action(async () => await loginWithOAuth(OAuthProvider.Google, ["openid", "profile", "email"]), "signinGoogle")

export const loginWithGithub = action(async () => await loginWithOAuth(OAuthProvider.Github, ["user"]), "signinGithub")
