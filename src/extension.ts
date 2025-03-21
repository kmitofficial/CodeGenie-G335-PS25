
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "code-genie" is now active!');
	const disposable = vscode.commands.registerCommand('code-genie.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from code_genie!');
	});

	context.subscriptions.push(disposable);
}
export function deactivate() {}
