// Find & replace sheet. Uses Tiptap's official Find and Replace extension
// (commands + editor.storage.findAndReplace) with a SolidJS UI, so it sits
// in the editor dock like the other sheets (above the keyboard on phones).

import { Accessor, createSignal, onCleanup, onMount, Show } from "solid-js";
import type { Editor } from "@tiptap/core";
import { ChevronDown, ChevronUp, X } from "lucide-solid";

export default function FindReplaceSheet(props: {
  editor: () => Editor | undefined;
  /** Bumped on every editor transaction, so counts stay reactive. */
  tick: Accessor<number>;
  onClose: () => void;
}) {
  const [search, setSearch] = createSignal("");
  const [replace, setReplace] = createSignal("");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [wholeWord, setWholeWord] = createSignal(false);
  let searchInput: HTMLInputElement | undefined;

  // Re-reads the storage whenever the editor changes.
  const stats = () => {
    props.tick();
    const s = props.editor()?.storage.findAndReplace;
    const total: number = s?.results?.length ?? 0;
    const current: number | null = s?.currentIndex ?? null;
    return { total, current: current === null ? 0 : current + 1 };
  };

  const run = (fn: (e: Editor) => void) => {
    const e = props.editor();
    if (e) fn(e);
  };

  onMount(() => {
    // Start from the current state of the extension and pre-fill the
    // search box with the selected text (like Ctrl+F in Docs).
    run((e) => {
      const { from, to, empty } = e.state.selection;
      const selected =
        !empty && to - from < 100
          ? e.state.doc.textBetween(from, to, " ")
          : "";
      if (selected && !selected.includes("\n")) {
        setSearch(selected);
        e.commands.setSearchTerm(selected);
      }
    });
    setTimeout(() => {
      searchInput?.focus();
      searchInput?.select();
    }, 50);
  });

  onCleanup(() => {
    // Remove the highlights when the sheet closes.
    props.editor()?.commands.clearSearch();
  });

  const onSearchInput = (value: string) => {
    setSearch(value);
    run((e) => e.commands.setSearchTerm(value));
  };

  const next = () => run((e) => e.commands.goToNextResult());
  const prev = () => run((e) => e.commands.goToPreviousResult());

  const toggleBtn = (active: boolean) =>
    `min-h-9 rounded-lg px-3 text-sm ${
      active
        ? "bg-main text-white"
        : "bg-darker-light-1 dark:bg-lighter-dark-2"
    }`;

  const field =
    "bg-darker-light-1 dark:bg-lighter-dark-2 focus:ring-main min-h-11 w-full rounded-lg px-3 text-base outline-none focus:ring-2";

  return (
    <div class="flex flex-col gap-2 p-2" dir="rtl">
      <div class="border-b-darker-light-1 dark:border-b-lighter-dark-2 flex items-center justify-between border-b-2 px-3 py-1">
        <span class="font-medium">بحث واستبدال</span>
        <button
          type="button"
          class="rounded-full p-2"
          aria-label="إغلاق"
          onClick={props.onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div class="flex items-center gap-2 px-2">
        <input
          ref={searchInput}
          type="text"
          class={field}
          placeholder="بحث"
          autocapitalize="off"
          autocomplete="off"
          enterkeyhint="search"
          value={search()}
          onInput={(e) => onSearchInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) prev();
              else next();
            } else if (e.key === "Escape") {
              props.onClose();
            }
          }}
        />
        <span
          class="min-w-12 text-center text-sm tabular-nums opacity-70"
          dir="ltr"
          aria-live="polite"
        >
          {stats().current}/{stats().total}
        </span>
        <button
          type="button"
          class="rounded-lg p-2 disabled:opacity-40"
          aria-label="السابق"
          disabled={stats().total === 0}
          onClick={prev}
        >
          <ChevronUp size={20} />
        </button>
        <button
          type="button"
          class="rounded-lg p-2 disabled:opacity-40"
          aria-label="التالي"
          disabled={stats().total === 0}
          onClick={next}
        >
          <ChevronDown size={20} />
        </button>
      </div>

      <div class="px-2">
        <input
          type="text"
          class={field}
          placeholder="استبدال بـ"
          autocapitalize="off"
          autocomplete="off"
          enterkeyhint="done"
          value={replace()}
          onInput={(e) => {
            setReplace(e.currentTarget.value);
            run((ed) => ed.commands.setReplaceTerm(e.currentTarget.value));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              run((ed) => ed.commands.replace());
            } else if (e.key === "Escape") {
              props.onClose();
            }
          }}
        />
      </div>

      <div class="flex flex-wrap items-center gap-2 px-2 pb-1">
        <button
          type="button"
          class="bg-main min-h-11 flex-1 rounded-lg px-4 text-white disabled:opacity-40"
          disabled={stats().total === 0}
          onClick={() => run((e) => e.commands.replace())}
        >
          استبدال
        </button>
        <button
          type="button"
          class="bg-main min-h-11 flex-1 rounded-lg px-4 text-white disabled:opacity-40"
          disabled={stats().total === 0}
          onClick={() => run((e) => e.commands.replaceAll())}
        >
          استبدال الكل
        </button>
        <button
          type="button"
          class={toggleBtn(caseSensitive())}
          aria-pressed={caseSensitive()}
          onClick={() => {
            const v = !caseSensitive();
            setCaseSensitive(v);
            run((e) => e.commands.setCaseSensitive(v));
          }}
        >
          Aa
        </button>
        <button
          type="button"
          class={toggleBtn(wholeWord())}
          aria-pressed={wholeWord()}
          onClick={() => {
            const v = !wholeWord();
            setWholeWord(v);
            run((e) => e.commands.setWholeWord(v));
          }}
        >
          كلمة كاملة
        </button>
      </div>
    </div>
  );
}
