import { createResource, Show } from "solid-js";
import { Clock, UserRound } from "lucide-solid";
import { getAuthorName } from "../services/authors";

const dateFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium" });

export function formatArabicDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : dateFmt.format(d);
}

interface Props {
  /** معرّف من أضاف المحتوى */
  createdBy?: string | null;
  /** معرّف آخر من عدّله (يظهر فقط لو يختلف عن المضيف) */
  updatedBy?: string | null;
  updatedAt?: string | null;
  /** صيغة التسمية: "أضافه" للسؤال، "أضافها" للمحاضرة */
  addedLabel?: string;
  class?: string;
}

// سطر صغير هادئ: 👤 أضافه: فلان · 🕒 آخر تعديل: 5 نوفمبر 2026
// أي جزء ناقص (offline، RLS، بيانات قديمة) يُخفى بدل ما يظهر فراغ أو خطأ.
export default function ContentCredit(props: Props) {
  const [author] = createResource(
    () => props.createdBy ?? null,
    getAuthorName,
    { initialValue: null },
  );
  const [editor] = createResource(
    () =>
      props.updatedBy && props.updatedBy !== props.createdBy
        ? props.updatedBy
        : null,
    getAuthorName,
    { initialValue: null },
  );
  const date = () => formatArabicDate(props.updatedAt);

  return (
    <Show when={author.latest || editor.latest || date()}>
      <div
        dir="rtl"
        class={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-60 ${props.class ?? ""}`}
      >
        <Show when={author.latest}>
          <span class="inline-flex items-center gap-1">
            <UserRound size={12} />
            {props.addedLabel ?? "أضافه"}: <b class="font-bold">{author.latest}</b>
          </span>
        </Show>
        <Show when={editor.latest}>
          <span class="inline-flex items-center gap-1">
            عدّله: <b class="font-bold">{editor.latest}</b>
          </span>
        </Show>
        <Show when={date()}>
          <span class="inline-flex items-center gap-1">
            <Clock size={12} />
            آخر تعديل: {date()}
          </span>
        </Show>
      </div>
    </Show>
  );
}
