import { createResource, createSignal, Show } from "solid-js";
import { supabase } from "../services/supabase";
import { useUser } from "../context/user";
import { isAdminRole } from "../lib/roles";

type Access = "open" | "maintenance";

// How long we're willing to hold the whole app hostage to this check.
// On a weak connection a request can hang for a long time instead of failing.
const CHECK_TIMEOUT_MS = 3000;

async function fetchAccess(): Promise<Access> {
  // هل الصيانة مفعلة؟
  const { data: config } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "maintenance_mode")
    .single();

  // On error `config` is null → treated as "not in maintenance".
  if (config?.value !== "true") return "open";

  // هل المستخدم admin؟
  // getSession reads the local session (no extra network round-trip),
  // which is enough for a UX gate.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return "maintenance";

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return isAdminRole(profile?.role) ? "open" : "maintenance";
}

// Offline-first rule: this gate may only ever *add* a maintenance screen when
// it positively learns maintenance is on. Offline, slow, or erroring → "open".
// (This is a UX gate, not security — real protection must be Supabase RLS.)
async function checkAccess(): Promise<Access> {
  if (!navigator.onLine) return "open";

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Access>((resolve) => {
    timer = setTimeout(() => resolve("open"), CHECK_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fetchAccess(), timeout]);
  } catch {
    return "open";
  } finally {
    clearTimeout(timer);
  }
}

export default function MaintenanceGate(props: { children: any }) {
  const [access] = createResource(checkAccess);

  // صفحة /status عامة — لا تخضع لوضع الصيانة
  if (
    location.pathname.startsWith("/status") ||
    location.pathname.startsWith("/privacy")
  ) {
    return props.children;
  }

  return (
    <Show
      when={import.meta.env.DEV || access() === "open"}
      fallback={
        <Show when={access.loading} fallback={<MaintenanceScreen />}>
          <div class="fixed inset-0 flex items-center justify-center">
            <span>...</span>
          </div>
        </Show>
      }
    >
      {props.children}
    </Show>
  );
}

function MaintenanceScreen() {
  const [showSecret, setShowSecret] = createSignal(false);
  const login = useUser().login;
  const user = useUser().user;
  return (
    <div
      class="bg-rainbow-graident fixed z-[100] flex h-screen w-screen flex-col items-center justify-center gap-6 text-center"
      dir="rtl"
    >
      <div
        class="fixed top-0 left-0 h-8 w-8"
        on:dblclick={(e) => {
          e.stopPropagation();
          setShowSecret(true);
          login("google");
        }}
      ></div>
      <div class="dark:bg-main-dark bg-main-light flex flex-col items-center gap-4 rounded-2xl p-10 shadow-xl">
        <span style={{ "font-size": "48px" }}>🔧</span>
        <h1 class="text-2xl font-bold">الموقع قيد الصيانة</h1>
        <p class="text-sm opacity-60">نعمل على تحسين التطبيق، نعود قريباً!</p>
      </div>
    </div>
  );
}