export function EditorSource(props: {
  value: string;
  onInput: (value: string) => void;
}) {
  return (
    <textarea
      dir="rtl"
      lang="ar"
      spellcheck={false}
      class="
        h-full w-full resize-none
        bg-transparent p-4
        font-mono text-sm leading-relaxed
        text-slate-800
        outline-none
        placeholder:text-slate-400
        dark:text-slate-200
      "
      placeholder="الصق محتوى المحاضرة من Obsidian هنا..."
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value)}
    />
  );
}
