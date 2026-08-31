import { For } from "solid-js";
import type { NovaSection } from "../types/novaAst";
import { novaColorHex } from "../lib/novaColors";
import { BlockRenderer } from "./BlockRenderer";

export function SectionRenderer(props: { section: NovaSection }) {
  const anchorId = () =>
    "section-" +
    props.section.heading.children
      .map((child) => ("value" in child ? child.value : ""))
      .join("")
      .trim()
      .replace(/\s+/g, "-");

  return (
    <section
      id={anchorId()}
      class="mb-8 scroll-mt-4"
      style={{ "--section-color": novaColorHex(props.section.color) }}
    >
      <BlockRenderer block={props.section.heading} />
      <For each={props.section.children}>
        {(block) => <BlockRenderer block={block} />}
      </For>
    </section>
  );
}
