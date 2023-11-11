import { ExtensionContext } from "vscode";

let currentExtensionContext: ExtensionContext | null = null;

export function initCurrentContext(_context: ExtensionContext) {
  currentExtensionContext = _context;
}

export default () => {
  if (!currentExtensionContext) {
    throw new Error(`currentExtensionContext has not yet been initialized.`);
  }
  return currentExtensionContext;
};
