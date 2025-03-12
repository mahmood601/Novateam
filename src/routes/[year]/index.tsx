import { useParams } from "@solidjs/router";
import { createResource, For } from "solid-js";
import Box from "~/components/ui/Box";
import Layout from "~/components/ui/Layout";
import subjects from "~/components/subjects.js"

export default function App() {
  const params = useParams()
  return (
    <div class="h-screen dark:bg-black">
      <Layout>
        <div class=" flex justify-center items-center w-screen h-[calc(100vh_-_160px)] mt-20">
          <div class="w-5/6 h-full px-4 overflow-y-scroll">
            <For each={subjects}>
              {
                (prop) => (
                  <Box info={prop.name} link={`/${params.year}/${prop.linkId}`} />
                )
              }
            </For>
          </div>
        </div >
      </Layout>
    </div>
  )
}
