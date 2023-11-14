import { TextEditor, ViewColumn, window, workspace } from "vscode";
import { Source, sourcesCache } from "replay-next/src/suspense/SourcesCache";
import { sourceHitCountsCache } from "replay-next/src/suspense/SourceHitCountsCache";
import { pathNormalized, pathRelative } from "../../code-util/codePaths";
import { newLogger } from "../../util/logging";
import { replaySessionManager } from "../../ReplaySessionManager";
import EditorSource from "./EditorSource";
import {
  clearDecorationsForAllEditorsExcept,
  setAllDecorationsPending,
} from "./editorSourceDecorations";
import { UnsubscribeCallback } from "suspense";
import currentExtensionContext from "../../code-util/currentExtensionContext";
import { editorManager } from "./EditorManager";

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
  editorSourcesByEditorPath = new Map<string, EditorSource>();
  unsubscribe?: UnsubscribeCallback;

  /**
   * Note: This will only ever be called once.
   */
  init() {}

  /** ###########################################################################
   * Sync Start + Stop
   * ##########################################################################*/

  async beforeStartSync() {
    // Reset all caches that we used.
    // TODO: hook into all caches and evict them automatically,
    // without having to list them here.
    sourcesCache.evictAll();
    sourceHitCountsCache.evictAll();

    // Enable debug settings.
    sourceHitCountsCache.enableDebugLogging();

    this.setAllEditorsPending();

    // Get source data.
    // We can assume that for one recording, this will only ever produce one
    // array of sources.
    this.unsubscribe = sourcesCache.subscribe((e: any) => {
      try {
        const sources = e.value as Source[] | undefined;
        if (sources) {
          // Sources have come in!
          this.handleSourcesUpdate(sources);
        }
      } catch (err) {
        logException(err, "sourcesCache.subscribe failed");
      }
    }, replaySessionManager.client!);
  }

  async startSync() {
    window.onDidChangeVisibleTextEditors(
      (editors) => {
        Promise.all(
          editors.map(async (editor) => {
            try {
              await this.handleEditorVisibilityUpdate(editor);
            } catch (err) {
              logException(
                err,
                `handleEditorVisibilityUpdate failed during onDidChangeVisibleTextEditors for file "${
                  editor.document.fileName || ""
                }"`
              );
            }
          })
        );
      },
      null,
      currentExtensionContext().subscriptions
    );
    window.onDidChangeTextEditorVisibleRanges(
      async ({ textEditor: editor, visibleRanges }) => {
        try {
          await this.handleEditorVisibilityUpdate(editor);
        } catch (err) {
          logException(
            err,
            `handleEditorVisibilityUpdate failed during onDidChangeVisibleTextEditors for file "${
              editor.document.fileName || ""
            }"`
          );
        }
      },
      null,
      currentExtensionContext().subscriptions
    );
    try {
      // Start fetching sources.
      await sourcesCache.readAsync(replaySessionManager.client!);
    } catch (err: unknown) {
      logException(err, "failed to start:");
    }
  }

  async stopSync() {
    // Unsubscribe.
    this.unsubscribe?.();

    // Clear EditorSources.
    this.editorSources.forEach((s) => {
      s.dispose();
    });
    this.editorSources.splice(0, this.editorSources.length);
  }

  /** ###########################################################################
   * Event Handling.
   * ##########################################################################*/

  /**
   * New sources have been fetched.
   * Note: The returned promise of this function is going to be left dangling.
   */
  async handleSourcesUpdate(sources: Source[]) {
    // Init EditorSource objects.
    for (const source of sources) {
      if (
        source.url &&
        !source.url.startsWith("record-replay") &&
        !!this.convertSourceUrlToRelativePath(source.url)
      ) {
        const editorSource = new EditorSource(source);
        this.editorSources.push(editorSource);
        editorSource.init();
      }
    }

    // Start fetching hitCounts.
    await Promise.all(
      this.editorSources.flatMap(async (editorSource) => {
        try {
          const textEditor = this.getEditorBySourceUrl(editorSource.url);
          if (textEditor) {
            editorSource.updateForEditor(textEditor);
          }
          await editorSource.waitUntilAllPendingReadsFinished();
        } catch (err) {
          logException(
            err,
            `EditorSource.init failed for source at "${editorSource.relativePath}"`
          );
        }
      })
    );

    // Initial hitCount fetching has finished.
    // Remove "pending decorations" from editors that don't have sources.
    const editorsWithSources = this.getAllEditorsWithSources();
    clearDecorationsForAllEditorsExcept(editorsWithSources);
  }

  /**
   * Editor is now visible and was not before, or its visible ranges changed.
   */
  async handleEditorVisibilityUpdate(textEditor: TextEditor) {
    const editorSource = this.getEditorSourceByEditorPath(
      textEditor.document.fileName
    );
    if (editorSource) {
      console.assert(
        editorSource.getEditor() == textEditor,
        "editorSource.getEditor() == textEditor"
      );
      await editorSource.updateForEditor(textEditor);
      this.editorSourcesByEditorPath.set(
        textEditor.document.fileName,
        editorSource
      );
    }
  }

  /**
   * We call this when starting sync.
   */
  private setAllEditorsPending() {
    // Show all source lines as pending.
    setAllDecorationsPending();
  }

  /** ###########################################################################
   * Look up paths, TextEditors and Sources.
   * ##########################################################################*/

  getAllEditorsWithSources() {
    return this.editorSources
    .flatMap((s) => s.getEditor())
    .filter(Boolean) as TextEditor[];
  }

  getEditorSourceByEditorPath(editorPath: string): EditorSource | null {
    editorPath = pathNormalized(editorPath);
    return (
      this.editorSources.find((editorSource) =>
        editorPath.endsWith(editorSource.relativePath)
      ) || null
    );
  }

  getEditorBySourceUrl(url: string): TextEditor | null {
    const relativePath = this.convertSourceUrlToRelativePath(url);
    if (!relativePath) {
      return null;
    }
    return editorManager.getEditorByRelativePath(relativePath);
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
