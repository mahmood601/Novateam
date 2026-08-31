import { For, Show } from "solid-js";
import { SectionRenderer } from "./SectionRenderer";

export function NovaRenderer(props: { document: string }) {
  return (
    <article
      dir="rtl"
      lang="ar"
      class="nova-doc mx-auto max-w-3xl px-4 py-6 text-[11pt] leading-[1.8]"
      style={{ "font-family": "'Hacen Tunisia', 'Century Gothic', sans-serif" }}
    >

      <For each={props.document.sections}>
        {(section) => <SectionRenderer section={section} />}
      </For>
    </article>
  );
}
