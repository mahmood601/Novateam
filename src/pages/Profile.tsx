import ProfileInfo, {
  CalendarSvg,
  Li,
} from "../components/Profile/ProfileInfo";
import { useUser } from "../context/user";
import { createSignal, For, onMount, Show } from "solid-js";
import Login from "./Login";
import toast from "solid-toast";
import years from "../services/local/years";
import {
  clearDBAfterChangeYear,
  getSubjectsOfflineFirst,
} from "../services/local/indexeddb";

export default function Profile() {
  const { user } = useUser();

  onMount(() => {
    document.documentElement.classList.add(
      localStorage.getItem("theme") || "light",
    );
  });

  const [editingYear, setEditingYear] = createSignal(false);
  const [yearValue, setYearValue] = createSignal(
    localStorage.getItem("year") ?? "",
  );
  const [saving, setSaving] = createSignal(false);

  

  const saveYear = async () => {
    const previousYear = localStorage.getItem("year");
    const newYear = yearValue();

    setSaving(true);
    localStorage.setItem("year", newYear);
    setSaving(false);

    if (previousYear && previousYear !== newYear) {
      clearDBAfterChangeYear();
      getSubjectsOfflineFirst(newYear); // prefetch subjects for the selected year
      toast.success("تم حذف بيانات السنة القديمة و تحديث السنة");
    } else {
      toast.success("تم تحديث السنة ✓");
    }
    setEditingYear(false);
  };

  return (
    <div
      class="dark:bg-main-dark bg-darker-light-1 min-h-screen px-5 pt-5"
     >
      <div class="flex w-full items-center justify-center dark:text-white">
        <h1 class="flex-1  text-right text-2xl font-bold tracking-wide">
          الملف الشخصي
        </h1>
      </div>
      <Show
        when={user()}
        fallback={
          <div class="flex w-full flex-col items-center justify-center gap-5 pt-5 dark:text-white">
            <Li
              Icon={CalendarSvg()}
              type="السنة"
              value={
                <Show
                  when={editingYear()}
                  fallback={
                    <div class="flex items-center gap-2">
                      <button
                        onClick={() => setEditingYear(true)}
                        class="text-main text-xs underline"
                      >
                        تعديل
                      </button>
                      <p>{years[yearValue()]?.name ?? "غير محددة"}</p>
                    </div>
                  }
                >
                  <div class="flex flex-row-reverse items-center gap-2">
                    <select
                      value={yearValue()}
                      onChange={(e) => setYearValue(e.currentTarget.value)}
                      aria-placeholder="اختر السنة"
                      class="text-main-dark focus:ring-main w-auto rounded-xl bg-slate-100 px-3 py-1 text-sm outline-none focus:ring-2 dark:bg-slate-700"
                      dir="rtl"
                    >
                      <For each={Object.entries(years)}>
                        {([key, data]) => (
                          <option value={key} selected={yearValue() === key}>
                            {data.name}
                          </option>
                        )}
                      </For>
                    </select>
                    <button
                      onClick={saveYear}
                      disabled={saving()}
                      class="bg-main rounded-full px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      {saving() ? "..." : "حفظ"}
                    </button>
                    <button
                      onClick={() => setEditingYear(false)}
                      class="text-xs text-slate-400"
                    >
                      إلغاء
                    </button>
                  </div>
                </Show>
              }
            />
            <Login />
          </div>
        }
      >
        <ProfileInfo
          name={user()?.name}
          email={user()?.email}
          isAdmin={user()?.role === "admin"}
        />
      </Show>
    </div>
  );
}
