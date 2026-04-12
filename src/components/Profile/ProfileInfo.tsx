import { createSignal, For, JSX, Show, Suspense } from "solid-js";
import { useUser } from "../../context/user";
import { account, setAccount } from "../../stores/account";
import years from "../../services/local/years";
import {
  clearDBAfterChangeYear,
  getSubjectsOfflineFirst,
} from "../../services/local/indexeddb";
import toast from "solid-toast";

export default function ProfileInfo(props: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const { user, updateProfile } = useUser();

  const [editingName, setEditingName] = createSignal(false);
  const [editingYear, setEditingYear] = createSignal(false);
  const [nameValue, setNameValue] = createSignal(user()?.name ?? "");
  const [yearValue, setYearValue] = createSignal(
    localStorage.getItem("year") ?? "",
  );
  const [saving, setSaving] = createSignal(false);

  const saveName = async () => {
    if (!nameValue().trim()) return toast.error("الاسم لا يمكن أن يكون فارغاً");
    setSaving(true);
    const ok = await updateProfile({ name: nameValue().trim() });
    setSaving(false);
    if (ok) {
      toast.success("تم تحديث الاسم ✓");
      setEditingName(false);
    } else {
      toast.error("فشل التحديث، حاول مجدداً");
    }
  };

  const saveYear = async () => {
    const previousYear = localStorage.getItem("year");
    const newYear = yearValue();

    setSaving(true);
    const ok = await updateProfile({ year: newYear });
    setSaving(false);

    if (ok) {
      if (previousYear && previousYear !== newYear) {
        clearDBAfterChangeYear();
        getSubjectsOfflineFirst(newYear); // prefetch subjects for the selected year
        toast.success("تم حذف بيانات السنة القديمة و تحديث السنة");
      } else {
        toast.success("تم تحديث السنة ✓");
      }
      setEditingYear(false);
    } else {
      toast.error("فشل التحديث، حاول مجدداً");
    }
  };

  return (
    <ul class="flex w-3/4 flex-col items-center justify-center gap-5 self-center pt-5 dark:text-white">
      {/* الاسم */}
      <Li
        Icon={NameSvg()}
        type="الاسم"
        value={
          <Show
            when={editingName()}
            fallback={
              <div class="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNameValue(user()?.name ?? props.name);
                    setEditingName(true);
                  }}
                  class="text-main text-xs underline"
                >
                  تعديل
                </button>
                <p>{user()?.name ?? props.name}</p>
              </div>
            }
          >
            <div class="text-main-dark flex w-full items-center gap-2">
              <input
                value={nameValue()}
                onInput={(e) => setNameValue(e.currentTarget.value)}
                class="focus:ring-main rounded-xl bg-slate-100 px-3 py-1 text-sm outline-none focus:ring-2 dark:bg-slate-700"
                dir="rtl"
                autofocus
              />
              <button
                onClick={saveName}
                disabled={saving()}
                class="bg-main rounded-full px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                {saving() ? "..." : "حفظ"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                class="text-xs text-slate-400"
              >
                إلغاء
              </button>
            </div>
          </Show>
        }
      />

      {/* الحساب */}
      <Li
        Icon={EmailSvg()}
        type="الحساب"
        value={<p class="overflow-x-scroll">{props.email}</p>}
      />

      {/* السنة */}
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
            <div class="flex w-full items-center gap-2">
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

      <Show when={props.isAdmin}>
        <Li
          Icon={TeamSvg()}
          type="الفريق"
          value={
            <div
              dir="rtl"
              class="text-md text-main-dark dark:text-main-light flex w-full flex-col justify-center pl-2 text-right font-normal"
            >
              <p>
                <span class="rainbow-graident text-center text-sm">
                  انت عضو من الفريق
                </span>
                😎🔥
              </p>
              <div class="flex w-fit items-center justify-between">
                <p class="ml-2 text-right text-sm text-wrap">
                  هل تريد تفعيل وضع ادخال الاسئلة؟ 👀
                </p>
                <button
                  on:click={() => {
                    const newValue = !account.devMode;
                    localStorage.setItem("dev", String(newValue));
                    setAccount("devMode", newValue);
                  }}
                  classList={{
                    "bg-main dark:bg-main": account.devMode,
                    "bg-darker-light-2 dark:bg-lighter-dark-2":
                      !account.devMode,
                    "relative h-5 block w-10 rounded-full shrink-0": true,
                  }}
                >
                  <span
                    classList={{
                      "bg-main-light dark:bg-main-dark -translate-x-5":
                        account.devMode,
                      "bg-main-light dark:bg-main-dark": !account.devMode,
                      "transition-colors transition-transform duration-200 absolute top-1/2 -translate-y-1/2 right-0 -translate-x-1 h-4 w-4 rounded-full": true,
                    }}
                  />
                </button>
              </div>
            </div>
          }
        />
      </Show>
      <Show when={user()?.id}>
        <Logout Icon={LogoutSvg()} type="تسجيل الخروج" />
      </Show>
    </ul>
  );
}

