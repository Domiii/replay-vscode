// Some bootstrap hacks.
import "./bootstrap";

import * as vscode from 'vscode';
import { initCurrentContext } from "./code-util/currentContext";
import { initRecordingsView } from "./views/RecordingsView";
import { initCommands } from "./commands";
import { initLogging } from "./code-util/logging";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Set context singleton.
	initCurrentContext(context);

	// Init all the things.
	initLogging();
	initCommands();
	initRecordingsView();
}

// This method is called when your extension is deactivated
export function deactivate() {}
