// Some bootstrap hacks.
import "./bootstrap";

import * as vscode from 'vscode';
import { updateDecorations } from './decorations';
import { registerCommand } from "./code-util/commands";
import { initCurrentContext } from "./code-util/currentContext";
import { initRecordingsView } from "./views/RecordingsView";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	initCurrentContext(context);

	// Init the views.
	initRecordingsView();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = registerCommand('replay-vscode.helloWorld', () => {
		updateDecorations();

		
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
