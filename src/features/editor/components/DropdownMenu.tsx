import { JSX } from "solid-js";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { EllipsisVertical } from "lucide-solid";
import { useNavigate } from "@solidjs/router";

export default function Menu(props: {
  subjectId: string;
  seasonId: string;
  children?: JSX.Element;
  handleFileUpload: (event: Event) => void;
  handleEditDoctorName: (event: Event) => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger class="text-header dark:text-main-light hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex items-center justify-center rounded-full p-2 transition-colors">
          <EllipsisVertical size={20} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            class="border-darker-light-2 dark:border-lighter-dark-2 bg-main-light dark:bg-lighter-dark-1 text-header dark:text-main-light z-50 min-w-48 rounded-lg border p-1 shadow-lg"
            dir="rtl"
          >
            <DropdownMenu.Item class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 focus:bg-darker-light-1 dark:focus:bg-lighter-dark-2 cursor-pointer list-none rounded-md px-3 py-2 text-right text-sm transition-colors outline-none">
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
            <DropdownMenu.Item class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 focus:bg-darker-light-1 dark:focus:bg-lighter-dark-2 cursor-pointer list-none rounded-md px-3 py-2 text-right text-sm transition-colors outline-none">
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
            <DropdownMenu.Item class="hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 focus:bg-darker-light-1 dark:focus:bg-lighter-dark-2 cursor-pointer list-none rounded-md px-3 py-2 text-right text-sm transition-colors outline-none">
              <button onClick={props.handleEditDoctorName}>
                تعديل اسم الدكتور
              </button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
    </>
  );
}
