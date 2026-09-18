// Cache-first caching for lecture images (Cache Storage API, not Dexie —
// images are blobs, not JSON rows). Applied after `innerHTML` injection:
// LectureContent swaps each <img src> for its cached object URL.

const CACHE_NAME = "lecture-images-v1";

export async function getCachedImageURL(url: string): Promise<string> {
  if (!("caches" in window)) return url;

  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }

    const response = await fetch(url);
    if (!response.ok) return url;

    await cache.put(url, response.clone());
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    // Offline / storage error — fall back to the original (network) URL
    // rather than breaking the image.
    return url;
  }
}

// Walks a rendered lecture container's <img> tags and swaps each src for
// its cached object URL. Call once, right after innerHTML injection.
export async function cacheLectureImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const original = img.getAttribute("src");
      if (!original) return;
      img.src = await getCachedImageURL(original);
    }),
  );
}

export async function clearLectureImageCache(): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    return await caches.delete(CACHE_NAME);
  } catch {
    return false;
  }
}
