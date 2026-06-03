import { createResource, Show } from "solid-js";
import { supabase } from "../services/supabase";

async function checkAccess() {
  // هل الصيانة مفعلة؟
  const { data: config } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "maintenance_mode")
    .single();

  if (config?.value !== "true") return "open";

  // هل المستخدم admin؟
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "maintenance";

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" && config?.value == "true" ? "open" : "maintenance";
}

export default function MaintenanceGate(props: { children: any }) {
  const [access] = createResource(checkAccess);

  return (
    <Show
      when={access() === "open"}
      fallback={
        <Show
          when={access.loading}
          fallback={<MaintenanceScreen />}
        >
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
  return (
    <div
      class="bg-rainbow-graident fixed z-[100] flex h-screen w-screen flex-col items-center justify-center gap-6 text-center"
      dir="rtl"
    >
      <div class="dark:bg-main-dark bg-main-light flex flex-col items-center gap-4 rounded-2xl p-10 shadow-xl">
        <span style={{ "font-size": "48px" }}>🔧</span>
        <h1 class="text-2xl font-bold">الموقع قيد الصيانة</h1>
        <p class="text-sm opacity-60">
          نعمل على تحسين التطبيق، نعود قريباً!
        </p>
      </div>
    </div>
  );
}
