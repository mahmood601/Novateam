import Header from "~/components/ui/Shared/Header";

// use colors for each box when you want to differenciate between them
export default function Ranking() {
  return (
    <>
      <Header sectionName="الترتيب الحالي" />
      <div class="dark:bg-header p-5 bg-white w-screen h-[calc(100vh_-_68px)] flex flex-col items-center gap-10">
        <div class="p-2 grid grid-cols-3 grid-rows-4 rounded-md bg-white dark:bg-header w-full h-1/2">

          <div class="flex items-end justify-center row-span-2 row-start-2 row-end-4 border-b-2 border-r-2 border-b-black border-r-black dark:border-white">
            <div class="mb-1 w-14 h-14 bg-gray-500 rounded-md"></div>
          </div>

          <div class="flex items-end justify-center row-span-1 row-start-1 col-start-2">
            <div class="mb-1 w-14 h-14 bg-gray-500 rounded-md"></div>
          </div>

          <div class="flex items-end justify-center row-span-1  row-start-2 border-b-2 border-l-2 border-b-black border-l-black dark:border-white">
            <div class="mb-1 w-14 h-14 bg-gray-500 rounded-md"></div>
          </div>

          <div class="flex items-center justify-center row-span-1 row-start-4 border-l-2 border-l-black dark:border-white">
            <p class="text-black dark:text-white font-bold text-4xl">3</p>
          </div>

          <div class="flex items-center justify-center row-span-3 row-start-2 col-start-2 border-t-2 border-t-black dark:border-white">
            <p class="text-black dark:text-white font-bold text-4xl">1</p>
          </div>

          <div class="flex items-center justify-center row-span-2 row-start-3 border-r-2 border-r-black dark:border-white">
            <p class="text-black dark:text-white font-bold text-4xl">2</p>
          </div>

        </div>
        <div class="rounded-md dark:bg-header dark:text-white overflow-y-scroll bg-white w-full h-1/2">
          <RankingList />
        </div>
      </div>
    </>
  )
}

function RankingList() {
  return (<>
    <div class="p-2 flex flex-row-reverse justify-around items-center gap-2 h-14 border-b-[1px] border-b-gray-500">
      <div class="text-center font-bold text-2xl">#1000</div>
      <div class="h-10 w-10 rounded-md bg-gray-500"></div>
      <div dir="rtl" class="text-xl flex-1 h-full flex items-center">علي ابراهيم</div>
    </div>
  </>

  )
}
