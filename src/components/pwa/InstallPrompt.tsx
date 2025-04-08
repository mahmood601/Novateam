import { createSignal, onMount } from "solid-js";
import { setInstallPromptVisible } from "../../stores/installPromptState";
import toast from "solid-toast";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = createSignal<Event | null>(null);
  const [showInstall, setShowInstall] = createSignal(false);

  onMount(() => {
    window.addEventListener("beforeinstallprompt", (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallPromptVisible(true);
      if (!localStorage.getItem("want-install")) {
        showInstallToast();
      }
    });

    window.addEventListener("appinstalled", () => {
      console.log("PWA installed");
      setShowInstall(false);
      setInstallPromptVisible(false);
    });
  });

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt() as any;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install: ${outcome}`);
    setShowInstall(false);
    setDeferredPrompt(null);
  };

  const showInstallToast = () => {
    toast.custom((t) => (
      <div class="special-box rounded-md px-4 py-2">
        <p class="mb-2">هل ترغب بتثبيت التطبيق؟</p>
        <div class="flex justify-evenly">
          <button
            onClick={() => {
              handleInstallClick();
              toast.dismiss(t.id);
            }}
            class="bg-main rounded-md px-3 py-1 font-semibold"
          >
            تثبيت
          </button>
          <button
            onClick={() => {
              localStorage.setItem("want-install", JSON.stringify(false));
              setInstallPromptVisible(false);
              setShowInstall(false);
              toast.dismiss(t.id);
            }}
            class="bg-main rounded-md px-3 py-1 font-semibold"
          >
            لا اريد
          </button>
        </div>
      </div>
    ), {duration: 6000, position: "bottom-right"});
  };

  return <></>;
}
