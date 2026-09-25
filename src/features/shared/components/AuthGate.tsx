import { Show, JSX, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useUser } from "../context/user";

type Props = {
  children: JSX.Element;
};

export default function AuthGate(props: Props) {
  const { user, isLoading } = useUser();
  const navigate = useNavigate();

  createEffect(() => {
    // غير مسجل → يروح للـ Landing
    if (!isLoading() && !user()) {
      navigate("/landing", { replace: true });
    }
  });

  return (
    <Show
      when={user() || !isLoading()}
      fallback={
        <div class="flex h-screen items-center justify-center">
          <p class="text-main-dark dark:text-white">جاري التحميل...</p>
        </div>
      }
    >
      <Show when={user()}>{props.children}</Show>
    </Show>
  );
}