import { useNavigate } from "@solidjs/router";
import LeftArrow from "../../components/Icons/LeftArrow";
import ProfileInfo from "../../components/Profile/ProfileInfo";
import { useUser } from "../../context/user";
import { createEffect, onMount, Show } from "solid-js";

export default function Profile() {
  const { user, isLoading } = useUser();
  const navigate = useNavigate();

  createEffect(() => {
    if (!isLoading() && !user()) {
      navigate("/login", { replace: true });
    }
  });
  onMount(() => {
    document.documentElement.classList.add(
      localStorage.getItem("theme") || "light",
    );
  });

  return (
    <div class="dark:bg-header flex min-h-screen w-screen flex-col bg-gray-50">
      <div class="flex w-full items-center justify-between p-5 shadow-md dark:text-white">
        <button
          class="cursor-pointer transition hover:scale-110"
          onClick={() => {
            history.back();
          }}
        >
          <LeftArrow />
        </button>
        <h1 class="flex-1 pr-[1.8em] text-center text-xl font-bold tracking-wide">
          الملف الشخصي
        </h1>
      </div>

      <Show
        when={!isLoading()}
        fallback={
          <p
            dir="rtl"
            class="animate-pulse p-10 text-center text-gray-500 dark:text-gray-300"
          >
            جاري تحميل معلومات المستخدم...
          </p>
        }
      >
        <ProfileInfo
          name={user()?.name}
          email={user()?.email}
          isAdmin={user()?.labels.includes("admin")}
        />
      </Show>
    </div>
  );
}
