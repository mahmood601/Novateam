import { A } from "@solidjs/router";
import Download from "./Icons/Download";
import { createEffect, createResource, createSignal, on } from "solid-js";
import { Transition } from "solid-transition-group";
import {
  addQuestionsToFirstDB,
  getAnswers,
  getQuestions,
} from "../services/local/indexeddb";
import toast from "solid-toast";
import { updateStore } from "../stores/updateStore";

export default function Box(props: {
  subject?: string;
  info: string;
  link: string;
  children?: any;
}) {
  const [downloadStatus, setDownloadStatus] = createSignal<"pending" | "">("");

  const [stats, { refetch }] = createResource(async () => {
    if (!props.subject) {
      return { qLen: 0, aLen: 0 };
    }
    const q = await getQuestions(props.subject);
    const a = await getAnswers(props.subject);

    return {
      qLen: q?.length || 0,
      aLen: Array.isArray(a) ? a.filter((i) => i.answer).length : 0,
    };
  });
  const percentage = () =>
    stats()?.qLen ? Math.round((stats()?.aLen / stats()?.qLen) * 100) : 0;

  createEffect(
    on(
      () => updateStore.pending.length,
      () => refetch(),
      { defer: true },
    ),
  );

  return (
    <A
      href={props.link}
      class="hover:border-main relative flex h-55 w-80 justify-between rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800"
    >
      {/* المعلومات */}
      <div class="flex flex-1 flex-col items-center justify-center gap-2">
        <img
          src={"/subjectsIcons/" + props.subject + ".webp"}
          alt={props.info}
          class="from-main/30 to-main/10 size-16 rounded-lg bg-gradient-to-br"
        />

        <p class="text-lg font-bold">{props.info}</p>

        <p class="text-muted-foreground text-sm">
          عدد الأسئلة: {stats()?.qLen}
        </p>

        <p class="text-muted-foreground text-sm">
          الإجابات الصحيحة: {stats()?.aLen}
        </p>

        {props.children}
      </div>

      <div class="flex flex-col items-center justify-between">
        {/* progress circle */}
        <div class="relative flex items-center justify-center">
          <div
            style={{
              background: `conic-gradient(var(--color-main) ${percentage()}%, var(--color-main-light) 0)`,
            }}
            class="flex size-20 items-center justify-center rounded-full shadow-md transition-all duration-500"
          >
            <div class="bg-background flex size-14 items-center justify-center rounded-full shadow-inner">
              <Transition name="fade">
                <span class="text-sm font-bold">{percentage()}%</span>
              </Transition>
            </div>
          </div>
        </div>

        {/* download button*/}
        <button
          disabled={downloadStatus() === "pending"}
          onClick={(e) => {
            e.preventDefault();

            if (!props.subject) return;

            toast.promise(
              addQuestionsToFirstDB(props.subject, true).then(() => refetch()),
              {
                loading: () => {
                  setDownloadStatus("pending");
                  return <span>جار التحميل ...</span>;
                },
                success: () => {
                  setDownloadStatus("");
                  return <span>تم التحميل</span>;
                },
                error: (e) => <span>{e}</span>,
              },
              {
                className: "special-box", 
                position: "top-right",
                style: {
                  border: "2px solid var(--color-darker-light-2)",
                  "border-radius": "12px",
                  direction: "rtl",
                },
                // لون أيقونة الـ loading
                iconTheme: {
                  primary: "var(--color-main)",
                  secondary: "var(--color-darker-light-1)",
                },
                // تخصيص كل حالة على حدة
                success: {
                  iconTheme: {
                    primary: "var(--color-true)", // أخضر عند النجاح
                    secondary: "var(--color-darker-light-1)",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "var(--color-warn)", // أحمر عند الخطأ
                    secondary: "var(--color-darker-light-1)",
                  },
                },
              },
            );
          }}
          class={`border-border hover:bg-main flex items-center justify-center rounded-[6px] border p-1 transition-all duration-300 hover:text-white disabled:opacity-50 ${downloadStatus() === "pending" ? "cursor-not-allowed" : ""}`}
        >
          تحميل الاسئلة
        </button>
      </div>
    </A>
  );
}
