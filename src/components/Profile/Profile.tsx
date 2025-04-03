import { useNavigate } from "@solidjs/router";
import LeftArrow from "../Icons/LeftArrow";
import ProfileInfo from "./ProfileInfo";
import { useUser } from "../../lib/context/user";
import { createEffect } from "solid-js";

export default function Profile() {
  const user = useUser().user;
  const navigate = useNavigate()

  createEffect(()=>{
    if (!user()) {
      navigate("/login", {replace: true})
    }
  })
  createEffect(() => {
    document.documentElement.classList.add(
      localStorage.getItem("theme") || "light",
    );
  });

  return (
    <div class="dark:bg-header min-h-screen w-screen">
      <div class="dark:bg-header flex w-full items-center justify-between p-5 dark:text-white">
        <button
          class="cursor-pointer"
          onClick={() => {
            history.back();
          }}
        >
          <LeftArrow />
        </button>
        <h1 class="flex-1 pr-[1.8em] text-center text-xl font-bold">
          الملف الشخصي
        </h1>
      </div>
      <ProfileInfo
        name={user()?.name}
        email={user()?.email}
        isAdmin={user()?.labels.includes("admin")}
      />
      ;
    </div>
  );
}
