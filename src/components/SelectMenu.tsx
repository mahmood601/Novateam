import { useParams, A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { TransitionGroup } from "solid-transition-group";
import subjects from "./subjects";
import { Favorite, getFavorites, removeFavorite } from "../utils/indexeddb";

export default function SelectMenu() {
  const subject = useParams().subject;
  const subjectProperties = subjects[subject];
  const years = subjectProperties?.year ?? [];
  const seasons = subjectProperties?.season ?? [];

  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  const sections: {
    text: string;
    arr: (string | { id: number; name: string })[];
    type: SectionType;
  }[] = [
    {
      text: "السنوات",
      arr: years as (string | { id: number; name: string })[],
      type: "year",
    },
    {
      text: "الفصول",
      arr: seasons as (string | { id: number; name: string })[],
      type: "season",
    },
    { text: "المفضلة", arr: [], type: "favorites" },
  ];

  return (
    <div class="bg-main-light dark:bg-main-dark flex w-screen flex-1 flex-col items-center justify-center">
      <For each={sections}>
        {(section, index) => (
          <Box
            text={section.text}
            index={index()}
            arr={section.arr}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            type={section.type}
            subject={subject}
          />
        )}
      </For>
    </div>
  );
}
type SectionType = "year" | "season" | "favorites";

function Box(props: {
  text: string;
  index: number;
  arr: (string | { id: number; name: string })[];
  activeIndex: () => number | null;
  setActiveIndex: (v: number | null) => void;
  type: SectionType;
  subject: string;
}) {
  const isActive = () => props.activeIndex() === props.index;

  // favorites for this subject
  const [favorites] = createResource(async () => {
    const saved = await getFavorites(props.subject);
    return saved || [];
  });

  const makeHref = (el: any) => {
    if (props.type === "year") return `year-${el}`;
    if (props.type === "season") return `season-${el.id}`;
    if (props.type === "favorites") return `favorite`;
    return "#";
  };

  return (
    <Show
      when={props.type === "favorites"}
      fallback={
        <div class="hover:border-main bg-darker-light-1 dark:bg-lighter-dark-1 mb-5 w-5/6 cursor-pointer rounded-md border-1 border-black">
          <div
            onClick={() => {
              props.setActiveIndex(isActive() ? null : props.index);
            }}
            class="dark:text-main-light w-full p-8"
          >
            <p class="w-full text-center text-lg font-bold">{props.text}</p>
          </div>
          <Show when={isActive()}>
            <div class="bg-darker-light-2 dark:bg-lighter-dark-2 -mt-1 flex max-h-70 flex-col items-center overflow-y-auto transition-all duration-150">
              <TransitionGroup name="dropdown" appear>
                <For
                  each={props.type === "favorites" ? favorites() : props.arr}
                >
                  {(el: any) => (
                    <div class="flex w-11/12 items-center gap-2">
                      <A
                        href={makeHref(el)}
                        class="bg-main m-2 flex-1 rounded-md p-2 text-center transition-all duration-200"
                      >
                        {typeof el === "string"
                          ? el
                          : el.name || el.snapshot.question}
                      </A>

                      {/* favorite toggle button */}
                      {props.type === "favorites" && (
                        <button
                          class="text-red-500"
                          onClick={() => removeFavorite(el)}
                        >
                          ✖
                        </button>
                      )}
                    </div>
                  )}
                </For>
              </TransitionGroup>

              {/* if no favorites */}
              <Show
                when={props.type === "favorites" && favorites().length === 0}
              >
                <p class="my-3 text-gray-400">
                  لا توجد أسئلة مفضلة لهذا الموضوع
                </p>
              </Show>
            </div>
          </Show>
        </div>
      }
    >
      <A
        href={makeHref("favorite")}
        class="hover:border-main bg-darker-light-1 dark:bg-lighter-dark-1 mb-5 w-5/6 cursor-pointer rounded-md border-1 border-black"
      >
        <div
          onClick={() => {
            props.setActiveIndex(isActive() ? null : props.index);
          }}
          class="dark:text-main-light w-full p-8"
        >
          <p class="w-full text-center text-lg font-bold">{props.text}</p>
        </div>
      </A>
    </Show>
  );
}
