import { createSignal, onMount, For, Show, Setter } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import type { Favorite } from "../utils/indexeddb";
import {
  getFavorites,
  removeFavorite,
  updateFavoriteNote,
} from "../utils/indexeddb";
import toast from "solid-toast";
import Loading from "../components/loading";
import LeftArrow from "../components/Icons/LeftArrow";

export default function FavoritesPage() {
  const [favorites, setFavorites] = createSignal<Favorite[]>([]);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  async function load(subject?: string) {
    setLoading(true);
    try {
      const favs = await getFavorites(subject);
      setFavorites(favs.sort((a, b) => b.savedAt - a.savedAt));
    } catch (err) {
      console.error("load favorites:", err);
      toast.error("فشل تحميل المفضلات");
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    load();
  });

  return (
    <div class="overflow-y-auto bg-main-light dark:bg-main-dark text-main-dark dark:text-main-light h-[calc(100vh_-_70px)]  p-6">
      <div class="mx-auto max-w-4xl">
        <div class="mb-6 flex items-center justify-between">
          <button
            on:click={() => {
              history.back();
            }}
          >
            <LeftArrow />
          </button>
          <h1 class="text-2xl font-bold">المفضلات</h1>
          <button
            class="bg-main rounded px-3 py-1 text-white"
            onClick={() => load()}
            aria-label="تحديث المفضلات"
          >
            تحديث
          </button>
        </div>

        <Show when={!loading()} fallback={<Loading />}>
          <Show
            when={favorites().length > 0}
            fallback={<p class="py-20 text-center">لا توجد عناصر في المفضلة</p>}
          >
            <ul class="space-y-4 overflow-y-auto max-h-[calc(100vh_-_70px_-_120px)]">
              <For each={favorites()}>
                {(fav) => <FavBox fav={fav} setFavorites={setFavorites} />}
              </For>
            </ul>
          </Show>
        </Show>
      </div>{" "}
    </div>
  );
}

function FavBox(props: { fav: Favorite; setFavorites: Setter<Favorite[]> }) {
  const snapshot = props.fav.snapshot;
  const options = [
    snapshot?.firstOption,
    snapshot?.secondOption,
    snapshot?.thirdOption,
    snapshot?.fourthOption,
    snapshot?.fifthOption,
  ];

  const handleRemove = async (qid: string) => {
    if (!confirm("هل تريد إزالة هذا السؤال من المفضلة؟")) return;
    try {
      await removeFavorite(qid);
      props.setFavorites((prev) => prev.filter((p) => p.questionId !== qid));
      toast.success("أزيل من المفضلة");
    } catch (err) {
      console.error("removeFavorite:", err);
      toast.error("فشل الحذف");
    }
  };

  const handleEditNote = async (fav: Favorite) => {
    const current = fav.note ?? "";
    const input = window.prompt("حرّر الملاحظة:", current);
    if (input === null) return; // cancel -> keep old note
    const newNote = input.trim();
    try {
      await updateFavoriteNote(fav.questionId, newNote);
      props.setFavorites((prev) =>
        prev.map((p) =>
          p.questionId === fav.questionId ? { ...p, note: newNote } : p,
        ),
      );
      toast.success("تم تحديث الملاحظة");
    } catch (err) {
      console.error("updateFavoriteNote:", err);
      toast.error("فشل التحديث");
    }
  };
  return (
    <li class="bg-darker-light-1 dark:bg-lighter-dark-1 rounded-md p-4 shadow-sm">
      <div class="flex flex-col">
        <div class="">
          <div class="mb-1 flex items-center gap-3">
            <span class="text-muted text-xs">
              • {new Date(props.fav.savedAt).toLocaleString()}
            </span>
          </div>

          <p class="mb-2 text-right font-semibold" dir="rtl">
            {props.fav.snapshot?.question ?? "سؤال محفوظ"}
          </p>
          <For each={options.filter((option) => option)}>
            {(option, index) => (
              <p
                dir="auto"
                classList={{
                  "bg-main rounded-md p-1 text-main-dark":
                    snapshot?.correctIndex.includes(index()),
                  "bg-red-500 rounded-md p-1 text-white":
                    snapshot?.userAnswer == option &&
                    !snapshot?.correctIndex.includes(index()),
                  "my-1 text-right ": true,
                }}
              >
                {index() + 1}. {option}
              </p>
            )}
          </For>
          <Show
            when={props.fav.note}
            fallback={
              <p class="my-4 text-center text-sm text-gray-500">بدون ملاحظة</p>
            }
          >
            <p class="text-main my-4 text-center text-sm whitespace-pre-wrap">
              {props.fav.note}
            </p>
          </Show>
        </div>

        <div class="flex justify-around">
          <button
            class="bg-main rounded px-3 py-1 text-sm text-white"
            onClick={() => handleRemove(props.fav.questionId)}
          >
            إزالة
          </button>

          <button
            class="bg-main rounded px-3 py-1 text-sm"
            onClick={() => handleEditNote(props.fav)}
          >
            تعديل الملاحظة
          </button>
        </div>
      </div>
    </li>
  );
}
