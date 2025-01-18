import { A } from "@solidjs/router"

export default function Box(props: { tailwindBgColor?: string, info: string, link: string, children?: any }) {
  return (
    <A href={props.link} class="mb-5 border-[2px] dark:bg-[#222] dark:shadow-none dark:text-white dark:border-[#333] dark:hover:border-dark-hover dark:shadow-[#333] border-gray-200 hover:border-gray-400 transition-colors duration-400 shadow-md shadow-gray-400 py-2 pl-2 pr-4  w-full h-24 rounded-md flex justify-between flex-row-reverse">
      <div class="h-full flex-1 flex flex-col justify-around">
        <p class=" w-full font-bold text-center text-lg">{props.info}</p>
        {props.children}
        {/* <p class="text-right w-full">{props.seasonName}</p> */}
      </div>
      {/* <div class="mr-2 h-full w-20 flex justify-center items-center"> */}
      {/*   <div */}
      {/*     style={{ */}
      {/*       "background": `conic-gradient(#693800 ${props.completedSSNum / props.subSeasonNum}turn, #eee 0deg)` */}
      {/*     }} */}
      {/*     class="w-20 h-20 rounded-full flex justify-center items-center"> */}
      {/*     <div class="progress bg-white dark:bg-black rounded-full flex justify-center items-center"> */}
      {/*       <span class="block diagonal-fractions text-2xl font-bold">2/{props.subSeasonNum}</span> */}
      {/*     </div> */}
      {/*   </div> */}
      {/* </div> */}
    </A>
  )
}

