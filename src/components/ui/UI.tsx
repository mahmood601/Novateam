import { For } from "solid-js";
import Box from "./Box";
import Header from "./Header";
import "./UI.css"
import { years } from "./years";


export default function UI() {

  return (
    <div class="h-screen dark:bg-black">
      <Header />
      <div class=" flex justify-center w-screen mt-20">
        <div class="flex items-center justify-center flex-col w-5/6 h-full px-4 overflow-y-scroll">
          <For each={years}>
            {
              (prop) => (
                <Box info={prop.year} link={`/${prop.yearId}`} />
              )
            }
          </For>
        </div>
      </div >
    </div>
  )
}
