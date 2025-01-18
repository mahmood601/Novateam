import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <div class="dark:bg-zinc-800 w-screen h-screen flex justify-center items-center">
      <div class="flex flex-col max-w-[90%] md:flex-row-reverse text-center w-fit">
        <h1 class="dark:text-brown text-brown font-extrabold mb-7 text-7xl w-[300px]">404</h1>
        <p dir="rtl" class="dark:text-white font-bold text-2xl">الصفحة التي تبحث عنها غير موجودة. توقف عن العبث وعد إلى <A class="text-brown underline" href="/app">الواجهة الأساسية</A>.</p>
      </div>
    </div>
  );
}
