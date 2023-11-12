import {
  DecorationOptions,
  Position,
  Range,
  TextEditor,
  TextEditorDecorationType,
  window,
} from "vscode";
import { getThemeResourcePath } from "../../code-util/codePaths";
import codeDecorationRegistry, {
  DecoTypeRegistry,
  DecorationEntry,
} from "../CodeDecorationRegistry";
import SourceTracker from "../../replay-api/sources/SourceTiles";
import { vscodeLineToReplayLine } from "../../code-util/rangeUtil";
import { editorSourceManager } from "./EditorSourceManager";

export function makeHitCountDeco(x: any) {
  return window.createTextEditorDecorationType({
    // borderWidth: '1px',
    // borderStyle: 'solid',
    // Note: The "overview ruler" is a color indicator inside the scrollbar
    // overviewRulerColor: 'blue',
    // overviewRulerLane: OverviewRulerLane.Right,
    // gutterIconPath: getResourcePath('replay-logo.png'),
    gutterIconPath: getThemeResourcePath("num", x + ".svg"),
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

  
  for (const range of editorSourceManager.getVisibleAndBreakableRanges(editor, maxLine)) {
    const result = sourceTracker.getHitCounts(range.start, range.end);
    // TODO: show load indicators
    if (!result) {
      continue;
    }
    for (const [i, entry] of result) {
      const decoEntry = {
        range: new Range(new Position(i, 1), new Position(i, 1)),
        hoverMessage: "hi!",
      } as DecorationOptions;

      const type = hitCountDecoRegistry.getOrCreate(entry.count);
      let decos = allDecos.get(type);
      if (!decos) {
        allDecos.set(type, (decos = []));
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
