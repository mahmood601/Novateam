import { useParams, A } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { TransitionGroup } from "solid-transition-group";
import { setQuizType } from "../stores/quizType";
import { getFavorites, deleteAnswersWithFilter } from "../utils/indexeddb";
import { syncAndGetSections } from "../utils/indexeddb";
import subjects from "./subjects";

type FavoriteItem = {
  $id: string;
  snapshot?: { question?: string };
};

export default function SelectMenu() {
  const subject = useParams<{ subject: string }>().subject;

  // sections من Supabase (تحتوي على id حقيقي)
  const [sections] = createResource(() => syncAndGetSections(subject));
  const [favorites] = createResource(() => getFavorites(subject));

  const seasons = () => sections()?.filter((s) => s.type === "season") ?? [];
  const years   = () => sections()?.filter((s) => s.type === "year")   ?? [];

  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  const subjectName = subjects[subject]?.name ?? subject;

  return (
    <div class="bg-main-light dark:bg-main-dark flex w-screen flex-1 flex-col items-center justify-center">

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
          fallback={<p class="my-3 text-gray-400">لا توجد أسئلة مفضلة لهذا الموضوع</p>}
        >
          <For each={favorites() as FavoriteItem[]}>
            {(fav) => (
              <div class="flex w-11/12 items-center gap-2">
                <A
                  href="favorite"
                  class="bg-main m-2 flex-1 rounded-md p-2 text-center"
                >
                  {fav.snapshot?.question?.slice(0, 40) ?? fav.$id.slice(0, 8)}
                </A>
              </div>
            )}
          </For>
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
    <div class="hover:border-main bg-darker-light-1 dark:bg-lighter-dark-1 mb-5 w-5/6 rounded-md border border-black">
      <button
        type="button"
        onClick={() => props.setActiveIndex(isActive() ? null : props.index)}
        class="dark:text-main-light w-full p-8"
        aria-expanded={isActive()}
      >
        <p class="text-center text-lg font-bold">{props.text}</p>
      </button>

      <div
        class="overflow-hidden transition-all duration-200"
        style={{ "max-height": isActive() ? "280px" : "0px" }}
      >
        <div class="bg-darker-light-2 dark:bg-lighter-dark-2 -mt-1 flex max-h-70 flex-col items-center overflow-y-auto">
          <TransitionGroup name="dropdown">
            {props.children}
          </TransitionGroup>
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
    if (window.confirm("هل تريد الاكمال من حيث توقفت؟")) {
      setQuizType("continue");
    } else {
      setQuizType("restart");
      void deleteAnswersWithFilter(props.subject, props.sectionType, props.sectionId);
    }
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