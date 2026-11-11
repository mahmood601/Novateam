import {
  defaultAssetName,
  defineConfig,
  minimal2023Preset as preset,
  type AssetType,
  type ResolvedAssetSize,
} from "@vite-pwa/assets-generator/config";

const VERSION = "v3";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: {
    ...preset,
    transparent: { ...preset.transparent, padding: 0 },
    apple: { ...preset.apple, padding: 0 },
    assetName: (type: AssetType, size: ResolvedAssetSize) =>
      defaultAssetName(type, size).replace(/\.png$/, `-${VERSION}.png`),
  },
  images: ["public/nova.svg"],
});