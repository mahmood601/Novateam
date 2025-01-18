import { getRequestURL, HTTPEvent, setCookie } from "vinxi/http"
import { createAdminClient } from "~/lib/server/appwrite"

export async function GET(event: HTTPEvent) {
  "use server"
  const url = getRequestURL(event)
  const userId = url.searchParams.get("userId") as string;
  const secret = url.searchParams.get("secret") as string;

  if (!userId || !secret) {
    return new Response("Missing required parameters", { status: 400 })
  }

  try {

    const { account } = await createAdminClient()
    const session = await account.createSession(userId, secret)

    setCookie("nova", session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: "strict",
      expires: new Date(session.expire),
      secure: url.protocol == "https:",
    })

    return Response.redirect(`${url.origin}/`)
  }
  catch (e) {
    console.log("error", e);
    return new Response("Inernal server error", { status: 500 })
  }


}
