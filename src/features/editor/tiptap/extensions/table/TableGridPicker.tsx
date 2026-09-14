// MS Word / Google Docs–style "insert table" grid picker.
//
// Works with both mouse (hover) and touch (drag) via the Pointer Events
// API: a single pointerdown+pointermove+pointerup handles mouse hover,
// mouse drag, and a finger drag on Android identically, so there's no
// separate touch code path to keep in sync. Cells are sized generously
// (36px) to stay comfortably above Android's ~40px touch-target guidance
// once the 2px gap between cells is accounted for.

import { createSignal, For } from "solid-js";

const CELL_SIZE = 36;
const CELL_GAP = 3;

// export function TableGridPicker(props: {
//   maxRows: number;
//   maxCols: number;
//   onSelect: (rows: number, cols: number) => void;
// }) {
//   const [hover, setHover] = createSignal({ row: 1, col: 1 });
//   const [dragging, setDragging] = createSignal(false);
//   let gridRef: HTMLDivElement | undefined;

//   const cellFromPoint = (clientX: number, clientY: number) => {
//     if (!gridRef) return null;
//     const rect = gridRef.getBoundingClientRect();
//     const step = CELL_SIZE + CELL_GAP;
//     const col = Math.min(
//       props.maxCols,
//       Math.max(1, Math.ceil((clientX - rect.left) / step)),
//     );
//     const row = Math.min(
//       props.maxRows,
//       Math.max(1, Math.ceil((clientY - rect.top) / step)),
//     );
//     return { row, col };
//   };

//   const updateFromPointer = (e: PointerEvent) => {
//     const cell = cellFromPoint(e.clientX, e.clientY);
//     if (cell) setHover(cell);
//   };

//   const handlePointerDown = (e: PointerEvent) => {
//     (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
//     setDragging(true);
//     updateFromPointer(e);
//   };

//   const handlePointerMove = (e: PointerEvent) => {
//     if (!dragging()) return;
//     updateFromPointer(e);
//   };

//   const endDrag = (e: PointerEvent) => {
//     if (!dragging()) return;
//     setDragging(false);
//     const cell = cellFromPoint(e.clientX, e.clientY);
//     if (cell) props.onSelect(cell.row, cell.col);
//   };

//   const rowIndices = () => Array.from({ length: props.maxRows }, (_, i) => i + 1);
//   const colIndices = () => Array.from({ length: props.maxCols }, (_, i) => i + 1);
//   const isFilled = (r: number, c: number) => r <= hover().row && c <= hover().col;

//   return (
//     <div class="flex flex-col items-center gap-2">
//       <div
//         ref={gridRef}
//         class="grid select-none"
//         style={{
//           "touch-action": "none",
//           gap: `${CELL_GAP}px`,
//           "grid-template-columns": `repeat(${props.maxCols}, ${CELL_SIZE}px)`,
//           "grid-template-rows": `repeat(${props.maxRows}, ${CELL_SIZE}px)`,
//         }}
//         onPointerDown={handlePointerDown}
//         onPointerMove={handlePointerMove}
//         onPointerUp={endDrag}
//         onPointerCancel={() => setDragging(false)}
//       >
//         <For each={rowIndices()}>
//           {(r) => (
//             <For each={colIndices()}>
//               {(c) => (
//                 <div
//                   class="rounded-sm border"
//                   style={{
//                     "border-color": isFilled(r, c)
//                       ? "var(--color-main)"
//                       : "var(--color-darker-light-2, #e7e8ec)",
//                     "background-color": isFilled(r, c)
//                       ? "color-mix(in srgb, var(--color-main) 35%, transparent)"
//                       : "transparent",
//                   }}
//                   onClick={() => props.onSelect(r, c)}
//                 />
//               )}
//             </For>
//           )}
//         </For>
//       </div>

//       <div class="text-header text-sm font-medium">
//         {hover().row} × {hover().col}
//       </div>
//     </div>
//   );
// }

/** Numeric fallback for precise sizing or tables bigger than the grid picker. */
export function TableSizeStepper(props: {
  maxRows: number;
  maxCols: number;
  onSelect: (rows: number, cols: number) => void;
}) {
  const [rows, setRows] = createSignal(3);
  const [cols, setCols] = createSignal(3);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  return (
    <div class="flex w-full flex-col gap-3">
      <label class="flex flex-col gap-1 text-sm">
        <span>صفوف (Rows)</span>
        <input
          type="number"
          min={1}
          max={props.maxRows}
          value={rows()}
          class="border-darker-light-2 rounded border px-2 py-1.5 text-center"
          onInput={(e) =>
            setRows(clamp(Number(e.currentTarget.value) || 1, 1, props.maxRows))
          }
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span>أعمدة (Columns)</span>
        <input
          type="number"
          min={1}
          max={props.maxCols}
          value={cols()}
          class="border-darker-light-2 rounded border px-2 py-1.5 text-center"
          onInput={(e) =>
            setCols(clamp(Number(e.currentTarget.value) || 1, 1, props.maxCols))
          }
        />
      </label>

      <button
        type="button"
        class="mt-1 rounded bg-main px-3 py-2 text-sm text-white hover:opacity-90"
        onClick={() => props.onSelect(rows(), cols())}
      >
        إدراج جدول ({rows()} × {cols()})
      </button>
    </div>
  );
}

/** Combined panel: grid picker up top, numeric fallback below for larger/precise tables. */
export function TablePickerPanel(props: {
  maxRows: number;
  maxCols: number;
  onSelect: (rows: number, cols: number) => void;
}) {
  return (
    <div class="bg-main-light border-darker-light-2 max-h-[70vh] w-full min-w-50 overflow-y-auto rounded-lg border p-3 shadow-lg">
      <div class="flex flex-col items-center gap-4">
        {/* <TableGridPicker
          maxRows={props.maxRows}
          maxCols={props.maxCols}
          onSelect={props.onSelect}
        /> */}

        <div class="border-darker-light-2 w-full border-t pt-3">
          <TableSizeStepper
            maxRows={30}
            maxCols={20}
            onSelect={props.onSelect}
          />
        </div>
      </div>
    </div>
  );
}
