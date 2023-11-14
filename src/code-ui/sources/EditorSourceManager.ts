import { TextEditor, ViewColumn, window, workspace } from "vscode";
import { Source, sourcesCache } from "replay-next/src/suspense/SourcesCache";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import { pathNormalized } from "../../code-util/codePaths";
import { newLogger } from "../../util/logging";
import { replaySessionManager } from "../../ReplaySessionManager";
import EditorSource from "./EditorSource";
import { updateVisibleDecorationsPending } from "./editorSourceDecorations";

const {
  log,
  debug,
  warn,
  error: logError,
  exception: logException,
} = newLogger("EditorSourceManager");

// function pickPreferredColumn(column?: ViewColumn) {
//   if (!column) {
//     const openFile = window.activeTextEditor?.document?.fileName;
//     // Use naive heuristic: if active file is JS or TS file: Choose active column.
//     if (openFile?.endsWith(".js") || openFile?.endsWith(".ts")) {
//       column = window.activeTextEditor!.viewColumn || ViewColumn.One;
//     } else {
//       column = ViewColumn.One;
//     }
//   }
//   return column;
// }

export default class EditorSourceManager {
  editorSources: EditorSource[] = [];

  /**
   * Note: This will only ever be called once.
   */
  init() {
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
    }, replaySessionManager.client!);
  }
  
  async beforeStartSync() {
    // Reset all caches that we used.
    // TODO: hook into all caches and evict them automatically,
    // without having to list them here.
    sourcesCache.evictAll();
    sourceHitCountsCache.evictAll();

    // Debug settings.
    sourceHitCountsCache.enableDebugLogging();

    // Show all source lines as pending.
    updateVisibleDecorationsPending();
  }

  async startSync() {
    try {
      // Start fetching sources.
      await sourcesCache.readAsync(replaySessionManager.client!);
    } catch (err: unknown) {
      logException(err, "failed to start:");
    }
  }

  /**
   * Note: The returned promise of this function is going to be left dangling.
   */
  async handleNewSources(sources: Source[]) {
    await Promise.all(
      sources.map(async (source) => {
        try {
          if (source.url && !source.url.startsWith("record-replay")) {
            const textEditor = this.getEditorBySourceUrl(source.url);
            if (textEditor) {
              const editorSource = new EditorSource(
                source,
                textEditor.document.fileName
              );
              this.editorSources.push(editorSource);
              await editorSource.init();
            }
          }
        } catch (err) {
          logException(
            err,
            `handleNewSource failed for source at "${source.url}"`
          );
        }
      })
    );
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

  getEditorByEditorPath(editorPath: string): TextEditor | null {
    return (
      window.visibleTextEditors.find(
        (textEditor) => textEditor.document.uri.fsPath == editorPath
      ) || null
    );
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
