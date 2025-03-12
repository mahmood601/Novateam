import { A, useNavigate } from "@solidjs/router";

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div class="dark:bg-zinc-800 w-screen h-screen flex justify-center items-center">
      <div class="text-center flex flex-col max-w-[90%] md:flex-row-reverse w-fit items-center">
        <h1 class="text-center text-brown font-extrabold mb-7 md:mb-0 text-7xl w-[300px]">404</h1>
        <p dir="rtl" class="dark:text-white font-bold text-2xl">الصفحة التي تبحث عنها غير موجودة. توقف عن العبث وعد إلى 
          <span onClick={()=> {navigate("/", {replace: true, resolve: false})}} class="text-brown underline cursor-pointer">الواجهة الأساسية</span>
          .</p>
      </div>
    </div>
  );
}
