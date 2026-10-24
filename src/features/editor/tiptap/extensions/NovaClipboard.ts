// features/editor/tiptap/extensions/NovaClipboard.ts
//
// Lossless cut / copy / paste INSIDE the editor.
//
// ─────────────────────────────────────────────────────────────────────
// Why this exists
// ─────────────────────────────────────────────────────────────────────
// ProseMirror's default clipboard turns the selection into HTML on copy
// and re-parses that HTML on paste. Every node has to survive
// renderHTML → parseHTML unchanged, and several of ours don't:
//   • novaNote     the title is drawn as a sibling element, so it comes
//                  back as an extra paragraph inside the note
//   • imageGallery falls apart: the second image leaves the gallery
//   • image        the caption is drawn outside the <img> and is lost
//   • colors       "#cceeff" comes back as "rgb(204, 238, 255)" (cells,
//                  text, boxes), which no longer matches the palette
//
// Fixing each node one by one would never end, so inside the editor we
// skip HTML entirely: on copy/cut we ALSO put the real ProseMirror slice
// (as JSON) on the clipboard, and on paste we rebuild exactly that slice.
// HTML and plain text are still written, so pasting into Word, WhatsApp
// or another app works as before.
//
// Pasting is not reimplemented: we only swap the slice that ProseMirror
// is about to paste (transformPasted), so everything downstream keeps
// working — prosemirror-tables still fits copied cells into the target
// grid, undo is still one step, and so on.
//
// The toolbar buttons (قص / نسخ / لصق) use the same code path, because on
// a phone there is no native menu for a cell selection.

import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** Custom clipboard type carrying the exact slice. */
export const NOVA_SLICE_MIME = "application/x-nova-slice";
const FORMAT_VERSION = 1;

type Payload = { html: string; text: string; json: string };

// Last thing copied/cut inside an editor. Module-level on purpose: it
// survives navigating between lectures, so you can copy in one and paste
// in another. Used by the toolbar's paste button, and as a fallback when
// the browser drops our custom clipboard type.
let lastCopied: Payload | null = null;

// The slice the next paste should use instead of the HTML-parsed one.
// Set right before ProseMirror parses, consumed by transformPasted.
let pendingSlice: Slice | null = null;

const normalize = (s: string) => s.replace(/\r\n?/g, "\n").trim();

/** Serialize the current selection (null when nothing is selected). */
function capture(view: EditorView): Payload | null {
  const { selection } = view.state;
  if (selection.empty) return null;

  // For a CellSelection this is exactly the selected cells, as rows.
  const slice = selection.content();
  const { dom, text } = view.serializeForClipboard(slice);
  return {
    html: dom.innerHTML,
    text,
    json: JSON.stringify({ v: FORMAT_VERSION, slice: slice.toJSON() }),
  };
}

function deleteSelection(view: EditorView) {
  view.dispatch(
    view.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"),
  );
}

/** JSON -> Slice, or null if it is malformed / doesn't fit our schema. */
function readSlice(view: EditorView, json: string): Slice | null {
  try {
    const data = JSON.parse(json);
    if (data?.v !== FORMAT_VERSION || !data.slice) return null;
    const slice = Slice.fromJSON(view.state.schema, data.slice);
    // Clipboard data is outside input: refuse anything the schema
    // wouldn't accept, and let the normal HTML paste handle it instead.
    slice.content.forEach((node) => node.check());
    return slice.size ? slice : null;
  } catch {
    return null;
  }
}

/** The exact slice for a paste event, if the clipboard came from us. */
function sliceFromClipboard(
  view: EditorView,
  data: DataTransfer | null,
): Slice | null {
  if (!data) return null;

  const json = data.getData(NOVA_SLICE_MIME);
  if (json) return readSlice(view, json);

  // Some browsers/paths drop custom types (e.g. text copied with the
  // async clipboard API). If the plain text is identical to what we last
  // copied, it's the same content: use the exact slice.
  const text = normalize(data.getData("text/plain"));
  if (lastCopied && text && text === normalize(lastCopied.text)) {
    return readSlice(view, lastCopied.json);
  }
  return null;
}

/** Copy/cut keyboard or native-menu event. Returns true when handled. */
function onCopyOrCut(view: EditorView, event: ClipboardEvent): boolean {
  const data = event.clipboardData;
  if (!data) return false; // let ProseMirror use its fallback
  const isCut = event.type === "cut";
  if (isCut && !view.editable) return false;

  const payload = capture(view);
  if (!payload) return false;

  lastCopied = payload;
  event.preventDefault();
  data.clearData();
  data.setData("text/html", payload.html);
  data.setData("text/plain", payload.text);
  data.setData(NOVA_SLICE_MIME, payload.json);

  if (isCut) deleteSelection(view);
  return true;
}

export const NovaClipboard = Extension.create({
  name: "novaClipboard",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("novaClipboard"),
        props: {
          handleDOMEvents: {
            copy: (view, event) => onCopyOrCut(view, event as ClipboardEvent),
            cut: (view, event) => onCopyOrCut(view, event as ClipboardEvent),

            // Runs BEFORE ProseMirror's own paste handler. We only note
            // which slice to use and return false so it carries on.
            paste: (view, event) => {
              pendingSlice = sliceFromClipboard(
                view,
                (event as ClipboardEvent).clipboardData,
              );
              // If ProseMirror ends up not parsing (e.g. mid-composition),
              // don't let this leak into a later paste or drop.
              if (pendingSlice) setTimeout(() => (pendingSlice = null), 0);
              return false;
            },
          },

          // `plain` = "paste as plain text" (Shift+Ctrl+V): respect it.
          transformPasted: (slice, _view, plain) => {
            const exact = pendingSlice;
            pendingSlice = null;
            return exact && !plain ? exact : slice;
          },
        },
      }),
    ];
  },
});

// ─────────────────────────────────────────────────────────────────────
// Toolbar actions (same code path as the keyboard / native menu)
// ─────────────────────────────────────────────────────────────────────

/** Best effort: also put the content on the system clipboard (for other apps). */
async function writeSystemClipboard({ html, text }: Payload) {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard?.writeText(text);
    }
  } catch {
    // Permission denied / unsupported: the in-editor copy still works.
  }
}

/** Copy the selection (text, cells, boxes, images...). */
export function novaCopy(editor: Editor): boolean {
  const payload = capture(editor.view);
  if (!payload) return false;
  lastCopied = payload;
  void writeSystemClipboard(payload);
  return true;
}

/** Cut the selection: copy it, then remove it. */
export function novaCut(editor: Editor): boolean {
  if (!editor.isEditable || !novaCopy(editor)) return false;
  deleteSelection(editor.view);
  return true;
}

/**
 * Paste what was last copied/cut inside the editor, exactly as it was.
 * If nothing was, falls back to the system clipboard's plain text.
 */
export async function novaPaste(editor: Editor): Promise<boolean> {
  if (!editor.isEditable) return false;
  const view = editor.view;

  // Everything up to the first `await` runs synchronously inside the tap,
  // which keeps the browser's user-gesture permission intact.
  if (lastCopied) {
    const slice = readSlice(view, lastCopied.json);
    if (slice) {
      pendingSlice = slice;
      try {
        view.pasteHTML(lastCopied.html); // goes through transformPasted above
      } finally {
        pendingSlice = null;
      }
      return true;
    }
  }

  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      view.pasteText(text);
      return true;
    }
  } catch {
    // No permission / unsupported: nothing to paste.
  }
  return false;
}