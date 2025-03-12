import { createAsync, query, redirect } from "@solidjs/router";
import Profile from "~/components/ui/Profile/Profile";
import { getLoggedInUser } from "~/lib/appwrite";

const user = query(async () => {
  "use server"
  const isLoggedIn = await getLoggedInUser()
  if (!isLoggedIn) {
    throw redirect("/login")
  }

}, "get user")


export default function ProfileRoute() {
createAsync(async () => await user(), {deferStream: true})


  return (
    <Profile params={user()}/>
  )
}
