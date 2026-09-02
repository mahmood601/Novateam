import { For } from "solid-js";
import type { NovaSection } from "../../types/novaAst";
import { novaColorHex } from "../../lib/novaColors";
import InlineRenderer from "./InlineRenderer";
import BlockRenderer from "./BlockRenderer";

export default function SectionRenderer(props: { section: NovaSection }) {
  const hex = () => novaColorHex(props.section.color);

  return (
    <section class="nova-section">
      <h1
        class="nova-heading"
        style={{
          color: hex(),
          "border-color": hex(),
          "background-color": `${hex()}22`,
        }}
      >
        <InlineRenderer nodes={props.section.heading.children} />
      </h1>

      <For each={props.section.children}>
        {(block) => <BlockRenderer block={block} color={props.section.color} />}
      </For>
    </section>
  );
}
