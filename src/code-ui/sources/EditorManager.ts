import { window, TextEditor } from "vscode";
import { pathNormalized } from "../../code-util/codePaths";

export default class EditorManager {
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

  isEditorVisible(editor: TextEditor) {
    return window.visibleTextEditors.find(e => e.document.fileName == editor.document.fileName);
  }
}

export const editorManager = new EditorManager();
