// Small bottom sheet that replaces window.prompt() (link URL, image URL,
// doctor name). It lives in the editor's bottom dock, so it sits right
// above the keyboard on phones.

import { createSignal, For, onMount, Show } from "solid-js";
import { X } from "lucide-solid";

export type InputField = {
  key: string;
  label: string;
  placeholder?: string;
  value?: string;
  /** "ltr" for URLs so they type naturally inside the RTL UI. */
  dir?: "ltr" | "rtl";
  type?: "text" | "url";
  required?: boolean;
};

export type InputRequest = {
  title: string;
  submitLabel?: string;
  fields: InputField[];
  /** Optional secondary action, e.g. "remove link". */
  dangerLabel?: string;
  resolve: (values: Record<string, string> | null) => void;
  onDanger?: () => void;
};

export default function InputSheet(props: { request: InputRequest }) {
  const [values, setValues] = createSignal<Record<string, string>>(
    Object.fromEntries(props.request.fields.map((f) => [f.key, f.value ?? ""])),
  );
  let firstInput: HTMLInputElement | undefined;

  onMount(() => {
    // Small delay so the sheet is laid out before the keyboard opens.
    setTimeout(() => {
      firstInput?.focus();
      firstInput?.select();
    }, 50);
  });

  const canSubmit = () =>
    props.request.fields.every(
      (f) => !f.required || (values()[f.key] ?? "").trim() !== "",
    );

  const submit = () => {
    if (!canSubmit()) return;
    props.request.resolve(values());
  };

  return (
    <form
      class="flex flex-col gap-2 p-2"
      dir="rtl"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div class="border-b-darker-light-1 dark:border-b-lighter-dark-2 flex items-center justify-between border-b-2 px-3 py-2">
        <span class="font-medium">{props.request.title}</span>
        <button
          type="button"
          class="rounded-full p-2"
          aria-label="إلغاء"
          onClick={() => props.request.resolve(null)}
        >
          <X size={20} />
        </button>
      </div>

      <div class="flex flex-col gap-2 px-2">
        <For each={props.request.fields}>
          {(field, i) => (
            <label class="flex flex-col gap-1 text-sm">
              <span class="opacity-70">{field.label}</span>
              <input
                ref={(el) => {
                  if (i() === 0) firstInput = el;
                }}
                type={field.type ?? "text"}
                dir={field.dir ?? "rtl"}
                inputmode={field.type === "url" ? "url" : undefined}
                autocapitalize="off"
                autocomplete="off"
                enterkeyhint={i() === props.request.fields.length - 1 ? "done" : "next"}
                placeholder={field.placeholder}
                value={values()[field.key]}
                onInput={(e) =>
                  setValues({ ...values(), [field.key]: e.currentTarget.value })
                }
                class="bg-darker-light-1 dark:bg-lighter-dark-2 focus:ring-main min-h-11 w-full rounded-lg px-3 text-base outline-none focus:ring-2"
              />
            </label>
          )}
        </For>
      </div>

      <div class="flex items-center gap-2 px-2 pb-1">
        <button
          type="submit"
          disabled={!canSubmit()}
          class="bg-main min-h-11 flex-1 rounded-lg px-4 text-white disabled:opacity-40"
        >
          {props.request.submitLabel ?? "تأكيد"}
        </button>
        <Show when={props.request.dangerLabel}>
          <button
            type="button"
            class="min-h-11 rounded-lg px-4 text-red-600"
            onClick={() => props.request.onDanger?.()}
          >
            {props.request.dangerLabel}
          </button>
        </Show>
      </div>
    </form>
  );
}
