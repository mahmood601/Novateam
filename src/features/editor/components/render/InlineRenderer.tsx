import { For, Match, Switch } from "solid-js";
import type { NovaInlineNode } from "../../types/novaAst";

export default function InlineRenderer(props: { nodes: NovaInlineNode[] }) {
  return (
    <For each={props.nodes}>
      {(node) => (
        <Switch fallback={null}>
          <Match when={node.type === "text"}>
            {(node as { value: string }).value}
          </Match>
          <Match when={node.type === "strong"}>
            <strong>
              <InlineRenderer nodes={(node as any).children} />
            </strong>
          </Match>
          <Match when={node.type === "emphasis"}>
            <em>
              <InlineRenderer nodes={(node as any).children} />
            </em>
          </Match>
          <Match when={node.type === "inlineCode"}>
            <code>{(node as { value: string }).value}</code>
          </Match>
          <Match when={node.type === "link"}>
            <a href={(node as any).url} target="_blank" rel="noreferrer">
              <InlineRenderer nodes={(node as any).children} />
            </a>
          </Match>
          <Match when={node.type === "image"}>
            <img src={(node as any).url} alt={(node as any).alt ?? ""} />
          </Match>
        </Switch>
      )}
    </For>
  );
}
