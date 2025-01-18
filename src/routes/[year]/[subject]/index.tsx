import { query, useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, Show, Suspense } from "solid-js";
import Layout from "~/components/ui/Layout";
import SubHeader from "~/components/ui/SubHeader";
import TestsList from "~/components/ui/TestsList";
import link from "~/lib/QRL";
import { QStore, setQStore } from "~/stores/QStores";

const fetchQ = query(async (store) => {
  const res = await fetch(link + `${store.subject}/${store.year}.json`)

  return res.json()
}, "q" + QStore.year)



export default function App() {

  const params = useParams()
  setQStore("subject", params.subject)

  createEffect((prev) => {
    refetch(QStore.year)
  })
  const [questions, { refetch }] = createResource(QStore, fetchQ)

  return (
    <div class="h-screen dark:bg-black">
      <Layout>
        <Suspense fallback={
          <div class="h-[calc(100vh_-_160px)] flex justify-center items-center">
            <p dir="rtl" class="text-center dark:text-white">جار التحميل...</p>
          </div>
        }>

          <Show when={questions()}>
            <div class=" flex justify-center items-center w-screen h-[calc(100vh_-_160px)] mt-20">
              <SubHeader questions={questions()} />
              <TestsList questions={questions()} />
            </div >
          </Show>
        </Suspense>
      </Layout>
    </div >
  )
}
