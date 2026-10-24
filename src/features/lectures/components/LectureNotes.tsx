import {
  For,
  Index,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from "solid-js";
import { X } from "lucide-solid";
import {
  blockSnippet,
  isNoteBlock,
  loadNotes,
  newNoteId,
  resolveAnchor,
  saveNotes,
  type LectureNote,
} from "../lib/lectureNotes";
import "../styles/lectureNotes.css";

// Personal notes for the READING view (any user, not the editor).
//
// How it stays out of the way: nothing is injected into the lecture HTML.
// A transparent layer sits on top of the content and draws one tiny button
// per block in the left gutter (the page's side padding), aligned to the
// top of that block. Blocks that have a note get a solid icon + a thin bar
// along the block. Notes are saved in localStorage (see lib/lectureNotes).

interface Props {
  /** The element that holds the rendered lecture HTML. */
  container: HTMLElement | undefined;
  /** Bumped by LectureContent every time it re-injects the HTML. */
  tick: number;
  subjectId: string;
  seasonId: number;
}

type Geo = { top: number; height: number; show: boolean };

const PencilIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const NotesIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h6" />
    <path d="M8 13h8" />
    <path d="M8 17h5" />
  </svg>
);

export default function LectureNotes(props: Props) {
  let layerEl: HTMLDivElement | undefined;
  let blocks: HTMLElement[] = [];
  let frame = 0;

  const [notes, setNotes] = createSignal<LectureNote[]>([]);
  const [geometry, setGeometry] = createSignal<Geo[]>([]);
  const [snippets, setSnippets] = createSignal<string[]>([]);
  const [editing, setEditing] = createSignal<number | null>(null); // block index
  const [draft, setDraft] = createSignal("");
  const [listOpen, setListOpen] = createSignal(false);
  const [saveError, setSaveError] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);

  // ---- load notes whenever the lecture changes ----
  createEffect(
    on(
      () => [props.subjectId, props.seasonId] as const,
      ([subjectId, seasonId]) => {
        setNotes(loadNotes(subjectId, seasonId));
        setEditing(null);
        setListOpen(false);
        setSaveError(false);
      },
    ),
  );

  // ---- block positions ----
  const measure = () => {
    frame = 0;
    if (!layerEl) return;
    const base = layerEl.getBoundingClientRect().top;
    setGeometry(
      blocks.map((b) => {
        const r = b.getBoundingClientRect();
        return { top: r.top - base, height: r.height, show: isNoteBlock(b) };
      }),
    );
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  onCleanup(() => cancelAnimationFrame(frame));

  // Re-read the blocks every time the lecture HTML is re-injected, and keep
  // positions in sync while images / diagrams / fonts change the layout.
  createEffect(
    on(
      () => [props.container, props.tick] as const,
      ([el]) => {
        if (!el) {
          blocks = [];
          setGeometry([]);
          setSnippets([]);
          return;
        }
        blocks = Array.from(el.children) as HTMLElement[];
        setSnippets(blocks.map(blockSnippet));
        schedule();

        const ro = new ResizeObserver(schedule);
        ro.observe(el);
        blocks.forEach((b) => ro.observe(b));
        window.addEventListener("resize", schedule);
        void document.fonts?.ready.then(schedule);
        onCleanup(() => {
          ro.disconnect();
          window.removeEventListener("resize", schedule);
        });
      },
    ),
  );

  // ---- which note belongs to which block ----
  const resolved = createMemo(() => {
    const snips = snippets();
    const ready = snips.length > 0;
    const byBlock = new Map<number, LectureNote>();
    const items: { note: LectureNote; block: number }[] = [];
    for (const note of notes()) {
      const block = ready ? resolveAnchor(note, snips) : -1;
      items.push({ note, block });
      if (block !== -1 && !byBlock.has(block)) byBlock.set(block, note);
    }
    const order = (b: number) => (b === -1 ? 1e9 : b);
    items.sort((a, b) => order(a.block) - order(b.block));
    return { byBlock, items, ready };
  });

  // ---- editing ----
  const openEditor = (block: number) => {
    setDraft(resolved().byBlock.get(block)?.text ?? "");
    setConfirmDelete(false);
    setSaveError(false);
    setListOpen(false);
    setEditing(block);
  };

  const persist = (next: LectureNote[]): boolean => {
    const ok = saveNotes(props.subjectId, props.seasonId, next);
    if (ok) setNotes(next);
    setSaveError(!ok);
    return ok;
  };

  const save = () => {
    const block = editing();
    if (block === null) return;
    const text = draft().trim();
    const existing = resolved().byBlock.get(block);

    if (!text) {
      // Saving an empty note on an existing one = delete it.
      if (existing && !persist(notes().filter((n) => n.id !== existing.id))) return;
      setEditing(null);
      return;
    }

    const note: LectureNote = {
      id: existing?.id ?? newNoteId(),
      idx: block,
      snip: snippets()[block] ?? "",
      text,
      updatedAt: Date.now(),
    };
    const next = existing
      ? notes().map((n) => (n.id === existing.id ? note : n))
      : [...notes(), note];
    if (persist(next)) setEditing(null);
  };

  const removeNote = (id: string) => {
    if (persist(notes().filter((n) => n.id !== id))) setEditing(null);
  };

  const jumpTo = (block: number) => {
    const el = blocks[block];
    if (!el) return;
    setListOpen(false);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("nova-note-flash");
    void el.offsetWidth; // restart the animation if it is already running
    el.classList.add("nova-note-flash");
    window.setTimeout(() => el.classList.remove("nova-note-flash"), 1800);
  };

  // Esc closes whichever sheet is open.
  createEffect(() => {
    if (editing() === null && !listOpen()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setEditing(null);
      setListOpen(false);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  const editingNote = () => {
    const block = editing();
    return block === null ? undefined : resolved().byBlock.get(block);
  };
  const editingSnippet = () => {
    const block = editing();
    return block === null ? "" : (snippets()[block] ?? "");
  };

  return (
    <>
      {/* Gutter buttons — one per block, aligned to the block's top */}
      <div ref={layerEl} class="nova-notes-layer">
        <Index each={geometry()}>
          {(g, i) => (
            <Show when={g().show}>
              <Show when={resolved().byBlock.has(i)}>
                <div
                  class="nova-note-bar"
                  style={{ top: `${g().top}px`, height: `${g().height}px` }}
                />
              </Show>
              <button
                type="button"
                class="nova-note-btn"
                classList={{ "has-note": resolved().byBlock.has(i) }}
                style={{ top: `${g().top}px` }}
                aria-label={resolved().byBlock.has(i) ? "عرض الملاحظة" : "إضافة ملاحظة"}
                title={resolved().byBlock.has(i) ? "ملاحظتك على هذه الفقرة" : "إضافة ملاحظة"}
                onClick={() => openEditor(i)}
              >
                <PencilIcon />
              </button>
            </Show>
          )}
        </Index>
      </div>

      {/* Shows only once the user has at least one note on this lecture */}
      <Show when={notes().length > 0}>
        <button
          type="button"
          class="nova-notes-fab"
          aria-label={`ملاحظاتي (${notes().length})`}
          onClick={() => setListOpen(true)}
        >
          <NotesIcon />
          <span class="nova-notes-fab__count">{notes().length}</span>
        </button>
      </Show>

      {/* Write / edit a note */}
      <Show when={editing() !== null}>
        <div
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setEditing(null)}
        >
          <div
            dir="rtl"
            role="dialog"
            aria-label="ملاحظة"
            class="dark:bg-lighter-dark-1 w-full max-w-md rounded-t-3xl bg-white p-4 pb-6"
            style={{ "padding-bottom": "max(1.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div class="mb-2 flex items-center justify-between">
              <h2 class="text-base font-bold">ملاحظتي</h2>
              <button
                type="button"
                aria-label="إغلاق"
                class="rounded-full p-1 opacity-70 hover:opacity-100"
                onClick={() => setEditing(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p class="nova-note-quote">{editingSnippet()}</p>

            <textarea
              ref={(el) => window.setTimeout(() => el.focus(), 60)}
              dir="auto"
              rows={5}
              value={draft()}
              placeholder="اكتب ملاحظتك هنا… (تُحفظ على هذا الجهاز فقط)"
              class="focus:border-main dark:border-lighter-dark-2 w-full resize-none rounded-xl border-2 border-gray-200 bg-transparent p-3 outline-none"
              style={{ "font-size": "16px" }}
              onInput={(e) => setDraft(e.currentTarget.value)}
            />

            <Show when={saveError()}>
              <p class="mt-2 text-sm text-red-500" role="alert">
                تعذّر الحفظ: مساحة التخزين ممتلئة أو غير متاحة في هذا المتصفح.
              </p>
            </Show>

            <div class="mt-3 flex items-center gap-2">
              <button
                type="button"
                class="bg-main rounded-xl px-5 py-2 text-sm font-bold text-white"
                onClick={save}
              >
                حفظ
              </button>
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-bold opacity-70 hover:opacity-100"
                onClick={() => setEditing(null)}
              >
                إلغاء
              </button>
              <Show when={editingNote()}>
                {(n) => (
                  <button
                    type="button"
                    class="me-auto rounded-xl px-4 py-2 text-sm font-bold text-red-500"
                    onClick={() => {
                      if (confirmDelete()) removeNote(n().id);
                      else setConfirmDelete(true);
                    }}
                  >
                    {confirmDelete() ? "تأكيد الحذف" : "حذف"}
                  </button>
                )}
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* All notes of this lecture */}
      <Show when={listOpen()}>
        <div
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setListOpen(false)}
        >
          <div
            dir="rtl"
            role="dialog"
            aria-label="ملاحظاتي"
            class="dark:bg-lighter-dark-1 flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl bg-white p-4"
            style={{ "padding-bottom": "max(1.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-base font-bold">ملاحظاتي ({notes().length})</h2>
              <button
                type="button"
                aria-label="إغلاق"
                class="rounded-full p-1 opacity-70 hover:opacity-100"
                onClick={() => setListOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <ul class="flex flex-col gap-2 overflow-y-auto">
              <For each={resolved().items}>
                {({ note, block }) => {
                  const orphan = () => resolved().ready && block === -1;
                  return (
                    <li class="dark:border-lighter-dark-2 rounded-xl border border-gray-200 p-3">
                      <button
                        type="button"
                        class="block w-full text-start"
                        disabled={orphan()}
                        onClick={() => jumpTo(block)}
                      >
                        <span class="nova-note-quote">{note.snip}</span>
                        <span class="mt-1 block whitespace-pre-wrap text-sm">{note.text}</span>
                      </button>
                      <div class="mt-2 flex items-center gap-3 text-xs">
                        <Show
                          when={!orphan()}
                          fallback={
                            <span class="opacity-60">
                              هذه الفقرة تغيّرت أو حُذفت من المحاضرة
                            </span>
                          }
                        >
                          <button
                            type="button"
                            class="text-main font-bold"
                            onClick={() => openEditor(block)}
                          >
                            تعديل
                          </button>
                        </Show>
                        <button
                          type="button"
                          class="me-auto font-bold text-red-500"
                          onClick={() => removeNote(note.id)}
                        >
                          حذف
                        </button>
                      </div>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </div>
      </Show>
    </>
  );
}
