// import { createSignal, For, onCleanup, Setter } from "solid-js";
// import subjects from "./subjects";
// import { reconcile, unwrap } from "solid-js/store";
// import { QStore, setQStore } from "../stores/QStores";
// import {
//   insertQuestion,
//   updateQuestion,
// } from "../services/documentsManuplation";
// import { qModeT } from "../pages/Quiz/DevMode";
// import { useParams } from "@solidjs/router";
// import { useUser } from "../context/user";

// const options = [
//   { name: "firstOption", placeholder: "الأول" },
//   { name: "secondOption", placeholder: "الثاني" },
//   { name: "thirdOption", placeholder: "الثالث" },
//   { name: "fourthOption", placeholder: "الرابع" },
//   { name: "fifthOption", placeholder: "الخامس" },
// ];

// export default function Panel(props: {
//   openSetter: Setter<qModeT | any>;
//   id?: string;
//   type?: "add" | "edit";
// }) {
//   const [disableSB, setDisableSB] = createSignal(false);
//   const subject = useParams().subject;
//   const section = useParams().section.split("-");
//   const yearOrSeason = section[0] == "year" ? "season" : "year";
//   const sectionArr = subjects[subject][yearOrSeason];
//   setQStore("subject", subject);

//   const userCtx = useUser();

//   const handleSubmit = async (e: SubmitEvent) => {
//     e.preventDefault();

//     const data = unwrap(QStore);

//     const currentUser = userCtx?.user?.();
//     const userId =
//       currentUser?.$id ??
//       currentUser?.id ??
//       (localStorage.getItem("user")
//         ? JSON.parse(localStorage.getItem("user") as string).id
//         : "unknown");

//     data.user_id = userId;

//     setDisableSB(true);
//     if (props.type == "add") {
//       insertQuestion(subject, data).finally(() => {
//         setDisableSB(false);
//       });
//     } else {
//       updateQuestion(subject, props.id, data).finally(() => {
//         setDisableSB(false);
//       });
//     }
//   };

//   onCleanup(() => {
//     setQStore(
//       reconcile({
//         subject: "",
//         year: "",
//         season: "",
//         question: "",
//         explanation: "",
//         firstOption: "",
//         secondOption: "",
//         thirdOption: "",
//         fourthOption: "",
//         fifthOption: "",
//         correctIndex: [],
//         user_id: "",
//       }),
//     );
//   });
//   return (
//     <div
//       on:click={(e) => e.stopPropagation()}
//       class="accent-main caret-main text-main-dark dark:text-main-light fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-black/40 px-4"
//     >
//       <div class="dark:bg-main-dark bg-main-light relative h-fit max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-xl">
//         <button
//           on:click={(e) => {
//             e.stopPropagation();
//             props.openSetter("");
//           }}
//           class="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 shadow hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
//         >
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             width={22}
//             height={22}
//             viewBox="0 0 16 16"
//           >
//             <path
//               fill="none"
//               stroke="currentColor"
//               stroke-linecap="round"
//               stroke-linejoin="round"
//               stroke-width={2}
//               d="m11.25 4.75l-6.5 6.5m0-6.5l6.5 6.5"
//             />
//           </svg>
//         </button>

//         <form onSubmit={handleSubmit} class="flex flex-col gap-3">
//           <label
//             class="text-main-dark dark:text-main-light mx-auto text-right font-medium"
//             dir="rtl"
//             for="ch-subject"
//           >
//             {yearOrSeason == "year" ? "اختر السنة" : "اختر الفصل"}
//           </label>

//           <select
//             id="ch-subject"
//             dir="rtl"
//             on:input={(e) => {
//               e.stopPropagation();
//               if (yearOrSeason == "season") {
//                 setQStore("year", section[1]);
//                 setQStore("season", e.currentTarget.value);
//               }
//               if (yearOrSeason == "year") {
//                 setQStore("season", section[1]);
//                 setQStore("year", e.currentTarget.value);
//               }
//             }}
//             class="bg-darker-light-1 focus:border-main focus:ring-main dark:bg-lighter-dark-1 mt-2 mb-2 rounded-lg border border-gray-300 p-2 transition outline-none focus:ring-2 dark:border-gray-600"
//             name="subject"
//             value={yearOrSeason == "year" ? QStore.year : QStore.season}
//             required
//           >
//             <For each={sectionArr}>
//               {(sec) => (
//                 <option value={sec.id || sec}>{sec.name || sec}</option>
//               )}
//             </For>
//           </select>

