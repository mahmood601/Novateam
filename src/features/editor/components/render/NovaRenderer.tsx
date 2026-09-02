import { For } from "solid-js";
import type { NovaDocument } from "../../types/novaAst";
import SectionRenderer from "./SectionRenderer";

export default function NovaRenderer(props: { document: NovaDocument }) {
  return (
    <div dir="rtl" class="nova-render">
      <For each={props.document.sections}>
        {(section) => <SectionRenderer section={section} />}
      </For>
    </div>
  );
}
