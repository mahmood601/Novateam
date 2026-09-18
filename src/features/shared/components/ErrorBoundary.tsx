/**
 * ErrorBoundary.tsx
 * ─────────────────
 * يلتقط أي خطأ غير متوقع في شجرة المكوّنات
 * ويعرض واجهة لطيفة مع زر إبلاغ عبر Telegram
 */

import { ErrorBoundary as SolidErrorBoundary, type JSX } from "solid-js";
import { supabase } from "../services/supabase";
import CopyDiagnosticsButton from "./CopyDiagnosticsButton";

// ─── إرسال التقرير إلى Telegram عبر Supabase Edge Function ──────────────────

async function sendErrorReport(error: Error, info?: string): Promise<boolean> {
  try {
    const { error: fnError } = await supabase.functions.invoke("report-error", {
      body: {
        message: error?.message ?? String(error),
        stack: error?.stack ?? "",
        info: info ?? "",
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    });
    return !fnError;
  } catch (error) {
    console.error("Error sending report:", error);
    return false;
  }
}

// ─── واجهة الخطأ ──────────────────────────────────────────────────────────────

function ErrorFallback(props: {
  error: Error;
  reset: () => void;
}) {
  let reported = false;

  const handleReport = async () => {
    if (reported) return;
    reported = true;
    const btn = document.getElementById("report-btn") as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "جارٍ الإرسال...";
    }
    const ok = await sendErrorReport(props.error);
    if (btn) {
      btn.textContent = ok ? "✅ تم الإبلاغ، شكراً!" : "❌ فشل الإرسال، حاول لاحقاً";
    }
  };

  return (
    <div
      dir="rtl"
      class="flex min-h-screen flex-col items-center justify-center gap-6 bg-red-50 p-8 dark:bg-red-950/20"
    >
      <div class="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-900 text-center">
        {/* أيقونة */}
        <div class="mb-4 text-5xl">😵</div>

        <h1 class="mb-2 text-xl font-bold text-red-600 dark:text-red-400">
          حدث خطأ غير متوقع
        </h1>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
          نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو الإبلاغ عنه لفريق نوڤا.
        </p>

        {/* تفاصيل الخطأ (للمطورين) */}
        <details class="mb-6 text-right">
          <summary class="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
            تفاصيل تقنية
          </summary>
          <pre class="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs text-red-700 dark:bg-gray-800 dark:text-red-400 text-left" dir="ltr">
            {props.error?.message}
            {"\n"}
            {props.error?.stack}
          </pre>
        </details>

        {/* الأزرار */}
        <div class="flex flex-col gap-3">
          <button
            onClick={props.reset}
            class="bg-main w-full rounded-xl px-4 py-2.5 font-bold text-white transition hover:opacity-90"
          >
            🔄 إعادة المحاولة
          </button>

          <button
            id="report-btn"
            onClick={handleReport}
            class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            🐛 إبلاغ عن المشكلة
          </button>

          {/* ✅ خيار إضافي: نسخ التفاصيل يدوياً (مفيد لو أراد المستخدم إرسالها بنفسه عبر قناة أخرى) */}
          <CopyDiagnosticsButton
            variant="inline"
            label="نسخ تفاصيل الخطأ والجهاز"
            errorInfo={{ message: props.error?.message ?? String(props.error), stack: props.error?.stack }}
          />

          <button
            onClick={() => (window.location.href = "/")}
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي ──────────────────────────────────────────────────────────

export default function AppErrorBoundary(props: { children: JSX.Element }) {
  return (
    <SolidErrorBoundary
      fallback={(error, reset) => (
        <ErrorFallback error={error} reset={reset} />
      )}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}
