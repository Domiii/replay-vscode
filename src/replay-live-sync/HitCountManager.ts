import { toPointRange } from "shared/utils/time";
import { replayLiveSyncManager } from "./ReplayLiveSyncManager";
import { logException, newLogger } from "../util/logging";
import { inspect } from "util";

const { log, debug, warn, error: logError } = newLogger('HitCountManager');

export default class HitCountManager {
  constructor() { }

  async _onStartSync() {
    try {
      await hitCountManager.runExperiment();
    }
    catch (err: unknown) {
      logException(err, "failed to start:");
    }
  }

  async runExperiment() {
    // Get sources and hit counts.

    /* @ts-ignore */
    const { sourcesCache } = await import("replay-next/src/suspense/SourcesCache");
    sourcesCache.evictAll();
    sourcesCache.enableDebugLogging();

    log(`reading sources...`);
    const sources = await sourcesCache.readAsync(
      replayLiveSyncManager.client
    );

    log(`sources:`, inspect(sources));
    
    /* @ts-ignore */
    const { sourceHitCountsCache } = await import("replay-next/src/suspense/SourceHitCountsCache");
    sourceHitCountsCache.evictAll();
    sourceHitCountsCache.enableDebugLogging();

    const startLine = 0;
    const endLine = 10;
    const focusRange = null;
    const hitCounts = await sourceHitCountsCache.readAsync(
      startLine,
      endLine,
      replayLiveSyncManager.client,
      sources[0].sourceId,
      focusRange ? toPointRange(focusRange) : null
    );

    log(`hitCounts:`, inspect(hitCounts));
  }
}


export const hitCountManager = new HitCountManager();

export function initHitCountManager() {
  replayLiveSyncManager.events.addListener("startSync", hitCountManager._onStartSync);
}
