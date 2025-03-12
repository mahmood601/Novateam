import { JSX } from "solid-js"

export default function Header(props: { classes?: string, sectionName: string, children?: JSX.Element }) {

  return (
    <div class="flex justify-between w-full items-center p-5 dark:bg-header dark:text-white">
      <svg
        onClick={() => { history.back() }}
        xmlns="http://www.w3.org/2000/svg"
        width="1.8em" height="1.8em"
        viewBox="0 0 16 16">
        <path
          fill="currentColor"
          fill-rule="evenodd"
          d="M5.841 5.28a.75.75 0 0 0-1.06-1.06L1.53 7.47L1 8l.53.53l3.25 3.25a.75.75 0 0 0 1.061-1.06l-1.97-1.97H14.25a.75.75 0 0 0 0-1.5H3.871z"
          clip-rule="evenodd" />
      </svg>
      <h1 class=" text-xl font-bold flex-1 text-center pr-[1.8em]">{props.sectionName}</h1>
      {props.children}
    </div >
  )
}
