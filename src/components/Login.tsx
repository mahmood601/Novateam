import { createEffect, onCleanup, onMount } from "solid-js";
import { OAuthProvider } from "appwrite";
import { useUser } from "../context/user";
import { useNavigate } from "@solidjs/router";

export default function Login() {
  onMount(() => {
    document.body.classList.add("bg-brown/80");
    onCleanup(() => {
      document.body.classList.remove("bg-brown/80");
    });
  });

  return (
    <div class="bg-main-light dark:bg-main-dark flex h-screen min-w-screen items-center justify-center">
      <div class="bg-brown/95 relative top-0 flex h-fit w-5/6 flex-col items-center justify-between rounded-3xl">
        <Virus />
        <div class="my-4 flex h-fit w-full flex-col items-center">
          <p class="dark:text-main-light text-main-dark mb-3">
            تسجيل الدخول بواسطة
          </p>
          <Oauth
            name="Google"
            provider={OAuthProvider.Google}
            imageSrc="/app/google.svg"
          />
        </div>
      </div>
    </div>
  );
}

function Oauth(props: { name: string; provider: any; imageSrc: string }) {
  const login = useUser().login;
  const user = useUser().user;
  const navigate = useNavigate()

  createEffect(()=>{
    if (user()) {
      navigate("/profile", {replace: true})
    }
  })

  return (
    <button
      type="submit"
      on:click={() => login(props.provider)}
      class="mb-2 flex h-fit w-fit items-center justify-center overflow-hidden rounded-lg bg-gray-400 p-1 px-4"
    >
      <img src={props.imageSrc} class="h-10 rounded-full bg-white" />
      <p dir="rtl" class="ml-2">
        {props.name}
      </p>
    </button>
  );
}

function Virus() {
  return (
    <div class="relative flex justify-center px-1">
      <img
        class="h-52"
        src="/app/login.webp"
        oncontextmenu={(e) => {
          e.preventDefault();
          return false;
        }}
      />
      <div class="absolute top-20 flex h-[46px] w-1/3 items-center justify-between">
        <Eye />
        <div class="h-4 w-4 -rotate-[45deg] self-end rounded-full border-4 border-t-transparent border-r-transparent border-b-black border-l-black"></div>
        <Eye />
      </div>
    </div>
  );
}

function Eye() {
  return (
    <div class="relative h-7 w-7 overflow-hidden rounded-full bg-black">
      <span
        class={`absolute top-0 left-1/2 z-50 h-full w-full origin-top -translate-x-1/2 animate-[blink_4s_infinite] bg-[#BD4F2F] transition-transform duration-400 ease-in`}
      ></span>
      <span class="absolute top-1 left-[8px] block h-1/2 w-1/2 rounded-full bg-white"></span>
      <span class="absolute top-[19px] left-1/3 block h-1/5 w-1/5 justify-self-start rounded-full bg-white"></span>
    </div>
  );
}
