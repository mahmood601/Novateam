import ProfileInfo from "../components/Profile/ProfileInfo";
import { useUser } from "../context/user";
import { onMount, Show } from "solid-js";
import Login from "./Login";

export default function Profile() {
  const { user } = useUser();
  console.log(user());

  onMount(() => {
    document.documentElement.classList.add(
      localStorage.getItem("theme") || "light",
    );
  });

  return (
    <Show when={user()} fallback={<Login />}>
      <div class="dark:bg-header flex min-h-screen w-screen flex-col bg-gray-50">
        <div class="flex w-full items-center dark:text-white">
          <h1 class="flex-1 p-5 text-right text-2xl font-bold tracking-wide">
            الملف الشخصي
          </h1>
        </div>

        <ProfileInfo
          name={user()?.name}
          email={user()?.email}
          isAdmin={user()?.role === "admin"}
        />
      </div>
    </Show>
  );
}
