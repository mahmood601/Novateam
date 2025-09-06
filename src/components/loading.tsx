import Atom from "./Icons/Atom";

export default function Loading() {
  return (
    <div class="flex h-[calc(100vh_-_80px)] w-full items-center justify-center">
      <div class="">
        <div class="m-auto transition duration-300 size-12 ">
          <Atom />
        </div>

        <p dir="rtl">جار التحميل...</p>
      </div>
    </div>
  );
}
