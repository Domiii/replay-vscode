import {
  DecorationOptions,
  Position,
  Range,
  TextEditor,
  TextEditorDecorationType,
  window,
} from "vscode";
import { getResourcePath, getThemeResourcePath } from "../../code-util/codePaths";
import codeDecorationRegistry, {
  DecoTypeRegistry,
  DecorationEntry,
} from "../CodeDecorationRegistry";
import SourceTracker from "../../replay-api/sources/SourceTiles";
import {
  replayLineToVSCodeLine,
  vscodeLineToReplayLine,
} from "../../code-util/rangeUtil";
import { editorSourceManager } from "./EditorSourceManager";

function makePendingHitCountDeco() {
  return window.createTextEditorDecorationType({
    gutterIconPath: getResourcePath("pending.svg"),
    gutterIconSize: "100%",
  });
}

function makeHitCountDeco(x: any) {
  if (x == "?") {
    return makePendingHitCountDeco();
  }
  // TODO: Handle all numbers
  return window.createTextEditorDecorationType({
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
  });
}

const hitCountDecoRegistry = new DecoTypeRegistry(makeHitCountDeco);

export function updateDecorations(
  sourceTracker: SourceTracker,
  editor: TextEditor,
  maxLine: number
) {
  const allDecos = new Map<TextEditorDecorationType, DecorationOptions[]>();

  for (const range of editorSourceManager.getVisibleAndBreakableRanges(
    editor,
    maxLine
  )) {
    for (let replayLine = range.start; replayLine <= range.end; ++replayLine) {
      const editorLine = replayLineToVSCodeLine(replayLine);
      const pending = sourceTracker.isPending(replayLine);
      let count: any;
      let decoType: TextEditorDecorationType;
      if (pending) {
        count = "?";
      } else {
        count = sourceTracker.getHitCount(replayLine);
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

  const editorRegistry =
    codeDecorationRegistry.getOrCreateEditorRegistry(editor);
  editorRegistry.clear();

  for (const [type, decos] of allDecos) {
    editorRegistry.getOrCreateDecos(type).setDecos(decos);
  }
}
