import { createAsync, query, redirect } from "@solidjs/router";
import Header from "../Shared/Header";
import ProfileInfo from "./ProfileInfo";
import { getLoggedInUser } from "~/lib/appwrite";

export default function Profile(params: any) {


  return (
    <div class="w-screen min-h-screen dark:bg-black">
      <Header sectionName="الملف الشخصي" />
      <ProfileInfo />
    </div>
  )
}
