import { TextEditor, ViewColumn, window, workspace } from "vscode";
import maxBy from "lodash/maxBy";
import { breakpointPositionsCache } from "replay-next/src/suspense/BreakpointPositionsCache";
import { Source, sourcesCache } from "replay-next/src/suspense/SourcesCache";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import {
  pathNormalized,
} from "../../code-util/codePaths";
import { newLogger } from "../../util/logging";
import { replayLiveSyncManager } from "../../replay-api/ReplayLiveSyncManager";
import SourceTracker from "../../replay-api/sources/SourceTiles";
import { updateDecorations as updateEditorSourceDecorations } from "./editorSourceDecorations";
import { vscodeLineToReplayLine } from "../../code-util/rangeUtil";

const {
  log,
  debug,
  warn,
  error: logError,
  exception: logException,
} = newLogger("EditorSourceManager");

function pickPreferredColumn(column?: ViewColumn) {
  if (!column) {
    const openFile = window.activeTextEditor?.document?.fileName;
    // Use naive heuristic: if active file is JS or TS file: Choose active column.
    if (openFile?.endsWith(".js") || openFile?.endsWith(".ts")) {
      column = window.activeTextEditor!.viewColumn || ViewColumn.One;
    } else {
      column = ViewColumn.One;
    }
  }
  return column;
}

export default class EditorSourceManager {
  init() {
    // TODO: Track TextEditor callback subscriptions.
    // TODO: Remove decorations from TextEditors that had sources but don't anymore.
    // TODO: Subscribe to TextEditor visibility updates.
    // TODO: Subscribe to TextEditor line visibility updates.
    // TODO: Subscribe to hitCount updates.

    // Get source data.
    // We can assume that for one recording, this will only ever produce one
    // array of sources.
    sourcesCache.subscribe((e: any) => {
      try {
        const sources = e.value as Source[] | undefined;
        if (sources) {
          // Sources have come in!
          this.handleNewSources(sources);
        }
      } catch (err) {
        logException(err, "sourcesCache.subscribe failed");
      }
    }, replayLiveSyncManager.client!);
  }

  async handleNewSources(sources: Source[]) {
    for (const source of sources) {
      if (source.url && !source.url.startsWith("record-replay")) {
        const textEditor = this.getEditorBySourceUrl(source.url);
        if (textEditor) {
          this.handleNewEditor(source, textEditor);
        }
      }
    }
  }

  async getMaxLine(sourceId: string) {
    const status = breakpointPositionsCache.getStatus(replayLiveSyncManager.client!, sourceId);
    const result = await breakpointPositionsCache.readAsync(replayLiveSyncManager.client!, sourceId);
    return maxBy(result[0], loc => loc.line)?.line;
  }

  /**
   * NOTE: We need this because either the caches or the protocol are VERY
   * finicky. Things will not resolve, if the requested range is outside
   * of the breakable range.
   */
  getVisibleAndBreakableRanges(textEditor: TextEditor, maxLine: number) {
    return textEditor.visibleRanges.map(range => {
      const start = vscodeLineToReplayLine(range.start.line);
      const end = vscodeLineToReplayLine(range.end.line);
      if (start > maxLine) {
        return null;
      }
      return { start, end: Math.min(end, maxLine) };
    }).filter(Boolean) as { start: number, end: number }[];
  }

  async handleNewEditor(source: Source, textEditor: TextEditor) {
    const focusRange = null;

    // TODO: track the trackers
    // TODO: handle unsubscribe callback
    //    -> unsubscribe with tracker
    //    -> add as disposable to context
    // TODO: track SyncManager status
    
    const sourceTracker = new SourceTracker(source.sourceId);

    // TODO: move maxLine logic to sourceTracker
    const maxLine = await this.getMaxLine(source.sourceId);
    if (!maxLine) {
      return;
    }

    const unsubscribe = sourceHitCountsCache.subscribe(
      async (e) => {
        log(`sourceHits`, e);
        try {
          // Hackfix: Our promise handlers are registered after their promise handlers, so we'll give it an extra tick to come around.
          await 0;
          updateEditorSourceDecorations(sourceTracker, textEditor, maxLine);
        } catch (err) {
          logException(err, "sourceHitCountsCache.subscribe failed");
        }
      },
      1,
      maxLine,
      replayLiveSyncManager.client!,
      source.sourceId,
      focusRange
    );
    for (const range of this.getVisibleAndBreakableRanges(textEditor, maxLine)) {
      sourceTracker.readHitCountsTiled(range.start, range.end);
    }
  }

  getEditorBySourceUrl(url: string): TextEditor | null {
    const relativePath = this.convertSourceUrlToRelativePath(url);
    if (!relativePath) {
      return null;
    }
    return this.getEditorByRelativePath(relativePath);
  }

  getEditorByRelativePath(relativePath: string): TextEditor | null {
    return (
      window.visibleTextEditors.find((textEditor) =>
        pathNormalized(textEditor.document.uri.fsPath).endsWith(relativePath)
      ) || null
    );
    // return window.showTextDocument(
    //   Uri.file(editorPath),
    //   {
    //     viewColumn: pickPreferredColumn()
    //   }
    // );
  }

  getSource(textEditor: TextEditor) {
    // textEditor.document.
    // window.showTextDocument(uri, column);
  }

  // getSourceByEditorPath(editorPath: string) {
  //   const relativePath = this.convertEditorPathToRelativePath(editorPath);
  //   return relativePath ? this.getSourceByRelativePath(relativePath) : null;
  // }

  // getSourceByRelativePath(relativePath: string) {
  //   return this.sourcesByRelativePath.get(relativePath) || null;
  // }

  // getSourceBySourceUrl(url: string) {
  //   const relativePath = this.convertSourceUrlToRelativePath(url);
  //   return relativePath ? this.getSourceByRelativePath(relativePath) : null;
  // }

  convertSourceUrlToRelativePath(url: string) {
    // TODO: Allow configuration etc.
    try {
      return new URL(url).pathname;
    } catch (err) {
      // Invalid URL. Could be one of our own internal URLs.
      return null;
    }
  }

  // convertEditorPathToRelativePath(editorPath: string) {
  //   // TODO: test this on windows
  //   // TODO: Allow configuration
  //   // NOTE: There is a good chance that sourcemapped files are relative
  //   // to `root/src`, and original files relative to `root/dist` etc.
  //   try {
  //     const pathOnly = new URL(editorPath).pathname;
  //     return pathRelative(TODO, pathOnly);
  //   } catch (err) {
  //     warn(`Could not parse editor path "${editorPath}" -`, err);
  //     // Invalid URL. Weird.
  //     return null;
  //   }
  // }
}

export const editorSourceManager = new EditorSourceManager();

export function initEditorSourceManager() {
  editorSourceManager.init();
}
