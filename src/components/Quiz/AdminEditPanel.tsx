/**
 * AdminEditPanel.tsx
 * ───────────────────
 * لوحة تعديل/حذف السؤال الحالي — تظهر فقط للأدمن داخل واجهة حل الكويز.
 * تُعيد استخدام نفس ManualForm و SectionSelectors المستخدمة في الداشبورد،
 * ونفس دوال updateQuestion / deleteQuestion — لا منطق جديد، فقط واجهة وصول
 * سريعة من داخل الكويز عندما يلاحظ الأدمن خطأ في السؤال أثناء الحل.
 */

import { createResource, createSignal, Show } from "solid-js";
import {
  getSections,
  getQuestion,
  deleteQuestion,
  type QuestionUI,
} from "../../services/documentsManipulation";
import { ManualForm } from "../../pages/Dashboard";
import { db, type Question } from "../../services/local/indexeddb";
import toast from "solid-toast";

export default function AdminEditPanel(props: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  question: Question | null | undefined;
  // يُستدعى بعد أي تعديل أو حذف فعلي لإعادة مزامنة قائمة الأسئلة المعروضة
  onQuestionChanged: () => void;
}) {
  const [sections] = createResource(() => props.subjectId, getSections);
  const [deleting, setDeleting] = createSignal(false);

  const handleDelete = async () => {
    const q = props.question;
    if (!q) return;
    if (
      !confirm(
        "هل تريد حذف هذا السؤال نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.",
      )
    )
      return;

    setDeleting(true);
    const res = await deleteQuestion(props.subjectId, q.$id);
    setDeleting(false);

    if (res?.error) return;

    // ✅ إزالة فورية من الكاش المحلي كي يختفي السؤال من الكويز مباشرة
    await db.questions.delete(q.$id);
    props.onQuestionChanged();
    props.onClose();
  };

  // ManualForm يستدعي updateQuestion داخلياً وينادي onComplete بعد الحفظ
  const handleSaved = async () => {
    const q = props.question;
    if (!q) return;

    const fresh: QuestionUI | null = await getQuestion(props.subjectId, q.$id);
    if (fresh) {
      // ✅ نحافظ على حقل subject المحلي (غير موجود في QuestionUI) ونحدّث الباقي
      const merged: Question = { ...q, ...fresh, subject: q.subject };
      await db.questions.put(merged);
    }

    props.onQuestionChanged();
    toast.success("تم تحديث السؤال في الكويز ✏️");
    props.onClose();
  };

  return (
    <Show when={props.open}>
      {/* Overlay */}
      <div
        class="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />

      {/* Panel */}
      <div
        class="fixed right-0 bottom-0 left-0 z-[301] flex max-h-[90dvh] flex-col overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900"
        dir="rtl"
      >
        {/* Header */}
        <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div class="flex items-center gap-2">
            <span class="text-xl">✏️</span>
            <h3 class="font-bold">تعديل السؤال (أدمن)</h3>
          </div>
          <button
            onClick={props.onClose}
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4 p-5">
          <Show
            when={sections() && props.question}
            fallback={
              <p class="text-center text-sm text-slate-400">
                جاري تحميل البيانات...
              </p>
            }
          >
            <ManualForm
              subjectId={props.subjectId}
              sections={sections()!}
              editQuestion={props.question as unknown as QuestionUI}
              onComplete={handleSaved}
            />
          </Show>

          <button
            onClick={handleDelete}
            disabled={deleting()}
            class="w-full rounded-2xl bg-red-50 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20"
          >
            {deleting() ? "جاري الحذف..." : "حذف السؤال نهائياً 🗑️"}
          </button>
        </div>
      </div>
    </Show>
  );
}