//           <input
//             value={QStore.question}
//             on:input={(e) => {
//               e.stopPropagation();
//               setQStore("question", e.currentTarget.value);
//             }}
//             name="question"
//             class="bg-darker-light-1 focus:border-main focus:ring-main dark:bg-lighter-dark-1 rounded-lg border border-gray-300 p-2 text-right transition outline-none placeholder:text-gray-400 focus:ring-2 dark:border-gray-600"
//             dir="auto"
//             type="text"
//             placeholder="السؤال"
//             required
//             aria-rowspan={2}
//           />

//           <input
//             value={QStore.explanation}
//             on:input={(e) => {
//               e.stopPropagation();
//               setQStore("explanation", e.currentTarget.value);
//             }}
//             name="explanation"
//             class="bg-darker-light-1 focus:border-main focus:ring-main dark:bg-lighter-dark-1 mb-4 rounded-lg border border-gray-300 p-2 text-right transition outline-none placeholder:text-gray-400 focus:ring-2 dark:border-gray-600"
//             dir="auto"
//             type="text"
//             placeholder="الشرح"
//           />

//           <For each={options}>
//             {(option, index) => (
//               <div class="flex items-center gap-3">
//                 <input
//                   value={QStore[option.name]}
//                   on:input={(e) => {
//                     e.stopPropagation();
//                     setQStore(option.name, e.currentTarget.value);
//                   }}
//                   class="bg-darker-light-1 focus:border-main focus:ring-main dark:bg-lighter-dark-1 flex-1 rounded-lg border border-gray-300 p-2 text-right transition outline-none placeholder:text-gray-400 focus:ring-2 dark:border-gray-600"
//                   dir="auto"
//                   type="text"
//                   placeholder={`الخيار ${option.placeholder}`}
//                   required={index() < 2}
//                 />
//                 <input
//                   type="checkbox"
//                   checked={QStore.correctIndex.includes(index())}
//                   on:input={(e) => {
//                     e.stopPropagation();
//                     const newCorrect = QStore.correctIndex.includes(index())
//                       ? QStore.correctIndex.filter((num) => num !== index())
//                       : [...QStore.correctIndex, index()];
//                     setQStore("correctIndex", newCorrect);
//                   }}
//                   class="accent-main h-5 w-5 cursor-pointer rounded"
//                 />
//               </div>
//             )}
//           </For>

//           <button
//             dir="auto"
//             class="from-main to-main/80 hover:from-main/90 hover:to-main/70 mt-3 rounded-lg bg-gradient-to-r p-2 font-medium text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
//             type="submit"
//             disabled={disableSB()}
//           >
//             {disableSB() ? "جار الإرسال..." : "إرسال"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
import { createResource, createSignal, For, onCleanup, Setter, Show } from "solid-js";
import { reconcile, unwrap } from "solid-js/store";
import { QStore, setQStore } from "../stores/QStores";
import { getSections, insertQuestion, updateQuestion } from "../services/documentsManuplation";
import { qModeT } from "../pages/Quiz/DevMode";
import { useParams } from "@solidjs/router";
import { useUser } from "../context/user";

const emptyStore = {
  subject:      "",
  season_id:    null as number | null,
  year_id:      null as number | null,
  question:     "",
  explanation:  "",
  options:      ["", "", "", ""],
  correctIndex: [] as number[],
  user_id:      "",
};

