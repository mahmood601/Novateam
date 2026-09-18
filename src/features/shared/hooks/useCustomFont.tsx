import { createSignal, onMount } from "solid-js";
import {
  getCustomFont,
  saveCustomFont,
  removeCustomFont,
  getCachedFontName,
} from "../services/local/customFont";

export function useCustomFont() {
  const [fontName, setFontName] = createSignal<string | null>(
    getCachedFontName(),
  );
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    const record = await getCustomFont();
    setFontName(record?.name ?? null);
  });

  async function uploadFont(file: File) {
    setError(null);
    setIsSaving(true);
    const res = await saveCustomFont(file);
    setIsSaving(false);

    if (!res.ok) {
      setError(res.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setFontName(res.name ?? file.name);
  }

  async function resetFont() {
    setIsSaving(true);
    await removeCustomFont();
    setIsSaving(false);
    setFontName(null);
  }

  return { fontName, isSaving, error, uploadFont, resetFont };
}
