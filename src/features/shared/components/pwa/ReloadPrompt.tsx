import type { Component } from "solid-js";
import { createEffect, Show } from "solid-js";
import { useRegisterSW } from "virtual:pwa-register/solid";
import { installPromptVisible } from "../../../quizzes/stores/stores/installPromptState";
import toast from "solid-toast";

const ReloadPrompt: Component = () => {
  // replaced dynamically
  const reloadSW = "__RELOAD_SW__";
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log(`Service Worker at: ${swUrl}`);
      // @ts-expect-error just ignore
      if (reloadSW === "true") {
        r &&
          setInterval(() => {
            console.log("Checking for sw update");
            r.update();
          }, 20000 /* 20s for testing purposes */);
      } else {
        console.log(`SW Registered: ${r}`);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });



  const showToast = () => {
    toast.custom((t) => (
      <div class="special-box rounded-md p-4 text-right">
        <p dir="rtl" class="mb-2">
          {offlineReady()
            ? "التطبيق اصبح متاحا بدون اتصال بالانترنت 🎉"
            : "تحديث جديد, اضغط على تحديث ليتم تنزيله 🔥"
            }
        </p>
        <div class="flex w-full justify-evenly">
          <Show when={needRefresh()}>
            <button
              class="bg-main rounded-md px-3 py-1 font-semibold"
              onClick={() =>{ updateServiceWorker(false)
                setNeedRefresh(false)
                toast.dismiss(t.id)
              }}
            >
               تحديث
            </button>
          </Show>
          <button
            class="bg-main rounded-md px-3 py-1 font-semibold"
            onClick={() => {
              toast.dismiss(t.id)
            }}
          >
            اغلاق
          </button>
        </div>
      </div>
    ), {duration: 6000, position: "bottom-right"});
  };

createEffect(()=>{
  if (offlineReady() || needRefresh()) {
    showToast()
  }
})

  return <></>
};

export default ReloadPrompt;
