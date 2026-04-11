import ProfileInfo from "../components/Profile/ProfileInfo";
import { useUser } from "../context/user";
import { onMount } from "solid-js";

export default function Profile() {
  const { user } = useUser();

  onMount(() => {
    document.documentElement.classList.add(
      localStorage.getItem("theme") || "light",
    );
  });

  return (
    <div class="dark:bg-header flex min-h-screen w-screen flex-col bg-gray-50">
      <div class="flex w-full items-center dark:text-white">
        <h1 class="flex-1 text-right p-5 text-2xl font-bold tracking-wide">
          الملف الشخصي
        </h1>
      </div>

      <ProfileInfo
        name={user()?.name}
        email={user()?.email}
        isAdmin={user()?.role === "admin"}
      />
    </div>
  );
}
