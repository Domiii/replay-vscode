import { TextEditor, Uri, ViewColumn, window } from "vscode";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import { Source, sourcesCache } from "replay-next/src/suspense/SourcesCache";
import { editorSourceManager } from "./EditorSourceManager";
import SourceData, { ReplayLine } from "../../replay-api/sources/SourceData";
import EmptyArray from "../../util/EmptyArray";
import { vscodeLineToReplayLine } from "../../code-util/rangeUtil";
import { updateSourceDecorations } from "./editorSourceDecorations";
import { Logger, newLogger } from "../../util/logging";
import { replayLiveSyncManager } from "../../replay-api/ReplayLiveSyncManager";

export type VSCodeLine = number;

export default class EditorSource extends SourceData {
  editorPath: string;
  logger: Logger;

  constructor(source: Source, editorPath: string) {
    super(source);
    this.editorPath = editorPath;
    this.logger = newLogger(`EditorSource (${editorPath})`);
  }

  getEditor(): TextEditor | null {
    return editorSourceManager.getEditorByEditorPath(this.editorPath);
  }

  /** ###########################################################################
   * Init
   * ##########################################################################*/

  async init() {
    const focusRange = null;

    // TODO: Track TextEditor callback subscriptions.
    // TODO: Remove decorations from TextEditors that had sources but don't anymore.

    // TODO: Subscribe to TextEditor visibility updates & 
    //        subscribe to TextEditor line visibility updates:
    //    -> onDidChangeVisibleTextEditors
    //    -> onDidChangeTextEditorVisibleRanges

    // TODO: Subscribe to hitCount updates.
    // TODO: track the trackers
    // TODO: handle unsubscribe callback
    //    -> unsubscribe with tracker
    //    -> add as disposable to context
    // TODO: track SyncManager status:
    //    -> make sure to update editor decos on sync on/off

    const maxLine = await this.getOrFetchMaxLine();
    if (!maxLine) {
      return;
    }

    const unsubscribe = sourceHitCountsCache.subscribe(
      async (e) => {
        try {
          // Hackfix: Our promise handlers are registered after their promise handlers, so we'll give it an extra tick to come around.
          await 0;
          updateSourceDecorations(this, maxLine);
        } catch (err) {
          this.logger.exception(err, "sourceHitCountsCache.subscribe failed");
        }
      },
      1,
      maxLine,
      replayLiveSyncManager.client!,
      this.sourceId,
      focusRange
    );
    for (const range of this.getVisibleAndBreakableRanges(
      maxLine
    )) {
      this.readHitCountsTiled(range.start, range.end);
    }

    // Update initially (after starting to read though).
    updateSourceDecorations(this, maxLine);
  }

  /** ###########################################################################
   * Editor Management
   * ##########################################################################*/

  /**
   * We need this because either the caches or the protocol are rather
   * finicky. Things will not resolve, if the requested range is outside
   * of the breakable range.
   * NOTE2: This will return Replay line numbers.
   */
  getVisibleAndBreakableRanges(maxLine: ReplayLine = Infinity) {
    const textEditor = this.getEditor();
    if (!textEditor) {
      return EmptyArray;
    }
    return textEditor.visibleRanges.map(range => {
      const start = vscodeLineToReplayLine(range.start.line);
      const end = vscodeLineToReplayLine(range.end.line);
      if (start > maxLine) {
        return null;
      }
      return { start, end: Math.min(end, maxLine) };
    }).filter(Boolean) as { start: number, end: number }[];
  }
}
