import { Accessor, createSignal, onCleanup, onMount, Setter } from "solid-js"

export default function SearchBox(props: { search: Accessor<boolean>, setSearch: Setter<boolean> }) {
  let searchBoxRef!: HTMLDivElement
  const [value, setValue] = createSignal('')

  const handleClick = (e: MouseEvent) => {
    if (!searchBoxRef.contains(e.target as Node)) {
      props.setSearch(false)
      setValue('')
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClick)
    onCleanup(() => {
      document.removeEventListener('click', handleClick)
    })
  })

  return (
    <div
      class={`${props.search() ? 'flex-1' : ''} justify-end transition-all flex items-center bg-gray-100  dark:bg-dark-hover text-black rounded-md p-2`}
      on:click={() => { props.setSearch(true) }}
      ref={searchBoxRef}
    >
      <input
        type="text"
        placeholder="ابحث ..."
        onInput={(e: InputEvent) => setValue((e.target as HTMLInputElement)?.value)}
        value={value()}
        dir="rtl"
        class={`${props.search() ? 'w-full' : ' hidden w-0'} dark:bg-dark-hover dark:caret-white dark:text-white mr-2 outline-none  transition-all duration-200 bg-gray-100 text-black`}
      />
      <button class="dark:text-white">
        <SearchIcon />
      </button>

    </div>
  )
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24">
      <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14" />
    </svg>

  )
}
