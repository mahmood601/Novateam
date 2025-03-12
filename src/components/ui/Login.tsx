import { onCleanup, onMount } from 'solid-js';
import './UI.css'
import { createAsync, query, redirect } from '@solidjs/router';
import { getLoggedInUser} from '~/lib/appwrite';
import { loginWithGithub, loginWithGoogle } from '~/lib/server/oauth';


const user = query(async () => {
  "use server"
  const isLoggedIn = await getLoggedInUser()
  if (isLoggedIn) {
    throw redirect("/")
  }

}, "get user")



export default function Login() {
createAsync(async () => await user(), {deferStream: true})
  onMount(() => {
    document.body.classList.add('bg-brown/80')
    onCleanup(() => {
      document.body.classList.remove('bg-brown/80')
    })
  })

  return (
    <div class="min-w-screen h-screen flex justify-center items-center">
      <div class="relative top-0 bg-brown/95 h-fit w-5/6 rounded-3xl flex flex-col justify-between items-center">
        <Virus />
        <div class="w-full h-fit my-4 flex flex-col items-center">
          <p class="mb-3 text-white">تسجيل الدخول بواسطة</p>
          <Oauth name="Google" imageSrc='/app/google.svg' action={loginWithGoogle} />
        </div>
      </div >
    </div >
  )
}

function Oauth(props: { name: string, imageSrc: string, action: any }) {

  return (
    <form class="w-3/4" action={props.action} method='post'>
      <button
        type='submit'
        class="bg-white p-1 w-full h-fit mb-2 rounded-2xl overflow-hidden flex justify-center items-center">
        <img src={props.imageSrc} class="h-10 rounded-full bg-white" />
        <p dir="rtl" class="ml-2">{props.name}</p>
      </button>
    </form>

  )
}

function Virus() {
  return (
    <div class="relative flex justify-center px-1">
      <img class="h-52" src="/app/login.webp" oncontextmenu={(e) => { e.preventDefault(); return false }} />
      <div class='flex items-center justify-between absolute w-1/3 h-[46px] top-20'>
        <Eye />
        <div class="w-4 h-4 border-4 border-b-black border-t-transparent border-l-black -rotate-[45deg] border-r-transparent rounded-full self-end"></div>
        <Eye />

      </div >
    </div >

  )
}

function Eye() {
  return (
    <div class="relative bg-black w-7 h-7 rounded-full overflow-hidden">
      <span class={
        `initial animate-[blink_3s_infinite] bg-[#BD4F2F]  transition-all duration-400 absolute  left-1/2 z-50 -translate-x-1/2 w-full`}></span>
      < span class="absolute top-1 left-[8px] block bg-white w-1/2 h-1/2 rounded-full"></span>
      <span class="absolute top-[19px] left-1/3 block bg-white w-1/5 h-1/5 rounded-full  justify-self-start"></span>
    </div >
  )
}



