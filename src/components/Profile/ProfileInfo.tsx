import { JSX, Show, Suspense } from "solid-js";
import { useUser } from "../../lib/context/user";
import { account, setAccount } from "../../stores/account";

export default function ProfileInfo(user: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  return (
    <ul class="dark:bg-lighter-dark-1 w-screen dark:text-white">
      <Li Icon={NameSvg()} type="الاسم" value={<p>{user.name}</p>} />
      <Li Icon={EmailSvg()} type="الحساب" value={<p>{user.email}</p>} />
      <Show when={user.isAdmin}>
        <Li
          Icon={TeamSvg()}
          type="الفريق"
          value={
            <div
              dir="rtl"
              class="text-md w-full text-main-dark dark:text-main-light pl-2 flex flex-col justify-center text-right font-normal"
            >
              <p>
                <span class="rainbow-graident text-center text-sm">انت عضو من الفريق</span>😎🔥
              </p>
              <div class="flex w-fit items-center justify-between">
                <p class="text-wrap text-right ml-2 text-sm ">هل تريد تفعيل وضع ادخال الاسئلة؟ 👀</p>
                <button
                  on:click={() => {
                    setAccount("devMode", !account.devMode);
                    localStorage.setItem("dev", `${account.devMode}`);
                  }}
                   classList={{
                    "bg-main dark:bg-main": account.devMode,
                    "bg-darker-light-2 dark:bg-lighter-dark-2 ": !account.devMode,
                   "relative h-5 block w-10 rounded-full shrink-0":
                      true,
                  }}
                >
                  <span
                    classList={{
                      "bg-main-light dark:bg-main-dark -translate-x-5": account.devMode,
                      "bg-main-light dark:bg-main-dark": !account.devMode,
                      "transition-colors transition-transform duration-200 absolute top-1/2 -translate-y-1/2 right-0 -translate-x-1 h-4 w-4 rounded-full":
                        true,
                    }}
                  ></span>
                </button>
              </div>
            </div>
          }
        />
      </Show>
      <Logout Icon={LogoutSvg()} type="تسجيل الخروج" />
    </ul>
  );
}

function Li(props: {
  class?: string;
  Icon?: JSX.Element;
  type?: string;
  value: JSX.Element;
}) {
  return (
    <li class="dark:border-dark-hover flex h-fit w-full items-center justify-between border-t-[1px] border-b-[1px] border-gray-300 py-2 pl-3">
      <div class="flex-1">
        <div class="flex w-full items-center justify-end">
          <Suspense>{props.type}</Suspense>
        </div>
        <div class="rainbow-graident flex w-full items-center justify-end text-lg font-bold">
          <Suspense>{props.value}</Suspense>
        </div>
      </div>
      <div class="flex h-16 w-16 items-center justify-center">{props.Icon}</div>
    </li>
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

function PlaceSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2em"
      height="2em"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2m6-1.8C18 6.57 15.35 4 12 4s-6 2.57-6 6.2c0 2.34 1.95 5.44 6 9.14c4.05-3.7 6-6.8 6-9.14M12 2c4.2 0 8 3.22 8 8.2c0 3.32-2.67 7.25-8 11.8c-5.33-4.55-8-8.48-8-11.8C4 5.22 7.8 2 12 2"
      />
    </svg>
  );
}

function RankingSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2em"
      height="2em"
      viewBox="0 0 24 24"
    >
      <g fill="none" stroke="currentColor" stroke-width="1.5">
        <path
          stroke-linecap="round"
          d="M16 22v-9c0-1.414 0-2.121-.44-2.56C15.122 10 14.415 10 13 10h-2c-1.414 0-2.121 0-2.56.44C8 10.878 8 11.585 8 13m0 9v-5m0 5c0-1.414 0-2.121-.44-2.56C7.122 19 6.415 19 5 19s-2.121 0-2.56.44C2 19.878 2 20.585 2 22m20 0v-3c0-1.414 0-2.121-.44-2.56C21.122 16 20.415 16 19 16s-2.121 0-2.56.44C16 16.878 16 17.585 16 19v3"
        />
        <path d="M11.146 3.023C11.526 2.34 11.716 2 12 2s.474.34.854 1.023l.098.176c.108.194.162.29.246.354c.085.064.19.088.4.135l.19.044c.738.167 1.107.25 1.195.532s-.164.577-.667 1.165l-.13.152c-.143.167-.215.25-.247.354s-.021.215 0 .438l.02.203c.076.785.114 1.178-.115 1.352c-.23.175-.576.015-1.267-.303l-.178-.082c-.197-.09-.295-.136-.399-.136s-.202.046-.399.136l-.178.082c-.691.318-1.037.478-1.267.303c-.23-.174-.191-.567-.115-1.352l.02-.203c.021-.223.032-.334 0-.438s-.104-.187-.247-.354l-.13-.152c-.503-.588-.755-.882-.667-1.165c.088-.282.457-.365 1.195-.532l.19-.044c.21-.047.315-.07.4-.135c.084-.064.138-.16.246-.354z" />
      </g>
    </svg>
  );
}

function Logout(props: { class?: string; Icon: JSX.Element; type: string }) {
  const user = useUser();
  return (
    <li
      onClick={async () => {
        user.logout();
      }}
      class="text-warn dark:border-dark-hover flex h-20 w-full cursor-pointer items-center justify-between border-b-[1px] border-gray-300 py-2"
    >
      <div class="flex h-4 w-full flex-1 items-center justify-end text-xl font-bold">
        {props.type}
      </div>
      <div class="flex h-16 w-16 items-center justify-center">{props.Icon}</div>
    </li>
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
