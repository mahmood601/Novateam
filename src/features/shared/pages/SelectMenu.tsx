import { useParams, A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { TransitionGroup } from "solid-transition-group";
import { getFavorites, syncAndGetSections } from "../../quizzes/services/local/indexeddb";
import { Tabs } from "@kobalte/core/tabs";
import { CirclePlay } from "lucide-solid";

export default function SelectMenu() {
  const subject = `${useParams<{ subject: string }>().subject}`;

  // sections من Supabase (تحتوي على id حقيقي) — لسه محتاجينها لتبويب
  // "المحاضرات" (اختيار فصل محدد)، مو لأسئلة الدورات بعد ما صارت
  // الفلترة (فصل/سنة/مفضلة/صعبة) كلها داخل الكويز نفسه.
  const [sections] = createResource(async () => syncAndGetSections(subject));
  const [favorites] = createResource(() => getFavorites(subject));

  const seasons = () =>
    sections()
      ?.filter((s) => s.type === "season")
      .sort((a, b) => +a.value - +b.value) ?? [];

  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  return (
    <div class="bg-main-light dark:bg-main-dark flex h-dvh w-screen justify-center gap-3 overflow-hidden pt-16 text-center">
      <Tabs class="flex min-h-0 flex-1 flex-col items-center">
        <Tabs.List class="dark:bg-lighter-dark-1 group dark:border-lighter-dark-2 border-darker-light-2 relative mb-3 flex w-fit flex-row-reverse justify-between rounded-2xl border p-2 shadow-sm transition-all duration-300">
          <Tabs.Trigger class="dark:text-main-light z-10 p-2" value="lectures">
            المحاضرات
          </Tabs.Trigger>
          <Tabs.Trigger class="dark:text-main-light z-10 p-2" value="quizzes">
            أسئلة الدورات
          </Tabs.Trigger>
          <Tabs.Indicator class="bg-main/60 dark:bg-main absolute top-1 bottom-1 left-0 h-auto rounded-md transition-all duration-300" />
        </Tabs.List>
        <Tabs.Content
          class="flex min-h-0 w-screen flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-5"
          value="quizzes"
        >
          {/* الدخول الافتراضي: كل الفصول + كل السنين مع بعض — الفلترة
              (فصل/سنة/مفضلة/صعبة، تعدد اختيار) صارت من داخل الكويز نفسه */}
          <SectionBox
            text="ابدأ الاختبار"
            index={0}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            dropdown={false}
            link="quiz"
          ></SectionBox>

          {/* المفضلة */}
          <SectionBox
            text="المفضلة"
            index={1}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            dropdown={true}
          >
            <Show
              when={(favorites() ?? []).length > 0}
              fallback={
                <p class="my-3 h-fit w-3/4 text-center">
                  لا توجد أسئلة مفضلة لهذا الموضوع
                </p>
              }
            >
              <div class="flex w-11/12 items-center gap-2">
                <A
                  href="favorite"
                  dir="rtl"
                  class="bg-main m-2 flex-1 rounded-md p-2 text-center"
                >
                  {favorites()?.length + " سؤال بالمفضلة"}
                </A>
              </div>
            </Show>
          </SectionBox>

          {/* الاسئلة الصعبة */}
          <SectionBox
            text="الاسئلة الصعبة"
            index={2}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            dropdown={false}
            link="weak"
          ></SectionBox>
        </Tabs.Content>
        <Tabs.Content
          value="lectures"
          class="min-h-0 w-screen items-center justify-center overflow-y-auto px-5 py-3"
        >
          <For each={seasons().filter((s) => s.name !== "غير مصنف")}>
            {(section) => (
              <A
                href={`lectures/${section.id}`}
                class="dark:bg-lighter-dark-1 group dark:border-lighter-dark-2 hover:border-main relative mb-3 flex w-full flex-row-reverse items-center justify-between gap-1 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <p>{section.name}</p>
                <CirclePlay class="text-main rotate-180 text-right text-wrap transition-colors duration-200 hover:scale-110" />
              </A>
            )}
          </For>
        </Tabs.Content>
      </Tabs>
    </div>
  );
}

// ─── SectionBox ───────────────────────────────────────────────────────────────

function SectionBox(props: {
  text: string;
  index: number;
  activeIndex: () => number | null;
  setActiveIndex: (i: number | null) => void;
  dropdown: boolean;
  link?: string;
  children?: any;
}) {
  const isActive = () => props.activeIndex() === props.index;

  return (
    <div class="dark:bg-lighter-dark-1 dark:border-lighter-dark-2 hover:border-main relative w-full flex-row-reverse justify-between rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Show
        fallback={
          <>
            <button
              type="button"
              onClick={() =>
                props.setActiveIndex(isActive() ? null : props.index)
              }
              class="dark:text-main-light w-full"
              aria-expanded={isActive()}
            >
              <p class="text-center text-lg font-bold">{props.text}</p>
            </button>
            <div
              class="overflow-hidden transition-all duration-200"
              style={{ "max-height": isActive() ? "220px" : "0px" }}
            >
              <div class="bg-darker-light-2 dark:bg-lighter-dark-2 mt-5 flex max-h-30 flex-col items-center overflow-y-auto rounded-2xl">
                <Show when={isActive()}>
                  <TransitionGroup name="dropdown">
                    {props.children}
                  </TransitionGroup>
                </Show>
              </div>
            </div>
          </>
        }
        when={!props.dropdown}
      >
        <A
          onClick={() => props.setActiveIndex(isActive() ? null : props.index)}
          class="dark:text-main-light w-full"
          href={props.link!}
        >
          <p class="text-center text-lg font-bold">{props.text}</p>
        </A>
      </Show>
    </div>
  );
}