export default function Panel(props: {
  openSetter: Setter<qModeT | any>;
  id?: string;
  type?: "add" | "edit";
}) {
  const [submitting, setSubmitting] = createSignal(false);
  const subject = useParams().subject;
  const userCtx = useUser();

  const [sections] = createResource(() => getSections(subject));
  const seasons = () => sections()?.filter((s) => s.type === "season") ?? [];
  const years   = () => sections()?.filter((s) => s.type === "year")   ?? [];

  setQStore("subject", subject);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const data = unwrap(QStore);
    const currentUser = userCtx?.user?.();
    data.user_id =
      currentUser?.id ??
      (localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")!).id
        : "unknown");

    setSubmitting(true);
    try {
      if (props.type === "add") {
        await insertQuestion(subject, data);
      } else {
        await updateQuestion(subject, props.id!, data);
      }
      props.openSetter("");
    } finally {
      setSubmitting(false);
    }
  };

  onCleanup(() => setQStore(reconcile(emptyStore as any)));

  return (
    <div
      on:click={(e) => e.stopPropagation()}
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div class="dark:bg-main-dark bg-main-light relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-xl">
        <button
          on:click={() => props.openSetter("")}
          class="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700"
        >✕</button>

        <form onSubmit={handleSubmit} class="flex flex-col gap-3 pt-4" dir="rtl">

          {/* Season */}
          <Show when={seasons().length > 0}>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">الفصل</label>
              <select
                required
                value={QStore.season_id ?? ""}
                on:change={(e) => setQStore("season_id", Number(e.currentTarget.value))}
                class="bg-darker-light-1 dark:bg-lighter-dark-1 focus:border-main rounded-lg border border-gray-300 p-2 outline-none dark:border-gray-600"
              >
                <option value="" disabled>اختر الفصل...</option>
                <For each={seasons()}>
                  {(s) => <option value={s.id} selected={QStore.season_id === s.id}>{s.name}</option>}
                </For>
              </select>
            </div>
          </Show>

          {/* Year */}
          <Show when={years().length > 0}>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">السنة</label>
              <select
                required
                value={QStore.year_id ?? ""}
                on:change={(e) => setQStore("year_id", Number(e.currentTarget.value))}
                class="bg-darker-light-1 dark:bg-lighter-dark-1 focus:border-main rounded-lg border border-gray-300 p-2 outline-none dark:border-gray-600"
              >
                <option value="" disabled>اختر السنة...</option>
                <For each={years()}>
                  {(y) => <option value={y.id} selected={QStore.year_id === y.id}>{y.name}</option>}
                </For>
              </select>
            </div>
          </Show>

          {/* Question */}
          <input
            value={QStore.question}
            on:input={(e) => setQStore("question", e.currentTarget.value)}
            type="text" placeholder="السؤال" required dir="auto"
            class="bg-darker-light-1 dark:bg-lighter-dark-1 focus:border-main rounded-lg border border-gray-300 p-2 outline-none placeholder:text-gray-400 dark:border-gray-600"
          />

          {/* Explanation */}
          <input
            value={QStore.explanation}
            on:input={(e) => setQStore("explanation", e.currentTarget.value)}
            type="text" placeholder="الشرح (اختياري)" dir="auto"
            class="bg-darker-light-1 dark:bg-lighter-dark-1 focus:border-main mb-2 rounded-lg border border-gray-300 p-2 outline-none placeholder:text-gray-400 dark:border-gray-600"
          />

          {/* Options */}
          <For each={QStore.options}>
            {(opt, index) => (
              <div class="flex items-center gap-3">
                <input
                  value={opt}
                  on:input={(e) => {
                    const updated = [...QStore.options];
                    updated[index()] = e.currentTarget.value;
                    setQStore("options", updated);
                  }}
                  dir="auto" type="text"
                  placeholder={`الخيار ${index() + 1}`}
                  required={index() < 2}
                  class="bg-darker-light-1 dark:bg-lighter-dark-1 focus:border-main flex-1 rounded-lg border border-gray-300 p-2 outline-none placeholder:text-gray-400 dark:border-gray-600"
                />
                <label class="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={QStore.correctIndex?.includes(index())}
                    on:change={(e) => {
                      const updated = e.currentTarget.checked
                        ? [...(QStore.correctIndex ?? []), index()]
                        : (QStore.correctIndex ?? []).filter((n) => n !== index());
                      setQStore("correctIndex", updated);
                    }}
                    class="accent-main h-5 w-5 cursor-pointer"
                  />
                  <span class="text-xs text-gray-500">صحيح</span>
                </label>
              </div>
            )}
          </For>

          {/* Add option button */}
          <Show when={QStore.options.length < 5}>
            <button
              type="button"
              on:click={() => setQStore("options", [...QStore.options, ""])}
              class="text-main text-sm underline"
            >
              + إضافة خيار
            </button>
          </Show>

          <button
            type="submit" disabled={submitting()}
            class="from-main to-main/80 mt-3 rounded-lg bg-gradient-to-r p-2 font-medium text-white shadow-md transition disabled:opacity-60"
          >
            {submitting() ? "جار الإرسال..." : props.type === "add" ? "إضافة السؤال" : "حفظ التعديلات"}
          </button>

        </form>
      </div>
    </div>
  );
}
