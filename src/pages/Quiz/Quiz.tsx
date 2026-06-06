import { Suspense } from "solid-js";
import NormalMode from "./NormalMode";

export default function Quiz() {
  return (
    <Suspense>
      <NormalMode />
    </Suspense>
  );
}
