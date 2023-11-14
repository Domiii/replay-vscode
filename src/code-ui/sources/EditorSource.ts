import { TextEditor, Uri, ViewColumn, window } from "vscode";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import { Source, sourcesCache } from "replay-next/src/suspense/SourcesCache";
import { editorSourceManager } from "./EditorSourceManager";
import SourceData, { ReplayLine } from "../../replay-api/sources/SourceData";
import EmptyArray from "../../util/EmptyArray";
import { vscodeLineToReplayLine } from "../../code-util/rangeUtil";
import {
  clearDecorations,
  updateSourceDecorations,
} from "./editorSourceDecorations";
import { Logger, newLogger } from "../../util/logging";
import { replaySessionManager } from "../../ReplaySessionManager";
import { UnsubscribeCallback } from "suspense";
import { editorManager } from "./EditorManager";

export type VSCodeLine = number;

export default class EditorSource extends SourceData {
  editorPath?: string;
  logger: Logger;
  unsubscribe?: UnsubscribeCallback;

  constructor(source: Source) {
    super(source);
    this.logger = newLogger(`EditorSource (${this.relativePath})`);
  }

  get relativePath() {
    return editorSourceManager.convertSourceUrlToRelativePath(
      this.source.url!
    )!;
  }

  get url() {
    return this.source.url!;
  }

  getEditor(): TextEditor | null {
    return this.editorPath
      ? editorManager.getEditorByEditorPath(this.editorPath)
      : null;
  }

  /** ###########################################################################
   * Init
   * ##########################################################################*/

  async init() {
    const focusRange = null;

    // Subscribe to hitCount updates.
    this.unsubscribe = sourceHitCountsCache.subscribe(
      async (e) => {
        try {
          /**
           * Hackfix: Our callback gets called before our promises
           * (in {@link SourceData.readHitCounts}) resolve.
           * Waiting for a tick solves this callback ordering problem.
           */
          await 0;

          // Re-render decorations.
          await this.decorateEditor();
        } catch (err) {
          this.logger.exception(err, "sourceHitCountsCache.subscribe failed");
        }
      },
      1,
      Infinity,
      replaySessionManager.client!,
      this.sourceId,
      focusRange
    );
  }

  dispose() {
    // Unsubscribe.
    this.unsubscribe?.();

    // Clear decorations.
    const editor = this.getEditor();
    if (editor) {
      clearDecorations(editor);
    }
  }

  /** ###########################################################################
   * Editor Decorations
   * ##########################################################################*/

  /**
   * TextEditor visibility changed.
   */
  async updateForEditor(textEditor: TextEditor) {
    const maxLine = await this.getOrFetchMaxLine();
    const hadEditor = !!this.editorPath;
    this.editorPath = textEditor.document.fileName;
    if (maxLine) {
      // Start reading hit counts.
      for (const range of this.getVisibleAndBreakableRanges(maxLine)) {
        this.readHitCountsTiled(range.start, range.end);
      }
    }

    this.decorateEditor();
  }

  /**
   *
   */
  private async decorateEditor() {
    const maxLine = await this.getOrFetchMaxLine();
    const textEditor = this.getEditor();
    if (!textEditor) {
      return;
    }

    if (maxLine) {
      // Update decorations.
      updateSourceDecorations(this, maxLine);
    }
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
    return textEditor.visibleRanges
      .map((range) => {
        const start = vscodeLineToReplayLine(range.start.line);
        const end = vscodeLineToReplayLine(range.end.line);
        if (start > maxLine) {
          return null;
        }
        return { start, end: Math.min(end, maxLine) };
      })
      .filter(Boolean) as { start: number; end: number }[];
  }

  /** ###########################################################################
   * Editor Events
   * ##########################################################################*/
}
