import { For } from "solid-js";
import Box from "./Box";
import "../index.css";
import subjects from "./subjects";

export default function UI() {
  return (
    <div class="bg-main-light dark:bg-main-dark pt-10 shrink-1 overflow-x-hidden">
      <div class="flex h-full w-full justify-center overflow-hidden">
        <div class="h-10/12 w-5/6 overflow-y-scroll">
          <For each={Object.keys(subjects)}>
            {(subject) => (
              <Box
                subject={subject}
                info={subjects[subject].name}
                link={`${subject}`}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
