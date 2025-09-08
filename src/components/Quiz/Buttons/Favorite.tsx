// ...existing code...
import { createSignal, Show, onMount, createEffect, onCleanup } from "solid-js";
import {
  addFavoriteForQuestion,
  removeFavorite,
  updateFavoriteNote,
  getFavorite,
} from "../../../utils/indexeddb";
import toast from "solid-toast";

export default function FavoriteButton(props: {
  question: { $id: string; [k: string]: any };
  userAnswer: string;
  class?: string;
}) {
  const [active, setActive] = createSignal(false);
  const [note, setNote] = createSignal<string | undefined>(undefined);
  const qid = props.question?.$id;
createEffect(() =>console.log(props.userAnswer))

  let mounted = true;

  onMount(() => {
    mounted = true;
  });

  onCleanup(() => {
    mounted = false;
  });

  // react to question changes (load favorite state for the current question)
  createEffect(async () => {
    const qid = props.question?.$id;
    if (!qid) {
      // no question -> reset UI
      setActive(false);
      setNote(undefined);
      return;
    }
    try {
      const fav = await getFavorite(qid);
      if (!mounted) return;
      if (fav) {
        setActive(true);
        setNote(fav.note);
      } else {
        setActive(false);
        setNote(undefined);
      }
    } catch (err) {
      console.error("failed to read favorite:", err);
      // keep previous state if error (optional: reset)
    }
  });




  const handleAdd = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!props.question) return;

    // ask for an optional note (replace with modal if you prefer)
    const userNote =
      window.prompt("أضف ملاحظة للسؤال (اختياري):", note() ?? "") ?? undefined;

    try {
      await addFavoriteForQuestion(props.question, userNote, props.userAnswer);
      setNote(userNote);
      setActive(true);
      toast.success("تمت الإضافة إلى المفضلة");
    } catch (err) {
      console.error("addFavorite failed:", err);
      toast.error("فشل الحفظ");
    }
  };

  const handleRemove = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!qid) return;
    try {
      await removeFavorite(qid);
      setActive(false);
      setNote(undefined);
      toast.success("أزيل من المفضلة");
    } catch (err) {
      console.error("removeFavorite failed:", err);
      toast.error("فشل الحذف");
    }
  };

  const handleEditNote = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!qid) return;

    const userInput = window.prompt("حرّر ملاحظتك:", note())
    if (userInput === null ) return; // user cancelled -> keep old note

    const newNote = userInput.trim();

    try {
      await updateFavoriteNote(qid, newNote);
      setNote(newNote);
      toast.success("تم تحديث الملاحظة");
    } catch (err) {
      console.error("updateFavoriteNote failed:", err);
      toast.error("فشل التحديث");
    }
  };

  return (
    <div
      class={props.class}
      on:click={(e) => {
        // prevent parent handlers when clicking container
        e.stopPropagation();
      }}
    >
      <Show
        when={active()}
        fallback={
          <button
            on:click={handleAdd}
            data-hover="LikeButton"
            class="mr-3 text-main-dark dark:text-main-light "
            aria-label="Save question to favorites"
            aria-pressed="false"
          >
            <svg
              class="absolute overflow-visible"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                class="text-main0 origin-center animate-[circle_.3s_forwards] transition-all ease-in-out"
                cx="12"
                cy="12"
                r="11.5"
                fill="transparent"
                stroke-width="0"
                stroke="currentColor"
              ></circle>
            </svg>
            <svg
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m12 5.184-.808-.771-.004-.004C11.065 4.299 8.522 2.003 6 2.003c-3.736 0-6 2.558-6 6.677 0 4.47 5.471 9.848 10 13.079.602.43 1.187.82 1.74 1.167A.497.497 0 0 0 12 23v-.003c.09 0 .182-.026.26-.074C16.977 19.97 24 13.737 24 8.677 24 4.557 21.743 2 18 2c-2.569 0-5.166 2.387-5.192 2.413L12 5.184zm-.002 15.525c2.071-1.388 4.477-3.342 6.427-5.47C20.72 12.733 22 10.401 22 8.677c0-1.708-.466-2.855-1.087-3.55C20.316 4.459 19.392 4 18 4c-.726 0-1.63.364-2.5.9-.67.412-1.148.82-1.266.92-.03.025-.037.031-.019.014l-.013.013L12 7.949 9.832 5.88a10.08 10.08 0 0 0-1.33-.977C7.633 4.367 6.728 4.003 6 4.003c-1.388 0-2.312.459-2.91 1.128C2.466 5.826 2 6.974 2 8.68c0 1.726 1.28 4.058 3.575 6.563 1.948 2.127 4.352 4.078 6.423 5.466z"
                fill="currentColor"
                fill-rule="evenodd"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        }
      >
        <div class="flex items-center gap-2">
          <button
            on:click={handleRemove}
            class="hover:bg-card text-main focus:bg-main focus:text-main active:bg-main active:text-main relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full outline-none active:scale-95"
            aria-label="Remove from favorites"
            aria-pressed="true"
          >
            <svg
              class="absolute overflow-visible"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                class="text-main0 origin-center transition-all ease-in-out"
                cx="12"
                cy="12"
                r="11.5"
                fill="transparent"
                stroke-width="0"
                stroke="currentColor"
              ></circle>
            </svg>

            <svg
              class="h-6 w-6 origin-center animate-[scale_.35s_ease-in-out_forwards] transition-all ease-in-out"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 23a.496.496 0 0 1-.26-.074C7.023 19.973 0 13.743 0 8.68c0-4.12 2.322-6.677 6.058-6.677 2.572 0 5.108 2.387 5.134 2.41l.808.771.808-.771C12.834 4.387 15.367 2 17.935 2 21.678 2 24 4.558 24 8.677c0 5.06-7.022 11.293-11.74 14.246a.496.496 0 0 1-.26.074V23z"
                fill="currentColor"
              ></path>
            </svg>
          </button>

          <button
            on:click={handleEditNote}
            title={note() ? "تعديل الملاحظة" : "إضافة ملاحظة"}
            class="mr-3 text-gray-500 hover:text-gray-700 dark:text-white"
            aria-label="Edit favorite note"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M6 22q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h7.175q.4 0 .763.15t.637.425l4.85 4.85q.275.275.425.638t.15.762V20q0 .825-.587 1.413T18 22zm7-14q0 .425.288.713T14 9h4l-5-5z"
              />
            </svg>{" "}
          </button>
        </div>
      </Show>
    </div>
  );
}
