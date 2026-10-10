import { useNavigate } from "@solidjs/router";
import { useUser } from "../../shared/context/user";
import { isSuperAdminRole } from "../../shared/lib/roles";
import { createEffect, JSX, Show } from "solid-js";

// Nested inside AdminGate; only super-admin may see the children.
export default function SuperAdminGate(props: { children?: JSX.Element }) {
  const { user } = useUser();
  const navigate = useNavigate();

  createEffect(() => {
    if (user() && !isSuperAdminRole(user()?.role)) {
      navigate("/dashboard", { replace: true });
    }
  });

  return (
    <Show
      when={isSuperAdminRole(user()?.role)}
      fallback={<div class="pt-24 text-center text-red-600">🚫 غير مصرح</div>}
    >
      {props.children}
    </Show>
  );
}
