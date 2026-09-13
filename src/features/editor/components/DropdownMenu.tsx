import { JSX } from "solid-js";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { EllipsisVertical } from "lucide-solid";
import { useNavigate } from "@solidjs/router";

export default function Menu(props: {
  subjectId: string;
  seasonId: string;
  children?: JSX.Element;
  handleFileUpload: (event: Event) => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger class="flex items-center justify-center rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900">
          <EllipsisVertical size={20} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            class="z-50 min-w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            dir="rtl"
          >
            <DropdownMenu.Item class="cursor-pointer list-none rounded-md px-3 py-2 text-right text-sm text-slate-700 transition-colors outline-none hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900">
              <button
                onClick={() => {
                  navigate(
                    "/print?subject=" +
                      props.subjectId +
                      "&season=" +
                      props.seasonId,
                  );
                }}
              >
                طباعة
              </button>
            </DropdownMenu.Item>
            <DropdownMenu.Item class="cursor-pointer list-none rounded-md px-3 py-2 text-right text-sm text-slate-700 transition-colors outline-none hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900">
              <div class="relative">
                <label
                  dir="rtl"
                  for="mdFile"
                  class="block cursor-pointer text-sm"
                >
                  تحميل ملف Markdown
                </label>
                <input
                  class="sr-only"
                  onChange={props.handleFileUpload}
                  id="mdFile"
                  type="file"
                  accept=".md"
                />
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
    </>
  );
}
