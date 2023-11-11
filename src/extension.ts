// Some bootstrap hacks.
import "./bootstrap";

import * as vscode from 'vscode';
import { updateDecorations } from './decorations';
import { registerCommand } from "./code-util/registerCommand";
import { initCurrentContext } from "./code-util/currentContext";
import { initRecordingsView } from "./views/RecordingsView";
import { initCommands } from "./commands";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	initCurrentContext(context);

	// Init commands.
	initCommands();

	// Init the views.
	initRecordingsView();
}

// This method is called when your extension is deactivated
export function deactivate() {}
