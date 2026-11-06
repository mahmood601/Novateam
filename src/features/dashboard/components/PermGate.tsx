import { type JSX, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { useUser } from "../../shared/context/user";
import type { Level, Scope } from "../../shared/lib/permissions";

/**
 * Route guard based on grants (replaces SuperAdminGate).
 *  - subjectParam: check the grant against the :subject in the URL
 *  - any:          pass if the user holds ANY grant of that scope
 *  - neither:      needs an ALL-subjects grant
 * UI convenience only — Postgres enforces the same rules (RLS).
 */
export default function PermGate(props: {
  scope: Scope;
  min?: Level;
  subjectParam?: boolean;
  any?: boolean;
  children?: JSX.Element;
}) {
  const { user, can, canAny } = useUser();
  const params = useParams();

  const allowed = () => {
    const min = props.min ?? "contribute";
    if (props.any) return canAny(props.scope, min);
    return can(props.scope, props.subjectParam ? (params.subject ?? null) : null, min);
  };

  return (
    <Show when={user()}>
      <Show
        when={allowed()}
        fallback={
          <div
            class="flex min-h-dvh flex-col items-center justify-center gap-3 px-5 text-center"
            dir="rtl"
          >
            <span class="text-5xl">🔒</span>
            <p class="font-bold text-slate-700 dark:text-slate-200">
              ليس لديك صلاحية لهذه الصفحة
            </p>
            <A
              href="/dashboard"
              class="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-sm font-bold text-white"
            >
              العودة للوحة التحكم
            </A>
          </div>
        }
      >
        {props.children}
      </Show>
    </Show>
  );
}
