import { STATUS_NOT_FOUND, STATUS_PENDING, STATUS_RESOLVED, isPromiseLike } from "suspense";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import { replayLiveSyncManager } from "../ReplayLiveSyncManager";
import { LineHitCounts } from "shared/client/types";

export const SourceTileSize = 4; // 100;

/**
 * Tile-based and batched source management of per-line data.
 * For now, this primarily tracks hit counts, but can be extended
 * to track other types of line data.
 */
export default class SourceTracker {
  sourceId: string;
  hitCountsByLine = new Map<number, LineHitCounts>();

  constructor(sourceId: string) {
    this.sourceId = sourceId;
  }

  private line2Tile(line: number) {
    return Math.floor((line - 1) / SourceTileSize);
  }

  private getTileStartLine(tileIndex: number) {
    return (tileIndex * SourceTileSize) + 1;
  }

  private getTileEndLine(tileIndex: number) {
    return ((tileIndex + 1) * SourceTileSize);
  }

  readHitCountsTiled(lineFrom: number, lineTo: number) {
    const startTileIndex = this.line2Tile(lineFrom);
    const endTileIndex = this.line2Tile(lineTo);

    for (let i = startTileIndex; i <= endTileIndex; ++i) {
      // const tile = this.getTile(i);
      this.readHitCounts(this.getTileStartLine(i), this.getTileEndLine(i), true);
    }
  }

  // NOTE: This does not work, seemingly because `metadata.recordMap` in the cache is never updated.
  // getHitCounts(startLine: number, endLine: number) {
  //   if (startLine < 1 || endLine < startLine) {
  //     throw new Error(`Invalid line range: ${startLine}-${endLine}`);
  //   }
  //   return this.readHitCounts(startLine, endLine, false) as [number, LineHitCounts][] | null;
  // }

  isPending(line: number) {
    const status = this.getStatus(line, line);
    return status == STATUS_PENDING;
  }

  getHitCount(line: number) {
    return this.hitCountsByLine.get(line)?.count;
  }

  getStatus(startLine: number, endLine: number) {
    return sourceHitCountsCache.getStatus(
      startLine,
      endLine,
      replayLiveSyncManager.client!,
      this.sourceId,
      null
      // focusRange ? toPointRange(focusRange) : null
    );
  }

  private readHitCounts(startLine: number, endLine: number, doRead: boolean) {
    const status = this.getStatus(startLine, endLine);

    if ((doRead && status == STATUS_NOT_FOUND) || status == STATUS_RESOLVED) {
      const result = sourceHitCountsCache.readAsync(
        startLine,
        endLine,
        replayLiveSyncManager.client!,
        this.sourceId,
        null
        // focusRange ? toPointRange(focusRange) : null
      ) || null;

      if (isPromiseLike(result)) {
        (result).then((entries) => {
          // Store result separately, because there is a bug where 
          // we never get the data back otherwise.
          for (const [line, hitCount] of entries) {
            this.hitCountsByLine.set(line, hitCount);
          }
        });
      }
    }
    return null;
  }
}
