import {
  DecorationOptions,
  DecorationRenderOptions,
  Range,
  TextEditor,
  TextEditorDecorationType,
  window
} from 'vscode';
import pull from 'lodash/pull';
import EmptyArray from '../util/EmptyArray';

// NOTE: There is some weird bug where we cannot use the type that the VSCode API itself has defined.
// export type DecorationEntry = readonly Range[] | readonly DecorationOptions[];
export type DecorationEntry = any;


// ###########################################################################
// CodeDecoRegistration
// ###########################################################################

export class CodeDecoRegistration {
  unsubscribe?: () => void;
  editorDecorationType: TextEditorDecorationType;

  constructor(editorDecorationType: TextEditorDecorationType) {
    this.editorDecorationType = editorDecorationType;
  }

  unsetDeco() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  setDeco(editor: TextEditor, deco: DecorationEntry) {
    this.unsetDeco();

    // eslint-disable-next-line no-use-before-define
    this.unsubscribe = codeDecorationRegistry.addDeco(editor, this.editorDecorationType, deco);
  }

  setDecos(editor: TextEditor, decos: DecorationEntry[]) {
    this.unsetDeco();

    // eslint-disable-next-line no-use-before-define
    this.unsubscribe = codeDecorationRegistry.setDecos(editor, this.editorDecorationType, decos);
  }
}

// ###########################################################################
// EditorDecorations
// ###########################################################################

export class EditorTypeDecorations {
  editorDecorationType: TextEditorDecorationType;
  editorRegistry: CodeDecorationEditorRegistry;
  decorations: DecorationEntry[] = [];

  /**
   * @param {TextEditorDecorationType} editorDecorationType 
   */
  constructor(editorRegistry: CodeDecorationEditorRegistry, editorDecorationType: TextEditorDecorationType) {
    this.editorRegistry = editorRegistry;
    this.editorDecorationType = editorDecorationType;
  }

  addDeco(deco: DecorationEntry) {
    this.decorations.push(deco);
    this.render();

    return () => {
      this.removeDeco(deco);
    };
  }

  setDecos(decos: DecorationEntry[]) {
    this.decorations = decos;
    this.render();

    return () => {
      this.decorations = [];
      this.render();
    };
  }

  removeDeco(deco: DecorationEntry) {
    pull(this.decorations, deco);
    this.render();
  }

  render() {
    this.editorRegistry.editor.setDecorations(
      this.editorDecorationType,
      // Weird TS bug.
      this.decorations as any
    );
  }
}

export class CodeDecorationEditorRegistry {
  editor: TextEditor;
  entries = new Map<TextEditorDecorationType, EditorTypeDecorations>;

  constructor(editor: TextEditor)  {
    this.editor = editor;
  }
  
  getOrCreateDecos(type: TextEditorDecorationType) {
    let decos = this.entries.get(type);
    if (!decos) {
      this.entries.set(type, decos = new EditorTypeDecorations(this, type));
    }
    return decos;
  }

  clear() {
    for (const type of this.entries.keys()) {
      this.editor.setDecorations(type, EmptyArray);
    }
    this.entries.clear();
  }
}

/** ###########################################################################
 * {@link CodeDecorationRegistry}
 * ##########################################################################*/

export class CodeDecorationRegistry {
  editorRegistries = new Map<TextEditor, CodeDecorationEditorRegistry>();

  getOrCreateEditorRegistry(editor: TextEditor) {
    let editorEntry = this.editorRegistries.get(editor);
    if (!editorEntry) {
      this.editorRegistries.set(editor, editorEntry = new CodeDecorationEditorRegistry(editor));
    }
    return editorEntry;
  }

  getOrCreateDecos(editor: TextEditor, editorDecorationType: TextEditorDecorationType) {
    return this.getOrCreateEditorRegistry(editor).getOrCreateDecos(editorDecorationType);
  }

  /**
   * @param {any} deco 
   * 
   * @returns {Function} Callback that will remove the deco again when executed.
   */
  addDeco(editor: TextEditor, editorDecorationType: TextEditorDecorationType, deco: DecorationEntry) {
    const decos = this.getOrCreateDecos(editor, editorDecorationType);
    return decos.addDeco(deco);
  }
  
  /**
   * @param {[]} decos
   * 
   * @returns {Function} Callback that will remove the deco again when executed.
   */
  setDecos(editor: TextEditor, editorDecorationType: TextEditorDecorationType, newDecos: DecorationEntry[]) {
    const decos = this.getOrCreateDecos(editor, editorDecorationType);
    return decos.setDecos(newDecos);
  }

  removeDeco(editor: TextEditor, editorDecorationType: TextEditorDecorationType, deco: DecorationEntry) {
    const decos = this.getOrCreateDecos(editor, editorDecorationType);
    decos.removeDeco(deco);
  }

  /**
   * Use this if you only want a single decoration that you want to easily remove/replace or move.
   * This is most useful for highlighting "the currently selected" of something.
   */
  registerDeco(decoStyle: DecorationRenderOptions) {
    const decoType = window.createTextEditorDecorationType(decoStyle);
    return new CodeDecoRegistration(decoType);
  }
}


export class DecoTypeRegistry<T> {
  private create: (x: T) => TextEditorDecorationType;
  private decoTypes = new Map<T, TextEditorDecorationType>();

  constructor(create: (x: T) => TextEditorDecorationType) {
    this.create = create;
  }

  getOrCreate(x: T) {
    let entry = this.decoTypes.get(x);
    if (!entry) {
      this.decoTypes.set(x, entry = this.create(x));
    }
    return entry;
  }
}


const codeDecorationRegistry = new CodeDecorationRegistry();

export default codeDecorationRegistry;

