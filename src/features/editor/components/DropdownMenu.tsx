import { JSX } from "solid-js";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { EllipsisVertical, FileUp, Printer, UserPen } from "lucide-solid";
import { useNavigate } from "@solidjs/router";

const itemClass =
  "hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 focus:bg-darker-light-1 dark:focus:bg-lighter-dark-2 flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-md px-3 text-right text-sm outline-none";

export default function Menu(props: {
  subjectId: string;
  seasonId: string;
  children?: JSX.Element;
  handleFileUpload: (event: Event) => void;
  handleEditDoctorName: () => void;
}) {
  const navigate = useNavigate();
  // The file input lives OUTSIDE the dropdown: the menu unmounts its items
  // when it closes, which used to destroy the input before `change` fired.
  let fileInput: HTMLInputElement | undefined;

  return (
    <>
      <input
        ref={fileInput}
        class="sr-only"
        onChange={props.handleFileUpload}
        type="file"
        accept=".md"
      />
      <DropdownMenu>
        <DropdownMenu.Trigger
          aria-label="المزيد"
          title="المزيد"
          class="text-header dark:text-main-light hover:bg-darker-light-1 dark:hover:bg-lighter-dark-2 flex size-11 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          <EllipsisVertical size={20} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            class="border-darker-light-2 dark:border-lighter-dark-2 bg-main-light dark:bg-lighter-dark-1 text-header dark:text-main-light z-50 min-w-52 rounded-lg border p-1 shadow-lg"
            dir="rtl"
          >
            <DropdownMenu.Item
              class={itemClass}
              onSelect={() =>
                navigate(
                  "/print?subject=" +
                    props.subjectId +
                    "&season=" +
                    props.seasonId,
                )
              }
            >
              <Printer size={18} />
              <span>طباعة</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class={itemClass}
              onSelect={() => fileInput?.click()}
            >
              <FileUp size={18} />
              <span>تحميل ملف Markdown</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class={itemClass}
              onSelect={() => props.handleEditDoctorName()}
            >
              <UserPen size={18} />
              <span>تعديل اسم الدكتور</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
    </>
  );
}
