import { createSignal, For, JSX, onMount, Show } from "solid-js";
import { stateStore, setStateStore } from "../../stores/testStore";
import { TestProps } from "../TestsList";
import { years } from "../years";
import { QStore, setQStore } from "../../stores/QStores";

export default function SubHeader(props: { questions: TestProps[] }) {
  return (
    <div class="bg-white dark:bg-[#222] z-40 fixed top-20 h-16 w-full flex flex-row-reverse justify-between py-2 px-8 items-center">
      <PopupBox
        index={0}
        icon={
          <svg
            class="text-black  dark:text-white"
            xmlns="http://www.w3.org/2000/svg"
            width={26}
            height={26}
            viewBox="0 0 512 512"
          >
            <path
              fill="currentColor"
              d="M64 144h226.75a48 48 0 0 0 90.5 0H448a16 16 0 0 0 0-32h-66.75a48 48 0 0 0-90.5 0H64a16 16 0 0 0 0 32m384 224h-66.75a48 48 0 0 0-90.5 0H64a16 16 0 0 0 0 32h226.75a48 48 0 0 0 90.5 0H448a16 16 0 0 0 0-32m0-128H221.25a48 48 0 0 0-90.5 0H64a16 16 0 0 0 0 32h66.75a48 48 0 0 0 90.5 0H448a16 16 0 0 0 0-32"
            ></path>
          </svg>
        }
      >
        <FirstPopup questions={props.questions} />
      </PopupBox>
      <PopupBox
        index={1}
        icon={
          <svg
            class="text-black dark:text-white"
            xmlns="http://www.w3.org/2000/svg"
            width={26}
            height={26}
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M6.532 4.75c-.458 0-.854 0-1.165.03c-.307.028-.685.095-.993.348A1.72 1.72 0 0 0 3.75 6.45c-.002.39.172.726.34.992c.168.27.411.59.695.964l2.596 3.422c.252.332.315.42.359.51q.068.14.099.297c.02.1.023.212.023.634v2.97c0 .238-.001.494.07.738c.062.212.165.41.303.585c.16.2.37.346.562.477l.048.033l.99.683c.166.115.331.23.475.31s.388.202.69.183c.363-.022.69-.208.9-.495c.172-.236.21-.499.224-.663c.014-.166.014-.37.014-.578v-4.243c0-.422.004-.534.023-.634q.03-.157.1-.297c.043-.09.106-.178.358-.51l2.596-3.422c.284-.374.527-.694.696-.964c.167-.266.34-.602.339-.992a1.72 1.72 0 0 0-.624-1.322c-.308-.253-.686-.32-.993-.349c-.311-.029-.707-.029-1.165-.029zM5.251 6.439a.22.22 0 0 1 .057-.134c.024-.007.083-.021.2-.032c.232-.022.556-.023 1.06-.023h6.864c.504 0 .828 0 1.06.023c.117.01.176.025.2.032c.03.033.053.08.057.134a1 1 0 0 1-.11.207c-.128.205-.33.472-.64.881L13.64 8H6.36L6 7.527c-.31-.41-.512-.676-.64-.881a1 1 0 0 1-.11-.207M16.5 9.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5zm-1.5 2.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5zm-.5 2.5a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5zm0 2.5a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5z"
            ></path>
          </svg>
        }
      >
        <SecondPopup />
      </PopupBox>
      <p class="text-black dark:text-white font-bold">
        {formatTimer(stateStore.timer.value)}
      </p>
      <p class="text-black diagonal-fractions dark:text-white font-bold text-2xl">
        {stateStore.numberOfCorrect}/{props.questions.length}
      </p>
    </div>
  );
}

function formatTimer(seconds: number) {
  let hours = Math.floor(seconds / 3600);
  let mins = Math.floor(seconds / 60);
  let secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const [opened, setOpened] = createSignal(3);

function PopupBox(props: { index: number; icon: any; children: JSX.Element }) {
  let TestMenuRef!: HTMLDivElement;

  const handleClick = (e: MouseEvent) => {
    if (!TestMenuRef.contains(e.target as Node)) {
      setOpened(3);
    }
  };

  onMount(() => {
    document.addEventListener("click", handleClick);
  });

  return (
    <div
      ref={TestMenuRef}
      on:click={(e) => {
        e.stopPropagation();
        setOpened(props.index);
      }}
      class="relative flex flex-col items-center justify-around  hover:bg-gray-200 p-1 rounded-md"
    >
      {props.icon}
      <Show when={opened() == props.index}>{props.children}</Show>
    </div>
  );
}

let count: any; // for timer
function FirstPopup(props: { questions: TestProps[] }) {
  return (
    <ul
    on:click={(e)=> {
      e.stopPropagation();
      setOpened(3);
    }}
      dir="rtl"
      class="shadow-md shadow-[#555] dark:shadow-none absolute -right-4  top-full translate-y-6 z-50 bg-white dark:bg-[#444] dark:text-white text-right w-32 rounded-md"
    >
      <li
        on:click={() => {
          if (stateStore.timer.isPaused || stateStore.timer.value == 0) {
            setStateStore("timer", "isPaused", false);
            count = setInterval(() => {
              setStateStore("timer", "value", (n) => n + 1);
              if (stateStore.numberOfAnswered == props.questions.length) {
                clearInterval(count);
              }
            }, 1000);
          }
        }}
        class="w-full text-center p-2 border-b-[1px] hover:bg-gray-100 border-b-gray-400"
      >
        <button>تشغيل المؤقت</button>
      </li>
      <li
        on:click={() => {
          clearInterval(count);
          setStateStore("timer", "isPaused", true);
        }}
        class="w-full p-2 border-b-[1px] hover:bg-gray-100 border-b-gray-400"
      >
        <button>تعطيل المؤقت</button>
      </li>
      <li
        on:click={() => {
          clearInterval(count);
          setStateStore("timer", { isPaused: false, value: 0 });
        }}
        class="w-full p-2 hover:bg-gray-100 rounded-md"
      >
        <button>تصفير المؤقت</button>
      </li>
    </ul>
  );
}

function SecondPopup() {
  return (
    <div class="p-3 shadow-md shadow-[#555] dark:shadow-none absolute  top-full translate-y-6 left-1/2 -translate-x-3/4 z-50 bg-white dark:bg-[#333] dark:text-white rounded-md">
      <div dir="rtl" class="flex justify-between">
        <div>
          <p class="mb-1">الدورة</p>
          <select
            on:input={(e) => {
              e.stopPropagation();
              setOpened(3);
              setQStore("year", e.target.value);
            }}
            class="w-28 overflow-hidden p-1 dark:bg-[#555] rounded-md dark:text-white"
            name="choice"
          >
            <For each={years[QStore.subject].years}>
              {(year) => (
                <option
                  value={`${year.num}`}
                  selected={QStore.year == year.num}
                >
                  {year.num}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="mr-2">
          <p class="mb-1">الفصل</p>
          <select
          on:click={(e)=> {
            e.stopPropagation();
            setOpened(3);
          }}
            class="w-28 overflow-hidden p-1 dark:bg-[#555] rounded-md dark:text-white"
            name="choice"
          >
            <option value="first">First Value</option>
            <option value="second" selected>
              Second Value
            </option>
            <option value="third">Third Value</option>
          </select>
        </div>
      </div>
    </div>
  );
}
