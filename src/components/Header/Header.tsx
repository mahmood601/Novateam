import AppName from "./AppName";


export default function Header() {
  return (
    <header class="fixed top-0 right-0 left-0 z-40 flex h-20 items-center justify-between px-5">
      <AppName />
    </header>
  );
}

