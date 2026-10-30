import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { setInstallPromptVisible } from "../../../quizzes/stores/stores/installPromptState";
import { useUser } from "../../context/user";
import toast from "solid-toast";
import { Download, X } from "lucide-solid";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALL_TOAST_ID = "pwa-install";
const SNOOZE_KEY = "install-snooze-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // ask again after 14 days
const SHOW_DELAY_MS = 45 * 1000; // let the user use the app first
const PUBLIC_PATHS = ["/landing", "/login", "/privacy"];

const isSnoozed = () => {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
};

const snooze = () => {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* storage blocked — not fatal */
  }
};

export default function InstallPrompt() {
  const { user } = useUser();
  const [deferredPrompt, setDeferredPrompt] =
    createSignal<BeforeInstallPromptEvent | null>(null);
  let shown = false;

  onMount(() => {
    // The old permanent "don't ask again" flag is replaced by a timed snooze.
    try {
      localStorage.removeItem("want-install");
    } catch {
      /* ignore */
    }

    // Must be registered immediately: the browser fires this event early.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallPromptVisible(true);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstallPromptVisible(false);
      toast.dismiss(INSTALL_TOAST_ID);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    onCleanup(() => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    });
  });

  // Show the card only for a signed-in user, away from public pages, after a delay.
  createEffect(() => {
    if (!deferredPrompt() || !user() || shown || isSnoozed()) return;

    const started = Date.now();
    const gate = setInterval(() => {
      if (Date.now() - started < SHOW_DELAY_MS) return;
      if (PUBLIC_PATHS.includes(location.pathname)) return;
      clearInterval(gate);
      shown = true;
      showInstallToast();
    }, 5000);
    onCleanup(() => clearInterval(gate));
  });

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt();
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (error) {
      console.error("Install failed:", error);
    } finally {
      setDeferredPrompt(null);
      setInstallPromptVisible(false);
    }
  };

  const showInstallToast = () => {
    toast.custom(
      (t) => {
        const dismiss = () => {
          snooze();
          toast.dismiss(t.id);
        };
        return (
          <div
            dir="rtl"
            class="bg-main-light dark:bg-lighter-dark-1 text-main-dark relative w-[min(92vw,22rem)] rounded-2xl border border-black/10 p-4 shadow-xl transition-all duration-300 dark:border-white/10 dark:text-white"
            classList={{
              "translate-y-0 opacity-100": t.visible,
              "translate-y-2 opacity-0": !t.visible,
            }}
          >
            <button
              aria-label="إغلاق"
              class="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full opacity-60 transition hover:bg-black/5 active:scale-90 dark:hover:bg-white/10"
              onClick={dismiss}
            >
              <X size={16} />
            </button>

            <div class="flex items-center gap-3">
              <img
                src="/icons/192.png"
                alt=""
                class="h-12 w-12 shrink-0 rounded-xl shadow"
              />
              <div class="min-w-0 flex-1 ps-1">
                <p class="font-bold">ثبّت تطبيق نوفا</p>
                <p class="mt-0.5 text-sm opacity-70">
                  وصول أسرع من شاشتك الرئيسية، ويعمل بدون إنترنت.
                </p>
              </div>
            </div>

            <div class="mt-4 flex gap-2">
              <button
                class="bg-main flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-white transition active:scale-95"
                onClick={() => {
                  toast.dismiss(t.id);
                  void handleInstallClick();
                }}
              >
                <Download size={18} />
                تثبيت
              </button>
              <button
                class="rounded-xl bg-black/5 px-4 py-2 font-semibold transition active:scale-95 dark:bg-white/10"
                onClick={dismiss}
              >
                لاحقاً
              </button>
            </div>
          </div>
        );
      },
      { id: INSTALL_TOAST_ID, duration: 12_000, position: "bottom-center" },
    );
  };

  return <></>;
}
