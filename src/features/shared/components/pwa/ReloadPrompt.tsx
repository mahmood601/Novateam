import type { Component } from "solid-js";
import { createEffect, createSignal, on, Show } from "solid-js";
import { useRegisterSW } from "virtual:pwa-register/solid";
import toast from "solid-toast";
import { CircleCheck, RefreshCw, X } from "lucide-solid";

// A fixed id means "only ever one update toast on screen": if the effect
// fires twice, solid-toast updates the existing toast instead of stacking a new one.
const UPDATE_TOAST_ID = "sw-update";

const ReloadPrompt: Component = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log(`Service Worker at: ${swUrl}`);
      if (!r) return;

      // WHY THIS EXISTS: the browser only looks for a new service worker
      // when a page is *loaded* (and on register()). A PWA that students keep
      // open in the app switcher for days is never reloaded, so a new deploy
      // was never even detected → needRefresh stayed false → no toast.
      // (Tested in a real browser: after a deploy, nothing happens until
      // registration.update() is called.)
      // So we ask the browser to check ourselves: whenever the app comes
      // back to the foreground, when the connection returns, and hourly.
      const MIN_GAP_MS = 5 * 60 * 1000; // don't hammer the server on tab switches
      let lastCheck = 0;
      const checkForUpdate = () => {
        const now = Date.now();
        if (!navigator.onLine || now - lastCheck < MIN_GAP_MS) return;
        lastCheck = now;
        r.update().catch(() => {
          /* offline or server hiccup — the next trigger will retry */
        });
      };

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("online", checkForUpdate);
      setInterval(checkForUpdate, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  // Lives at component level so the toast's button can read/write it.
  const [updating, setUpdating] = createSignal(false);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      // Activates the waiting service worker, then reloads the page.
      await updateServiceWorker(true);
    } catch (err) {
      console.error("SW update failed", err);
      setUpdating(false);
    }
  };

  const handleLater = () => {
    toast.dismiss(UPDATE_TOAST_ID);
    setNeedRefresh(false);
    // Not lost: the new version stays "waiting", so the toast comes back
    // on the next launch of the app.
  };

  const showUpdateToast = () => {
    toast.custom(
      (t) => (
        <div
          dir="rtl"
          class="bg-main-light dark:bg-lighter-dark-1 text-main-dark w-[min(92vw,22rem)] rounded-2xl border border-black/10 p-4 shadow-xl transition-all duration-300 dark:border-white/10 dark:text-white"
          classList={{
            "translate-y-0 opacity-100": t.visible,
            "translate-y-2 opacity-0": !t.visible,
          }}
        >
          <div class="flex items-start gap-3">
            <div class="bg-main/15 text-main flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <RefreshCw size={20} classList={{ "animate-spin": updating() }} />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-bold">تحديث جديد متاح</p>
              <p class="mt-0.5 text-sm opacity-70">
                نسخة أحدث من نوفا جاهزة. حدّث الآن لتحصل على آخر التحسينات.
              </p>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              class="bg-main flex-1 rounded-xl px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-60"
              disabled={updating()}
              onClick={handleUpdate}
            >
              {updating() ? "جاري التحديث..." : "تحديث الآن"}
            </button>
            <Show when={!updating()}>
              <button
                class="rounded-xl bg-black/5 px-4 py-2 font-semibold transition active:scale-95 dark:bg-white/10"
                onClick={handleLater}
              >
                لاحقاً
              </button>
            </Show>
          </div>
        </div>
      ),
      {
        id: UPDATE_TOAST_ID,
        // Stay until the user decides. The old 6s auto-dismiss meant a
        // student who looked away simply never saw the update offer.
        duration: Infinity,
        position: "bottom-center",
      },
    );
  };

  const showOfflineReadyToast = () => {
    toast.custom(
      (t) => (
        <div
          dir="rtl"
          class="bg-main-light dark:bg-lighter-dark-1 text-main-dark flex items-center gap-3 rounded-2xl border border-black/10 py-3 ps-4 pe-2 shadow-xl transition-all duration-300 dark:border-white/10 dark:text-white"
          classList={{
            "translate-y-0 opacity-100": t.visible,
            "translate-y-2 opacity-0": !t.visible,
          }}
        >
          <CircleCheck size={22} class="text-true shrink-0" />
          <p class="text-sm font-semibold">
            التطبيق أصبح متاحاً بدون اتصال بالإنترنت 🎉
          </p>
          <button
            aria-label="إغلاق"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-60 transition hover:bg-black/5 active:scale-90 dark:hover:bg-white/10"
            onClick={() => toast.dismiss(t.id)}
          >
            <X size={16} />
          </button>
        </div>
      ),
      // Short-lived: it's only a confirmation, not something to act on.
      { duration: 3000, position: "bottom-center" },
    );
  };

  // Two separate effects: each toast reacts only to its own signal, so one
  // can no longer re-trigger the other (the old single effect did).
  createEffect(
    on(needRefresh, (needed) => {
      if (needed) showUpdateToast();
    }),
  );

  createEffect(
    on(offlineReady, (ready) => {
      if (ready) {
        showOfflineReadyToast();
        setOfflineReady(false);
      }
    }),
  );

  return <></>;
};

export default ReloadPrompt;