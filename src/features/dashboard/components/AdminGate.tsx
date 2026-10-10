import { useNavigate } from "@solidjs/router";
import { useUser } from "../../shared/context/user";
import { isAdminRole } from "../../shared/lib/roles";
import { createEffect, JSX, Show, Suspense } from "solid-js";

// Allows admin and super-admin. Renders nothing for anyone else.
export default function AdminGate(props: { children?: JSX.Element }) {
  const { user } = useUser();
  const navigate = useNavigate();

  createEffect(() => {
    if (user() && !isAdminRole(user()?.role)) {
      navigate("/", { replace: true });
    }
  });

  return (
    <Suspense>
      <Show
        when={isAdminRole(user()?.role)}
        fallback={<div class="text-center text-red-600">🚫 غير مصرح</div>}
      >
        {props.children}
      </Show>
    </Suspense>
  );
}
