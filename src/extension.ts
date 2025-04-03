import * as vscode from 'vscode';
import { WebviewPanel } from './webviewPanel';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('codeGenie.start', () => {
        WebviewPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
