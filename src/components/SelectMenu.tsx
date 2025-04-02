import { createSignal, For, Match, onCleanup, Switch } from "solid-js";
import { TransitionGroup } from "solid-transition-group";
import { A, useParams } from "@solidjs/router";
import subjects from "./subjects";

const [activeIndex, setActiveIndex] = createSignal(2);

export default function SeclectMenu() {
  const subject = useParams().subject;
  const subjectProperties = subjects[subject];
  const years = subjectProperties?.year;
  const seasons = subjectProperties?.season;

  onCleanup(() => {
    setActiveIndex(2);
  });
  return (
    <div class="bg-main-light dark:bg-main-dark flex w-screen flex-1 flex-col items-center justify-center">
      <Switch>
        <Match when={activeIndex() == 0}>
          <Box text="السنوات" index={0} arr={years} />
        </Match>
        <Match when={activeIndex() == 1}>
          {" "}
          <Box text="الفصول" index={1} arr={seasons} />
        </Match>
        <Match when={activeIndex() > 1}>
          {" "}
          <Box text="السنوات" index={0} arr={[]} />
          <Box text="الفصول" index={1} arr={[]} />
        </Match>
      </Switch>
    </div>
  );
}

function Box(props: { text: string; index: number; arr: string[] | any }) {
  const [sectionText, setSectionText] = createSignal("");
  return (
    <div class="hover:border-main bg-darker-light-1 dark:bg-lighter-dark-1 mb-5 w-5/6 cursor-pointer rounded-md border-1 border-black">
      <div
        onClick={() => {
          setActiveIndex(activeIndex() == props.index ? 2 : props.index);
        }}
        class="dark:text-main-light w-full p-8"
      >
        <p class="w-full text-center text-lg font-bold">{props.text}</p>
      </div>

      <div class="bg-darker-light-2 dark:bg-lighter-dark-2 -mt-1 flex h-fit max-h-70 flex-col items-center overflow-y-scroll transition-all duration-150">
        <TransitionGroup name="dropdown" appear={true}>
          <For each={props.arr}>
            {(el) => (
              <A
                on:click={() => {
                  if (props.index == 0) {
                    setSectionText("year-" + el);
                  }
                  if (props.index == 1) {
                    setSectionText("season-" + el.id);
                  }
                }}
                href={sectionText()}
                class="bg-main m-2 w-11/12 rounded-md p-2 text-center transition-all duration-200"
              >
                {el.name || el}
              </A>
            )}
          </For>
        </TransitionGroup>
      </div>
    </div>
  );
}
