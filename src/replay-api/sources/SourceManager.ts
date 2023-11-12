import { sourcesCache } from "replay-next/src/suspense/SourcesCache";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import { replayLiveSyncManager } from "../ReplayLiveSyncManager";
import { newLogger } from "../../util/logging";
import { EventEmitter } from "tseep";

const { log, debug, warn, error: logError, exception: logException } = newLogger("SourceManager");

export default class SourceManager {
  constructor() {}

  async startSync() {
    try {
      // Reset all caches that we used.
      // TODO: hook into all caches and evict them automatically,
      // without having to list them here.
      // sourcesCache.evictAll();
      // sourceHitCountsCache.evictAll();

      sourceHitCountsCache.enableDebugLogging();

      // Get all sources.
      await sourcesCache.readAsync(replayLiveSyncManager.client!);
    } catch (err: unknown) {
      logException(err, "failed to start:");
    }
  }
}

export const sourceManager = new SourceManager();
