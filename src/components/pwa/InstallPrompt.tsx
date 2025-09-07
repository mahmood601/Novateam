import { createSignal, onMount } from "solid-js";
import { setInstallPromptVisible } from "../../stores/installPromptState";
import toast from "solid-toast";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);

  onMount(() => {
    const beforeInstallPromptListener = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallPromptVisible(true);
      if (!localStorage.getItem("want-install")) {
        showInstallToast();
      }
    };

    const appInstalledListener = () => {
      console.log("PWA installed");
      setInstallPromptVisible(false);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallPromptListener);
    window.addEventListener("appinstalled", appInstalledListener);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallPromptListener);
      window.removeEventListener("appinstalled", appInstalledListener);
    };
  });

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt();
    if (!promptEvent) {
      console.warn("No install prompt available");
      return;
    }

    try {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      console.log("User choice:", choiceResult.outcome);
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
        const handleInstall = () => {
          handleInstallClick();
          toast.dismiss(t.id);
        };

        const handleDismiss = () => {
          localStorage.setItem("want-install", "true");
          setInstallPromptVisible(false);
          toast.dismiss(t.id);
        };

        return (
          <div class="special-box rounded-md px-4 py-2">
            <p class="mb-2">هل ترغب بتثبيت التطبيق؟</p>
            <div class="flex justify-evenly">
              <button class="bg-main rounded-md px-3 py-1 font-semibold" onClick={handleInstall}>
                تثبيت
              </button>
              <button class="bg-main rounded-md px-3 py-1 font-semibold" onClick={handleDismiss}>
                لا اريد
              </button>
            </div>
          </div>
        );
      },
      { duration: 6000, position: "bottom-right" }
    );
  };

  return <></>;
}