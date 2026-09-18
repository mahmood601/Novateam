import { createSignal, Show } from "solid-js";
import toast from "solid-toast";
import { copyDiagnosticsToClipboard } from "../services/diagnostics";

/**
 * زر دائم (وليس فقط عند حدوث خطأ): ينسخ تقرير تشخيص كامل — معلومات الجهاز،
 * المتصفح، نوع الاتصال، وآخر رسائل console — إلى الحافظة، ليُرسله المستخدم
 * عند مواجهة أي سلوك غير معتاد، أو عند سؤالنا عن توافقية جهازه/متصفحه.
 */
export default function CopyDiagnosticsButton(props: {
  label?: string;
  variant?: "card" | "inline"; // card = بطاقة كاملة بنفس أسلوب صفحة الإعدادات، inline = زر صغير فقط
  errorInfo?: { message: string; stack?: string }; // إن وُجد، يُضمَّن في التقرير المنسوخ
}) {
  const [copied, setCopied] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  const handleClick = async () => {
    setLoading(true);
    const ok = await copyDiagnosticsToClipboard(props.errorInfo);
    setLoading(false);
    if (ok) {
      setCopied(true);
      toast.success("تم نسخ معلومات الجهاز — أرسلها لنا الآن");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("تعذّر النسخ، حاول مجدداً");
    }
  };

  const ButtonInner = () => (
    <button
      onClick={handleClick}
      disabled={loading()}
      class="flex items-center justify-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 transition hover:border-main hover:text-main disabled:opacity-50 dark:border-slate-600 dark:text-slate-400"
    >
      <Show
        when={!copied()}
        fallback={<span>✓ تم النسخ</span>}
      >
        <Show when={!loading()} fallback={<span>جارٍ التجميع...</span>}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{props.label ?? "نسخ معلومات الجهاز"}</span>
        </Show>
      </Show>
    </button>
  );

  if (props.variant === "inline") {
    return <ButtonInner />;
  }

  return (
    <div class="mb-6 w-full rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800" dir="rtl">
      <div class="mb-3 flex items-center gap-2">
        <span class="text-xl">🛠️</span>
        <h3 class="font-bold">تشخيص الجهاز</h3>
      </div>
      <p class="mb-3 text-xs text-slate-400">
        إن واجهت سلوكاً غير معتاد، أو طلبنا منك معلومات عن جهازك (إصدار المتصفح، نوع
        الاتصال، وغيرها) — اضغط هنا وأرسل لنا ما يُنسخ.
      </p>
      <ButtonInner />
    </div>
  );
}
