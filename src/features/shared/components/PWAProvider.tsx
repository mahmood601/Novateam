import InstallPrompt from "./pwa/InstallPrompt";
import ReloadPrompt from "./pwa/ReloadPrompt";

export default function PWAProvider() {
  return (
    <>
      <InstallPrompt />
      <ReloadPrompt />
    </>
  );
}