import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Site tamamen statik üretiliyor (ISR/revalidate yok). Önceden üretilmiş sayfalar
// Workers statik varlıklarından okunur; R2, KV, kuyruk gerekmez.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
