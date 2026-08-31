import { useNavigate } from "@solidjs/router";
import { useUser } from "../../shared/context/user";
import { createEffect, JSX, Show, Suspense } from "solid-js";

export default function AdminGate(props: { children?: JSX.Element }) {
const {user} = useUser()
const navigate = useNavigate()

createEffect(() => {
  if (user() && user()?.role !== "admin") {
    navigate("/");
  }
})

  return (
    <Suspense>
      {/* TODO: Implement proper admin gate logic */}
    <Show when={true} fallback={<div class="text-center text-red-600">🚫 غير مصرح</div>}>
      {props.children}
    </Show>
    </Suspense>

  );
}