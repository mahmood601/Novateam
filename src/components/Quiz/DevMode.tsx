import {
  Accessor,
  createEffect,
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  Match,
  Setter,
  Show,
  Suspense,
  Switch,
} from "solid-js";
import Panel from "../panel";
import {
  deleteQuestion,
  listQuestions,
} from "../../lib/appwrite/documentsManuplation";
import { useParams } from "@solidjs/router";
import { setQStore } from "../../stores/QStores";

export type qModeT = "insert" | "edit" | "delete" | "";

const [qMode, setQMode] = createSignal<qModeT>("");

export default function DevMode() {
  const [questions, setQuestions] = createSignal();
  const [questionsLength, setQuestionsLength] = createSignal<number>(0);

  const [id, setId] = createSignal("");
  const [direction, setDirection] = createSignal("");
  const [pageIndex, setPageIndex] = createSignal(0);

  const params = useParams();
  const subject = params.subject;
  const fSection = params.section.split("-")[0];
  const sSection = params.section.split("-")[1];
  const fetchQS = async (pageIndex)  =>
    await listQuestions(
      subject,
      [
        "$id",
        "question",
        "firstOption",
        "secondOption",
        "thirdOption",
        "fourthOption",
        "fifthOption",
        "correctIndex",
        "year",
        "season",
        "explanation",
      ],
      [{ attribute: fSection, value: sSection }],
      pageIndex,
    );
  const [data] = createResource(pageIndex, fetchQS);

  createEffect(() => {
    const documents = data()?.documents;
    if (documents) {
      setQuestions(documents);
      setQuestionsLength(data()?.total);
    }
  });

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <p>{error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
    >
      <div class="text-main-dark dark:text-main-light bg-main-light dark:bg-main-dark top-0 flex h-screen flex-col items-center p-4">
        <Suspense fallback={<p dir="rtl">جار التحميل...</p>}>
          <Switch>
            <Match when={data.error}>
              <span>Error: {data.error.message}</span>
            </Match>

            <Match when={data()}>
              <div class="mb-2 flex w-11/12 justify-end">
                {" "}
                <div
                  onClick={() => {
                    setQMode("insert");
                  }}
                  class="bg-main flex w-fit cursor-pointer rounded-md p-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M18 10h-4V6a2 2 0 0 0-4 0l.071 4H6a2 2 0 0 0 0 4l4.071-.071L10 18a2 2 0 0 0 4 0v-4.071L18 14a2 2 0 0 0 0-4"
                    />
                  </svg>{" "}
                  اضافة سؤال
                  <Show when={qMode() == "insert"}>
                    <Panel type="add" openSetter={setQMode} />
                  </Show>
                </div>
              </div>
              <div on:click={e=> e.stopPropagation()} class="flex h-fit w-full flex-col items-center overflow-y-scroll">
                <For each={questions()}>
                  {(question) => (
                    <QuestionBox
                      subject={subject}
                      id={question.$id}
                      question={question.question}
                      questions={questions}
                      setQuestions={setQuestions}
                      options={[
                        question.firstOption,
                        question.secondOption,
                        question.thirdOption,
                        question.fourthOption,
                        question.fifthOption,
                      ]}
                      correctIndex={question.correctIndex}
                      explanation={question.explanation}
                    />
                  )}
                </For>
              </div>
              <Show when={questionsLength() > 5}>
                <div class="mt-3 flex w-5/6 min-w-fit flex-row-reverse flex-wrap justify-center gap-2 bg-gray-200 p-4">
                  <For each={new Array(Math.ceil(questionsLength() / 5))}>
                    {(_, index) => (
                      <button
                        data-index={index()}
                        
                        on:click={(e) => {
                          e.stopPropagation();
                          setPageIndex(e.currentTarget.dataset.index);
                        }}

                        classList={{
                          "bg-main": pageIndex() == index(),
                          "w-7 h-7 cursor-pointer bg-gray-500 text-center duration-200 transition-color":
                            true,
                        }}
                      >
                        {index() + 1}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </Match>
          </Switch>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

function QuestionBox(props: {
  subject: string;
  id: any;
  question: string;
  questions: Accessor<any>;
  setQuestions: Setter<any>;
  options: string[];
  correctIndex: number[];
  explanation: string;
}) {
  const [open, setOpen] = createSignal(false);
  const params = useParams();
  const subject = params.subject;
  return (
    <div
      on:click={(e) => {
        e.stopPropagation()
        setOpen(!open());
      }}
      class="bg-darker-light-1 dark:bg-lighter-dark-1 mb-7 w-5/6 rounded-md p-4"
    >
      <p dir="auto">{props.question}</p>
      <For each={props.options.filter((option) => option)}>
        {(option, index) => (
          <p
            dir="auto"
            classList={{
              "bg-main rounded-md p-1 text-main-dark":
                props.correctIndex.includes(index()),
              "my-1": true,
            }}
          >
            {index() + 1}. {option}
          </p>
        )}
      </For>
      <p dir="auto" class="text-main mt-2 text-center text-wrap">
        {props.explanation}
      </p>

      <Show when={open()}>
        <div class="mt-2 flex justify-around">
          <button
            on:click={(e) => {
              e.stopPropagation();
              setQMode("edit");

              props.questions().map((q) => {
                if (q.$id == props.id) {
                  setQStore(q);
                }
              });
            }}
            class="bg-main rounded-md p-2"
          >
            تعديل
            <Show when={qMode() == "edit"}>
              <Panel type="edit" openSetter={setQMode} id={props.id} />
            </Show>
          </button>
          <button
            on:click={(e) => {
              e.stopPropagation()
              deleteQuestion(props.subject, props.id).then(() => {
                props.setQuestions(
                  props.questions().filter((q) => q.$id != props.id),
                );
              });
            }}
            class="bg-main rounded-md p-2"
          >
            حذف
          </button>
        </div>
      </Show>
    </div>
  );
}
