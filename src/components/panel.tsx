import { createSignal, For, onCleanup, Setter } from "solid-js";
import subjects from "./subjects";
import { reconcile, unwrap } from "solid-js/store";
import { QStore, setQStore } from "../stores/QStores";
import {
  insertQuestion,
  updateQuestion,
} from "../lib/appwrite/documentsManuplation";
import { qModeT } from "../pages/Quiz/DevMode";
import { useParams } from "@solidjs/router";

const options = [
  { name: "firstOption", placeholder: "الأول" },
  { name: "secondOption", placeholder: "الثاني" },
  { name: "thirdOption", placeholder: "الثالث" },
  { name: "fourthOption", placeholder: "الرابع" },
  { name: "fifthOption", placeholder: "الخامس" },
];

export default function Panel(props: {
  openSetter: Setter<qModeT | any>;
  id?: string;
  type?: "add" | "edit";
}) {
  const [disableSB, setDisableSB] = createSignal(false);
  const subject = useParams().subject;
  const section = useParams().section.split("-");
  const yearOrSeason = section[0] == "year" ? "season" : "year";
  const sectionArr = subjects[subject][yearOrSeason];
  setQStore("subject", subject);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    
    const data = unwrap(QStore);
    console.log(data);

    setDisableSB(true);
    if (props.type == "add") {
      insertQuestion(subject, data).finally(() => {
        setDisableSB(false);
      });
    } else {
      updateQuestion(subject, props.id, data).finally(() => {
        setDisableSB(false);
      });
    }
  };

  onCleanup(() => {
    setQStore(
      reconcile({
        subject: "",
        year: "",
        season: "",
        question: "",
        explanation: "",
        firstOption: "",
        secondOption: "",
        thirdOption: "",
        fourthOption: "",
        fifthOption: "",
        correctIndex: [],
      }),
    );
  });
  return (
   <div
  on:click={(e) => e.stopPropagation()}
  class="accent-main caret-main text-main-dark dark:text-main-light fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-black/40 px-4"
>
  <div class="dark:bg-main-dark relative bg-main-light h-fit max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-xl">
   <button
          on:click={(e) => {
            e.stopPropagation();
            props.openSetter("");
          }}
          class="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 shadow hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={22}
            height={22}
            viewBox="0 0 16 16"
          >
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="m11.25 4.75l-6.5 6.5m0-6.5l6.5 6.5"
            />
          </svg>
        </button>


    <form onSubmit={handleSubmit} class="flex flex-col gap-3">
      <label
        class="text-main-dark mx-auto dark:text-main-light text-right font-medium"
        dir="rtl"
        for="ch-subject"
      >
        {yearOrSeason == "year" ? "اختر السنة" : "اختر الفصل"}
      </label>

      <select
        id="ch-subject"
        dir="rtl"
        on:input={(e) => {
          e.stopPropagation();
          if (yearOrSeason == "season") {
            setQStore("year", section[1]);
            setQStore("season", e.currentTarget.value);
          }
          if (yearOrSeason == "year") {
            setQStore("season", section[1]);
            setQStore("year", e.currentTarget.value);
          }
        }}
        class="mb-2 mt-2 rounded-lg border border-gray-300 bg-darker-light-1 p-2 outline-none transition focus:border-main focus:ring-2 focus:ring-main dark:border-gray-600 dark:bg-lighter-dark-1"
        name="subject"
        value={yearOrSeason == "year" ? QStore.year : QStore.season}
        required
      >
        <For each={sectionArr}>
          {(sec) => <option value={sec.id || sec}>{sec.name || sec}</option>}
        </For>
      </select>

      <input
        value={QStore.question}
        on:input={(e) => {
          e.stopPropagation();
          setQStore("question", e.currentTarget.value);
        }}
        name="question"
        class="rounded-lg border border-gray-300 bg-darker-light-1 p-2 text-right outline-none transition placeholder:text-gray-400 focus:border-main focus:ring-2 focus:ring-main dark:border-gray-600 dark:bg-lighter-dark-1"
        dir="auto"
        type="text"
        placeholder="السؤال"
        required
        aria-rowspan={2}
      />

      <input
        value={QStore.explanation}
        on:input={(e) => {
          e.stopPropagation();
          setQStore("explanation", e.currentTarget.value);
        }}
        name="explanation"
        class="mb-4 rounded-lg border border-gray-300 bg-darker-light-1 p-2 text-right outline-none transition placeholder:text-gray-400 focus:border-main focus:ring-2 focus:ring-main dark:border-gray-600 dark:bg-lighter-dark-1"
        dir="auto"
        type="text"
        placeholder="الشرح"
      />

      <For each={options}>
        {(option, index) => (
          <div class="flex items-center gap-3">
            <input
              value={QStore[option.name]}
              on:input={(e) => {
                e.stopPropagation();
                setQStore(option.name, e.currentTarget.value);
              }}
              class="flex-1 rounded-lg border border-gray-300 bg-darker-light-1 p-2 text-right outline-none transition placeholder:text-gray-400 focus:border-main focus:ring-2 focus:ring-main dark:border-gray-600 dark:bg-lighter-dark-1"
              dir="auto"
              type="text"
              placeholder={`الخيار ${option.placeholder}`}
              required={index() < 2}
            />
            <input
              type="checkbox"
              checked={QStore.correctIndex.includes(index())}
              on:input={(e) => {
                e.stopPropagation();
                const newCorrect = QStore.correctIndex.includes(index())
                  ? QStore.correctIndex.filter((num) => num !== index())
                  : [...QStore.correctIndex, index()];
                setQStore("correctIndex", newCorrect);
              }}
              class="h-5 w-5 cursor-pointer rounded accent-main"
            />
          </div>
        )}
      </For>

      <button
        dir="auto"
        class="mt-3 rounded-lg bg-gradient-to-r from-main to-main/80 p-2 font-medium text-white shadow-md transition hover:from-main/90 hover:to-main/70 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={disableSB()}
      >
        {disableSB() ? "جار الإرسال..." : "إرسال"}
      </button>
    </form>
  </div>
</div>

  );
}