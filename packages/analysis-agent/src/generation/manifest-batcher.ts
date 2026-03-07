import type { RichManifestItem } from "../types/rich-schemas.js";
import type { BatchFile } from "../types/generation-types.js";

const MAX_FILES_PER_BATCH = 25; // Aumentado para densidade industrial

export class ManifestBatcher {
  public createBatches(manifest: RichManifestItem[]): BatchFile[][] {
    if (!manifest || manifest.length === 0) {
      return [];
    }

    const batches: BatchFile[][] = [];
    // Simplesmente agrupa em lotes de tamanho fixo
    for (let i = 0; i < manifest.length; i += MAX_FILES_PER_BATCH) {
      const batch = manifest.slice(i, i + MAX_FILES_PER_BATCH);
      batches.push(batch as BatchFile[]);
    }

    return batches;
  }
}
