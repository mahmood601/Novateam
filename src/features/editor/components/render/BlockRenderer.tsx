import { For, Match, Switch } from "solid-js";
import type { NovaBlockNode, NovaColor } from "../../types/novaAst";
import { novaColorHex } from "../../lib/novaColors";
import InlineRenderer from "./InlineRenderer";

export default function BlockRenderer(props: {
  block: NovaBlockNode;
  color: NovaColor;
}) {
  const hex = () => novaColorHex(props.color);

  return (
    <Switch fallback={null}>
      {/* Sub-headings only — depth-1 section headings are rendered by
          SectionRenderer directly, never reach here */}
      <Match when={props.block.type === "heading"}>
        <HeadingBlock block={props.block as any} hex={hex()} />
      </Match>

      <Match when={props.block.type === "paragraph"}>
        <p class="nova-paragraph">
          <InlineRenderer nodes={(props.block as any).children} />
        </p>
      </Match>

      <Match when={props.block.type === "list"}>
        <ListBlock block={props.block as any} color={props.color} />
      </Match>

      <Match when={props.block.type === "code"}>
        <pre>
          <code>{(props.block as any).value}</code>
        </pre>
      </Match>

      <Match when={props.block.type === "table"}>
        <TableBlock block={props.block as any} hex={hex()} />
      </Match>

      <Match when={props.block.type === "quote"}>
        <blockquote style={{ "border-inline-start": `3px solid ${hex()}` }}>
          <For each={(props.block as any).children}>
            {(child) => <BlockRenderer block={child} color={props.color} />}
          </For>
        </blockquote>
      </Match>

      <Match when={props.block.type === "note"}>
        <div
          class="nova-note"
          style={{
            "border-color": hex(),
            "background-color": `${hex()}22`, // light tint of the section color
          }}
        >
          <For each={(props.block as any).children}>
            {(child) => <BlockRenderer block={child} color={props.color} />}
          </For>
        </div>
      </Match>

      <Match when={props.block.type === "quiz"}>
        <div class="nova-quiz-placeholder">
          سؤال اختبار — ID: {(props.block as any).quizId}
        </div>
      </Match>

      <Match when={props.block.type === "unknown"}>
        <div class="nova-unknown-block" title="نوع بلوك غير معروف بعد">
          {(props.block as any).raw}
        </div>
      </Match>
    </Switch>
  );
}

function HeadingBlock(props: { block: any; hex: string }) {
  const Tag = `h${Math.min(props.block.depth, 6)}` as keyof HTMLElementTagNameMap;
  return (
    <Tag
      class="nova-subheading"
      style={{
        color: props.hex,
        "border-inline-end": `3px solid ${props.hex}`,
      }}
    >
      <InlineRenderer nodes={props.block.children} />
    </Tag>
  );
}

function ListBlock(props: { block: any; color: NovaColor }) {
  const Tag = props.block.ordered ? "ol" : "ul";
  return (
    <Tag>
      <For each={props.block.items}>
        {(item) => (
          <li>
            <For each={item}>
              {(child) => <BlockRenderer block={child} color={props.color} />}
            </For>
          </li>
        )}
      </For>
    </Tag>
  );
}

function TableBlock(props: { block: any; hex: string }) {
  return (
    <div class="nova-table-wrap">
      <table class="nova-table" style={{ "border-color": props.hex }}>
        <thead>
          <tr>
            <For each={props.block.header}>
              {(cell) => (
                <th>
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
                  {(cell) => (
                    <td>
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
