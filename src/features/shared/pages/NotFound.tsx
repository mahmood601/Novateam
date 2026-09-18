/**
 * NotFound.tsx — صفحة 404
 */
import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <div
      dir="rtl"
      class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <div class="text-7xl">🔭</div>
      <h1 class="text-6xl font-black text-main">404</h1>
      <p class="text-xl font-bold dark:text-white">الصفحة غير موجودة</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        يبدو أن هذا الرابط لا يوجد أو تم حذفه
      </p>
      <A
        href="/"
        class="bg-main mt-4 rounded-xl px-6 py-3 font-bold text-white transition hover:opacity-90"
      >
        العودة للرئيسية
      </A>
    </div>
  );
}
