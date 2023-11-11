// Some bootstrap hacks.
import "./bootstrap";

import * as vscode from 'vscode';
import { updateDecorations } from './decorations';
import { initCodePaths } from './code-util/codePaths';
import { runExperiment } from './replay-analysis';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('replay-vscode.helloWorld', () => {
		initCodePaths(context);
		updateDecorations();

		runExperiment();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
