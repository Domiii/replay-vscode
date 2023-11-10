import { DecorationOptions, Position, Range, TextEditor, TextEditorDecorationType, window } from "vscode";
import { getThemeResourcePath } from "../code-util/codePaths";
import codeDecorationRegistry, { DecoTypeRegistry, DecorationEntry } from "./CodeDecorationRegistry";

export function makeHitCountDeco(x: any) {
  return window.createTextEditorDecorationType({
    // borderWidth: '1px',
    // borderStyle: 'solid',
    // Note: The "overview ruler" is a color indicator inside the scrollbar
    // overviewRulerColor: 'blue',
    // overviewRulerLane: OverviewRulerLane.Right,
    // gutterIconPath: getResourcePath('replay-logo.png'),
    gutterIconPath: getThemeResourcePath('num', x + '.svg'),
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

export function updateDecorations() {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  const allDecos = new Map<TextEditorDecorationType, DecorationOptions[]>();
  for (let i = 1; i <= 10; ++i) {
    const decoEntry = {
      // range: new Range(new Position(1, 7), new Position(1, 15)),
      range: new Range(new Position(i, 28), new Position(i, 28)),
      hoverMessage: 'hi!',
    } as DecorationOptions;
    
    const type = hitCountDecoRegistry.getOrCreate(i);
    let decos = allDecos.get(type);
    if (!decos) {
      allDecos.set(type, decos = []);
    }
    decos.push(decoEntry);
  }

  const editorRegistry = codeDecorationRegistry.getOrCreateEditorRegistry(editor);
  editorRegistry.clear();

  for (const [type, decos] of allDecos) {
    editorRegistry.getOrCreateDecos(type).setDecos(decos);
  }
}
