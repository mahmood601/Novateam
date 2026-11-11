import {
  defaultAssetName,
  defineConfig,
  minimal2023Preset as preset,
  type AssetType,
  type ResolvedAssetSize,
} from "@vite-pwa/assets-generator/config";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: {
    ...preset,
    assetName: (type: AssetType, size: ResolvedAssetSize) =>
      defaultAssetName(type, size).replace(".png", "-v2.png"),
  },
  images: ["public/nova.png"],
});
