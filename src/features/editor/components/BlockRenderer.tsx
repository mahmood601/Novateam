import { For, Match, Switch } from "solid-js";
import type { NovaBlockNode, NovaInlineNode } from "../types/novaAst";
import { InlineRenderer } from "./InlineRenderer";

export function BlockRenderer(props: { block: NovaBlockNode }) {
  return (
    <Switch fallback={null}>
      <Match when={props.block.type === "heading"}>
        <HeadingBlock
          block={
            props.block as Extract<NovaBlockNode, { type: "heading" }>
          }
        />
      </Match>

      <Match when={props.block.type === "paragraph"}>
        <p class="leading-relaxed">
          <InlineRenderer
            nodes={
              (props.block as Extract<NovaBlockNode, { type: "paragraph" }>)
                .children
            }
          />
        </p>
      </Match>

      <Match when={props.block.type === "list"}>
        <ListBlock
          block={props.block as Extract<NovaBlockNode, { type: "list" }>}
        />
      </Match>

      <Match when={props.block.type === "code"}>
        <pre class="overflow-x-auto rounded-lg bg-black/5 p-3 text-sm dark:bg-white/10">
          <code>
            {(props.block as Extract<NovaBlockNode, { type: "code" }>).value}
          </code>
        </pre>
      </Match>

      <Match when={props.block.type === "note"}>
        <div
          class="my-3 rounded-lg border-r-4 bg-[var(--section-color)]/5 p-3 rtl:border-r-4 rtl:border-l-0"
          style={{ "border-color": "var(--section-color)" }}
        >
          <For
            each={
              (props.block as Extract<NovaBlockNode, { type: "note" }>)
                .children
            }
          >
            {(child) => <BlockRenderer block={child} />}
          </For>
        </div>
      </Match>

      <Match when={props.block.type === "quiz"}>
        {/* placeholder مؤقت — لاحقًا يترابط مع مكون الكويز الفعلي من features/quizzes */}
        <div class="my-3 rounded-lg border border-dashed border-[var(--section-color)] p-3 text-sm opacity-70">
          [كويز مرتبط: {(props.block as Extract<NovaBlockNode, { type: "quiz" }>).quizId}]
        </div>
      </Match>

      <Match when={props.block.type === "table"}>
        <TableBlock
          block={props.block as Extract<NovaBlockNode, { type: "table" }>}
        />
      </Match>
    </Switch>
  );
}

function HeadingBlock(props: {
  block: Extract<NovaBlockNode, { type: "heading" }>;
}) {
  return (
    <Switch>
      <Match when={props.block.depth === 1}>
        <h1 class="text-2xl font-bold" style={{ color: "var(--section-color)" }}>
          <InlineRenderer nodes={props.block.children} />
        </h1>
      </Match>
      <Match when={props.block.depth === 2}>
        <h2 class="mt-6 text-xl font-bold" style={{ color: "var(--section-color)" }}>
          <InlineRenderer nodes={props.block.children} />
        </h2>
      </Match>
      <Match when={props.block.depth === 3}>
        <h3 class="mt-4 text-lg font-semibold" style={{ color: "var(--section-color)" }}>
          <InlineRenderer nodes={props.block.children} />
        </h3>
      </Match>
      <Match when={props.block.depth === 4}>
        <h4 class="mt-3 text-base font-semibold" style={{ color: "var(--section-color)" }}>
          <InlineRenderer nodes={props.block.children} />
        </h4>
      </Match>
      <Match when={props.block.depth === 5}>
        <h5 class="mt-2 text-base font-medium" style={{ color: "var(--section-color)" }}>
          <InlineRenderer nodes={props.block.children} />
        </h5>
      </Match>
      <Match when={props.block.depth === 6}>
        <h6 class="mt-2 text-sm font-medium" style={{ color: "var(--section-color)" }}>
          <InlineRenderer nodes={props.block.children} />
        </h6>
      </Match>
    </Switch>
  );
}

function ListBlock(props: {
  block: Extract<NovaBlockNode, { type: "list" }>;
}) {
  return (
    <Switch>
      <Match when={props.block.ordered}>
        <ol class="list-decimal ps-6">
          <For each={props.block.items}>
            {(item) => (
              <li>
                <For each={item}>{(child) => <BlockRenderer block={child} />}</For>
              </li>
            )}
          </For>
        </ol>
      </Match>
      <Match when={!props.block.ordered}>
        <ul class="list-disc ps-6">
          <For each={props.block.items}>
            {(item) => (
              <li>
                <For each={item}>{(child) => <BlockRenderer block={child} />}</For>
              </li>
            )}
          </For>
        </ul>
      </Match>
    </Switch>
  );
}

function TableBlock(props: {
  block: Extract<NovaBlockNode, { type: "table" }>;
}) {
  return (
    <div class="my-3 overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <For each={props.block.header}>
              {(cell) => (
                <th
                  class="border-b-2 p-2 text-start"
                  style={{ "border-color": "var(--section-color)" }}
                >
                  <InlineRenderer nodes={cell} />
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.block.rows}>
            {(row) => (
              <tr>
                <For each={row}>
                  {(cell: NovaInlineNode[]) => (
                    <td class="border-b border-black/10 p-2 dark:border-white/10">
                      <InlineRenderer nodes={cell} />
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
