export default function Image() {
  return (
    <div class="relative h-[calc(100vh_/_3)] w-screen">
      {/* <img src="" alt="" class="w-full h-full" /> */}
      <p class="bg-blue-500 w-full h-full text-7xl font-bold text-white  flex items-center justify-center">MD</p>
      <EditPencil />
    </div>
  )
}

function EditPencil() {
  return (
    <div class="flex justify-end items-start pt-1 pr-1 pl-4 pb-4 bg-white/50 text-white absolute top-0 right-0 rounded-bl-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="2em"
        height="2em"
        viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1q-.15.15-.15.36M20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83l3.75 3.75z" />
      </svg>
    </div>
  )
}
