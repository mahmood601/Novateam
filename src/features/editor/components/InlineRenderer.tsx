import { For, Match, Switch } from "solid-js";
import type { NovaInlineNode } from "../types/novaAst";

export function InlineRenderer(props: { nodes: NovaInlineNode[] }) {
  return (
    <For each={props.nodes}>
      {(node) => <InlineNode node={node} />}
    </For>
  );
}

function InlineNode(props: { node: NovaInlineNode }) {
  return (
    <Switch fallback={null}>
      <Match when={props.node.type === "text"}>
        {(props.node as { type: "text"; value: string }).value}
      </Match>

      <Match when={props.node.type === "strong"}>
        <strong>
          <InlineRenderer
            nodes={(props.node as { children: NovaInlineNode[] }).children}
          />
        </strong>
      </Match>

      <Match when={props.node.type === "emphasis"}>
        <em>
          <InlineRenderer
            nodes={(props.node as { children: NovaInlineNode[] }).children}
          />
        </em>
      </Match>

      <Match when={props.node.type === "inlineCode"}>
        <code class="rounded bg-black/5 px-1 py-0.5 text-[0.9em] dark:bg-white/10">
          {(props.node as { type: "inlineCode"; value: string }).value}
        </code>
      </Match>

      <Match when={props.node.type === "link"}>
        <a
          href={(props.node as { url: string }).url}
          class="underline decoration-[var(--section-color)] underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          <InlineRenderer
            nodes={(props.node as { children: NovaInlineNode[] }).children}
          />
        </a>
      </Match>

      <Match when={props.node.type === "image"}>
        <img
          src={(props.node as { url: string; alt?: string }).url}
          alt={(props.node as { url: string; alt?: string }).alt ?? ""}
          class="my-2 max-w-full rounded-lg"
        />
      </Match>
    </Switch>
  );
}
