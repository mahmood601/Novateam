import { createSignal, For, onCleanup, onMount, Setter } from "solid-js";
import subjects from "./subjects";
import { reconcile, unwrap } from "solid-js/store";
import { QStore, qStoreObj, setQStore } from "../stores/QStores";
import {
  insertQuestion,
  updateQuestion,
} from "../lib/appwrite/documentsManuplation";
import { qModeT } from "./Quiz/DevMode";
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
    setDisableSB(true);
    if (props.type == "add") {
      insertQuestion(subject, data).then(() => {
        setDisableSB(false);
      });
    } else {
      updateQuestion(subject, props.id, data);
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
      class="accent-main caret-main text-main-dark  dark:text-main-light fixed top-1/2 left-1/2 z-50 h-screen w-screen -translate-x-1/2 -translate-y-1/2"
    >
      <div class="dark:bg-main-dark bg-main-light h-full w-full rounded-md p-5">
        <button
          on:click={(e) => {
            e.stopPropagation();
            props.openSetter("");
          }}
          class="text-main-dark dark:text-main-light flex cursor-pointer justify-start"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={26}
            height={26}
            viewBox="0 0 16 16"
          >
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={1.5}
              d="m11.25 4.75l-6.5 6.5m0-6.5l6.5 6.5"
            />
          </svg>
        </button>

        <div>
          <form onSubmit={handleSubmit} class="flex flex-col gap-1">
            <label
              class="text-main-dark dark:text-main-light text-right"
              dir="rtl"
              for="ch-subject"
            >
              {yearOrSeason == "year" ? "اختر السنة" : "اختر الفصل"}{" "}
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
              class="bg-darker-light-1 dark:bg-lighter-dark-1 mb-2 rounded-md p-1 outline-none"
              name="subject"
              value={yearOrSeason == "year" ? QStore.year : QStore.season}
              required
            >
              <For each={sectionArr}>
                {(sec) => (
                  <option value={sec.id || sec}>{sec.name || sec}</option>
                )}
              </For>
            </select>

            <input
              value={QStore.question}
              on:input={(e) => {
                e.stopPropagation();
                setQStore("question", e.currentTarget.value);
              }}
              name="question"
              class="rounded-md bg-darker-light-1 dark:bg-lighter-dark-1 p-1 text-right outline-none placeholder:transition-colors focus:placeholder-transparent"
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
              class="mb-5 rounded-md bg-darker-light-1 dark:bg-lighter-dark-1 p-1 text-right outline-none placeholder:transition-colors focus:placeholder-transparent"
              dir="auto"
              type="text"
              placeholder="الشرح"
            />

            <For each={options}>
              {(option, index) => (
                <div class="flex items-center gap-2">
                  <input
                    value={QStore[option.name]}
                    on:input={(e) => {
                      e.stopPropagation();
                      setQStore(option.name, e.currentTarget.value);
                    }}
                    class="flex-1 rounded-md bg-darker-light-1 dark:bg-lighter-dark-1 p-1 text-right outline-none placeholder:transition-colors focus:placeholder-transparent"
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
                    class="cursor-pointer"
                  />
                </div>
              )}
            </For>

            <button
              dir="auto"
              class="bg-main mt-2 rounded-md p-1"
              type="submit"
              disabled={disableSB()}
            >
              {disableSB() ? "جار الارسال..." : "ارسال"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
