import { action, redirect } from "@solidjs/router"
import { getLoggedInUser } from "../appwrite"

export const goOrSignin = action(async (event) => {
  "use server"
  try {
    const user = await getLoggedInUser()

    return user ? redirect("/app") : redirect("/login")

  } catch (error) {
    console.log(error)
  }
}, "signinGoogle")
