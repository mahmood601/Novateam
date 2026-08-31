export function EditorToolbar(props: {
  title?: string;
  onPrint: () => void;
}) {
  return (
    <header
      class="
        flex h-14 shrink-0 items-center
        border-b border-slate-200
        bg-white/90 px-4
        backdrop-blur
        dark:border-slate-800
        dark:bg-slate-950/90
      "
    >
      {/* Left */}
      <div class="flex items-center gap-3">
        <div>
          <div class="text-sm font-semibold">Nova</div>
          <div class="text-xs text-slate-500">محرر المحاضرات</div>
        </div>
      </div>

      {/* Center */}
      <div dir="rtl" class="mx-auto hidden text-sm text-slate-500 sm:block">
        {props.title ?? "محاضرة بدون عنوان"}
      </div>

      {/* Right */}
      <div class="flex items-center gap-2">
        <button
          onClick={props.onPrint}
          class="
            rounded-lg
            bg-slate-900 px-3 py-1.5
            text-sm font-medium text-white
            hover:bg-slate-700
            dark:bg-white dark:text-slate-900
            dark:hover:bg-slate-200
          "
        >
          طباعة / PDF
        </button>
      </div>
    </header>
  );
}
