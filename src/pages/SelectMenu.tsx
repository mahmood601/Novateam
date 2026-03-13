import { useParams, A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { TransitionGroup } from "solid-transition-group";
import { setQuizType } from "../stores/quizType";
import { getFavorites } from "../services/local/indexeddb";
import { syncAndGetSections } from "../services/local/indexeddb";

export default function SelectMenu() {
  const subject = `${useParams<{ subject: string }>().subject}`;

  // sections من Supabase (تحتوي على id حقيقي)
  const [sections] = createResource(async () => syncAndGetSections(subject));
  const [favorites] = createResource(() => getFavorites(subject));

  const seasons = () => sections()?.filter((s) => s.type === "season") ?? [];
  const years = () => sections()?.filter((s) => s.type === "year") ?? [];

  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  return (
    <div class="bg-main-light dark:bg-main-dark flex h-screen w-screen flex-col flex-wrap items-center justify-center gap-5 py-22">
      {/* السنوات */}
      <SectionBox
        text="السنوات"
        index={0}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      >
        <For each={years()}>
          {(y) => (
            <ItemRow
              label={y.name}
              href={`year_id-${y.id}`}
              subject={subject}
              sectionType="year_id"
              sectionId={y.id}
            />
          )}
        </For>
      </SectionBox>

      {/* الفصول */}
      <SectionBox
        text="الفصول"
        index={1}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      >
        <For each={seasons()}>
          {(s) => (
            <ItemRow
              label={s.name}
              href={`season_id-${s.id}`}
              subject={subject}
              sectionType="season_id"
              sectionId={s.id}
            />
          )}
        </For>
      </SectionBox>

      {/* المفضلة */}
      <SectionBox
        text="المفضلة"
        index={2}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
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
    </div>
  );
}

// ─── SectionBox ───────────────────────────────────────────────────────────────

function SectionBox(props: {
  text: string;
  index: number;
  activeIndex: () => number | null;
  setActiveIndex: (i: number | null) => void;
  children: any;
}) {
  const isActive = () => props.activeIndex() === props.index;

  return (
    <div class="dark:bg-lighter-dark-1 hover:border-main relative w-10/12 flex-row-reverse justify-between rounded-2xl border p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <button
        type="button"
        onClick={() => props.setActiveIndex(isActive() ? null : props.index)}
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
            <TransitionGroup name="dropdown">{props.children}</TransitionGroup>
          </Show>
        </div>
      </div>
    </div>
  );
}

// ─── ItemRow ──────────────────────────────────────────────────────────────────

function ItemRow(props: {
  label: string;
  href: string;
  subject: string;
  sectionType: "season_id" | "year_id";
  sectionId: number;
}) {
  const handleClick = () => {
    setQuizType("continue");

    // if (window.confirm("هل تريد الاكمال من حيث توقفت؟")) {
    //   setQuizType("continue");
    // } else {
    //   setQuizType("restart");
    //   void deleteAnswersWithFilter(
    //     props.subject,
    //     props.sectionType,
    //     props.sectionId,
    //   );
    // }
  };

  return (
    <div class="flex w-11/12 items-center gap-2">
      <A
        href={props.href}
        onClick={handleClick}
        class="bg-main m-2 flex-1 rounded-md p-2 text-center"
      >
        {props.label}
      </A>
    </div>
  );
}
