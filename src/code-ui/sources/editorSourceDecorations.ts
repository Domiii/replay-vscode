import {
  DecorationOptions,
  Position,
  Range,
  TextEditor,
  TextEditorDecorationType,
  window,
} from "vscode";
import {
  getResourcePath,
  getThemeResourcePath,
} from "../../code-util/codePaths";
import codeDecorationRegistry, {
  DecoTypeRegistry,
} from "../CodeDecorationRegistry";
import { replayLineToVSCodeLine } from "../../code-util/rangeUtil";
import EditorSource from "./EditorSource";

let pendingDecoType: TextEditorDecorationType;
let countDecoTypes = new Map<number, TextEditorDecorationType>();

function getOrCreatePendingHitCountDeco() {
  return (
    pendingDecoType ||
    (pendingDecoType = window.createTextEditorDecorationType({
      gutterIconPath: getResourcePath("pending.svg"),
      gutterIconSize: "100%",
    }))
  );
}

function getOrCreateHitCountDeco(x: any) {
  if (x == "?") {
    return getOrCreatePendingHitCountDeco();
  }
  // TODO: Handle all numbers
  let decoType = countDecoTypes.get(x);
  if (!decoType) {
    countDecoTypes.set(
      x,
      (decoType = window.createTextEditorDecorationType({
        // borderWidth: '1px',
        // borderStyle: 'solid',
        // Note: The "overview ruler" is a color indicator inside the scrollbar
        // overviewRulerColor: 'blue',
        // overviewRulerLane: OverviewRulerLane.Right,
        // gutterIconPath: getResourcePath('replay-logo.png'),
        gutterIconPath: getResourcePath("num", x + ".svg"),
        gutterIconSize: "100%",
        // after: {
        //   contentText: x + "",
        //   color: "orange",
        //   border: "1px solid yellow",
        //   backgroundColor: "darkblue"
        // },
        // light: {
        //   // this color will be used in light color themes
        //   borderColor: 'lightred'
        // },
        // dark: {
        //   // this color will be used in dark color themes
        //   borderColor: 'darkred'
        // }
      }))
    );
  }
  return decoType;
}

const hitCountDecoRegistry = new DecoTypeRegistry(getOrCreateHitCountDeco);

/**
 * Show a pending state in all visible editors.
 */
export function updateVisibleDecorationsPending() {
  clearAllDecorations();
  for (const editor of window.visibleTextEditors) {
    const editorRegistry =
      codeDecorationRegistry.getOrCreateEditorRegistry(editor);
    const editorLines = new Set<number>();
    for (const range of editor.visibleRanges) {
      for (let i = range.start.line; i <= range.end.line; ++i) {
        editorLines.add(i);
      }
    }
    editorRegistry.getOrCreateDecos(getOrCreatePendingHitCountDeco()).setDecos(
      Array.from(editorLines).map((line) => ({
        range: new Range(new Position(line, 1), new Position(line, 1)),
        hoverMessage: "pending...",
      }))
    );
  }
}

export function clearAllDecorations() {
  for (const editor of window.visibleTextEditors) {
    const editorRegistry =
      codeDecorationRegistry.getOrCreateEditorRegistry(editor);
    editorRegistry.clear();
  }
}

export function updateSourceDecorations(
  editorSource: EditorSource,
  maxLine: number
) {
  const editor = editorSource.getEditor();
  if (!editor) {
    // TODO: Check if we need to
    return;
  }

  const allDecos = new Map<TextEditorDecorationType, DecorationOptions[]>();
  const editorRegistry =
    codeDecorationRegistry.getOrCreateEditorRegistry(editor);
  editorRegistry.clear();

  for (const range of editorSource.getVisibleAndBreakableRanges(maxLine)) {
    for (let replayLine = range.start; replayLine <= range.end; ++replayLine) {
      const editorLine = replayLineToVSCodeLine(replayLine);
      const pending = editorSource.isPending(replayLine);
      let count: any;
      let decoType: TextEditorDecorationType;
      if (pending) {
        count = "?";
      } else {
        count = editorSource.getHitCount(replayLine);
      }
      decoType = hitCountDecoRegistry.getOrCreate(count);
      const decoEntry = {
        range: new Range(
          new Position(editorLine, 1),
          new Position(editorLine, 1)
        ),
        hoverMessage: count + "",
      };

      let decos = allDecos.get(decoType);
      if (!decos) {
        allDecos.set(decoType, (decos = []));
      }
      decos.push(decoEntry);
    }
  }

  for (const [type, decos] of allDecos) {
    editorRegistry.getOrCreateDecos(type).setDecos(decos);
  }
}
