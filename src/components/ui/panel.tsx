import { createSignal, For, onMount, Setter, Show } from "solid-js";
import subjects from "../subjects";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { DATABASE_ID, databases } from "~/lib/appwrite";

const options = [
  {
    name: "first",
    placeholder: "الاول",
  },
  {
    name: "second",
    placeholder: "الثاني",
  },
  {
    name: "third",
    placeholder: "الثالث",
  },
  {
    name: "fourth",
    placeholder: "الرابع",
  },
  {
    name: "fifth",
    placeholder: "الخامس",
  },
];

const formObject = () => ({
  subject: "",
  question: "",
  explanation: "",
  first: "",
  second: "",
  third: "",
  fourth: "",
  fifth: "",
  correct: [] as number[],
});

export default function Panel(props: { openSetter: Setter<boolean> }) {
  const [form, setForm] = createStore(formObject());

  return (
    <div class="absolute bg-gray-50  shadow-md dark:bg-dark-hover dark:shadow-slate-800 shadow-slate-400 top-full left-1/2 rounded-md -translate-x-1/2 translate-y-3 p-2 w-11/12">
      <button
        onClick={() => {
          props.openSetter(false);
        }}
        class="text-black dark:text-white"
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
          ></path>
        </svg>
      </button>
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data= unwrap(form)
            try {
              databases.createDocument(DATABASE_ID, "67d034520023ddfd14f2", data)
            } catch (e) {
              console.log(e)
            }
            // setForm(reconcile(formObject()));
          }}
          action=""
          class="flex flex-col gap-1"
        >
          <select
            dir="rtl"
            value={form.subject}
            onInput={(e) => setForm("subject", e.currentTarget.value)}
            class="outline-none p-2 mb-2 rounded-md"
            name="subject"
            required
          >
            <For each={subjects}>
              {(subject) => (
                <option value={subject.linkId}>{subject.name}</option>
              )}
            </For>
          </select>
          <input
            value={form.question}
            onInput={(e) => setForm("question", e.currentTarget.value)}
            name="question"
            class="rounded-md text-right p-1  outline-none placeholder:transition-colors focus:placeholder-transparent"
            dir="auto"
            type="text"
            placeholder="السؤال"
            required
          />
          <input
            value={form.explanation}
            onInput={(e) => setForm("explanation", e.currentTarget.value)}
            name="explanation"
            class="rounded-md text-right p-1 mb-5  outline-none placeholder:transition-colors focus:placeholder-transparent"
            dir="auto"
            type="text"
            placeholder="الشرح"
          />
          <For each={options}>
            {(option, index) => (
              <div class="flex">
                <input
                  value={form[option.name]}
                  onInput={(e) => {
                    setForm(
                      e.currentTarget.dataset.key as any,
                      e.currentTarget.value
                    );
                  }}
                  data-key={option.name}
                  class="flex-1 rounded-md text-right p-1 mr-2 outline-none placeholder:transition-colors focus:placeholder-transparent"
                  dir="auto"
                  type="text"
                  placeholder={"الخيار " + option.placeholder}
                  required={index() < 2}
                />
                <input
                  type="checkbox"
                  checked={form.correct.includes(index())}
                  data-index={index()}
                  onInput={(e) => {
                    const parseDataIndex = Number.parseInt(
                      e.currentTarget.dataset.index!
                    );
                    // genertate new array remove index if it included and add it if not
                    const newCorrect = form.correct.includes(parseDataIndex)
                      ? form.correct.filter((num) => num != parseDataIndex)
                      : [...form.correct, parseDataIndex];

                    setForm("correct", newCorrect);
                  }}
                />
              </div>
            )}
          </For>
          <button class="rounded-md bg-slate-500 p-1 mt-2" type="submit">
            ارسال
          </button>
        </form>
      </div>
    </div>
  );
}
