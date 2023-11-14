import {
  STATUS_NOT_FOUND,
  STATUS_PENDING,
  STATUS_RESOLVED,
  isPromiseLike,
} from "suspense";
import maxBy from "lodash/maxBy";
import { Source } from "replay-next/src/suspense/SourcesCache";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import { breakpointPositionsCache } from "replay-next/src/suspense/BreakpointPositionsCache";
import { replaySessionManager } from "../../ReplaySessionManager";
import { LineHitCounts } from "shared/client/types";

export const SourceTileSize = 4; // 100;

export type ReplayLine = number;

/**
 * Tile-based and batched source management of per-line data.
 * For now, this primarily tracks hit counts, but can be extended
 * to track other types of line data.
 */
export default class SourceData {
  source: Source;
  hitCountsByLine = new Map<ReplayLine, LineHitCounts>();

  constructor(source: Source) {
    this.source = source;
  }
  
  get sourceId() {
    return this.source.id;
  }

  private line2Tile(line: ReplayLine) {
    return Math.floor((line - 1) / SourceTileSize);
  }

  private getTileStartLine(tileIndex: number) {
    return tileIndex * SourceTileSize + 1;
  }

  private getTileEndLine(tileIndex: number) {
    return (tileIndex + 1) * SourceTileSize;
  }

  /** ###########################################################################
   * Data Queries
   * ##########################################################################*/

  async getOrFetchMaxLine(): Promise<ReplayLine | null> {
    const { sourceId } = this;
    const result = await breakpointPositionsCache.readAsync(
      replaySessionManager.client!,
      sourceId
    );
    return maxBy(result[0], (loc) => loc.line)?.line || null;
  }

  /**
   * Start querying this data.
   */
  readHitCountsTiled(lineFrom: ReplayLine, lineTo: ReplayLine) {
    const startTileIndex = this.line2Tile(lineFrom);
    const endTileIndex = this.line2Tile(lineTo);

    for (let i = startTileIndex; i <= endTileIndex; ++i) {
      // const tile = this.getTile(i);
      this.readHitCounts(
        this.getTileStartLine(i),
        this.getTileEndLine(i),
        true
      );
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
      replaySessionManager.client!,
      this.sourceId,
      null
      // focusRange ? toPointRange(focusRange) : null
    );
  }

  private readHitCounts(startLine: ReplayLine, endLine: ReplayLine, doRead: boolean) {
    const status = this.getStatus(startLine, endLine);

    if ((doRead && status == STATUS_NOT_FOUND) || status == STATUS_RESOLVED) {
      const result =
        sourceHitCountsCache.readAsync(
          startLine,
          endLine,
          replaySessionManager.client!,
          this.sourceId,
          null
          // focusRange ? toPointRange(focusRange) : null
        ) || null;

      if (isPromiseLike(result)) {
        result.then((entries) => {
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