function Li(props: { Icon?: JSX.Element; type?: string; value: JSX.Element }) {
  return (
    <li class="dark:border-dark-hover dark:bg-lighter-dark-1 flex h-fit w-full items-center justify-between gap-1 rounded-2xl py-2 pl-3 shadow-md">
      <div class="flex w-[calc(100%-4.5em)] flex-col items-center justify-center gap-1">
        <div class="flex w-full items-center justify-end">
          <Suspense>{props.type}</Suspense>
        </div>
        <div class="flex w-full items-center justify-end overflow-x-scroll font-bold">
          <Suspense>{props.value}</Suspense>
        </div>
      </div>
      <div class="flex h-16 w-16 items-center justify-center">{props.Icon}</div>
    </li>
  );
}

function Logout(props: { Icon: JSX.Element; type: string }) {
  const { logout } = useUser();
  return (
    <li
      onClick={async () => logout()}
      class="text-warn dark:border-dark-hover dark:bg-lighter-dark-1 flex h-20 w-full cursor-pointer items-center justify-between rounded-2xl py-2 shadow-xl"
    >
      <div class="flex h-4 w-full flex-1 items-center justify-end text-xl font-bold">
        {props.type}
      </div>
      <div class="flex h-16 w-16 items-center justify-center">{props.Icon}</div>
    </li>
  );
}

// ─── SVGs ─────────────────────────────────────────────────────────────────────

function CalendarSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M22 10H2v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3zM7 8a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1m10 0a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1"
        opacity="0.5"
      />
      <path
        fill="currentColor"
        d="M19 4h-1v3a1 1 0 0 1-2 0V4H8v3a1 1 0 0 1-2 0V4H5a3 3 0 0 0-3 3v3h20V7a3 3 0 0 0-3-3"
      />
    </svg>
  );
}

function NameSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2em"
      height="2em"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4"
      />
    </svg>
  );
}

function TeamSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="26"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M12 10a4 4 0 1 0 0-8a4 4 0 0 0 0 8m-6.5 3a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M21 10.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m-9 .5a5 5 0 0 1 5 5v6H7v-6a5 5 0 0 1 5-5m-7 5c0-.693.1-1.362.288-1.994l-.17.014A3.5 3.5 0 0 0 2 17.5V22h3zm17 6v-4.5a3.5 3.5 0 0 0-3.288-3.494c.187.632.288 1.301.288 1.994v6z"
      />
    </svg>
  );
}

function EmailSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2em"
      height="2em"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8s8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5s2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47c.65.89 1.77 1.47 2.96 1.47c1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10m0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3s3 1.34 3 3s-1.34 3-3 3"
      />
    </svg>
  );
}

function LogoutSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2em"
      height="2em"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M5 5h6c.55 0 1-.45 1-1s-.45-1-1-1H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h6c.55 0 1-.45 1-1s-.45-1-1-1H5z"
      />
      <path
        fill="currentColor"
        d="m20.65 11.65l-2.79-2.79a.501.501 0 0 0-.86.35V11h-7c-.55 0-1 .45-1 1s.45 1 1 1h7v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.19.2-.51.01-.7"
      />
    </svg>
  );
}
