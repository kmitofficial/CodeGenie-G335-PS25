import * as vscode from 'vscode';
import * as path from 'path';

interface CodeSelection {
    text: string;
    uri: vscode.Uri;
    fileName: string;
    range: vscode.Range;
}

export class MultiSelectManager {
    private _selections: CodeSelection[] = [];
    private _statusBarItem: vscode.StatusBarItem;
    private _decorationType: vscode.TextEditorDecorationType;
    private _serverUrl: string = '';

    constructor(context: vscode.ExtensionContext) {
        console.log('Initializing MultiSelectManager');
        
        // Create status bar item to show selection count
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this._statusBarItem.text = "$(list-selection) Code Selections: 0";
        this._statusBarItem.tooltip = "Click to view or manage your code selections";
        this._statusBarItem.command = 'codegenie.viewSelections';
        context.subscriptions.push(this._statusBarItem);
        this._statusBarItem.show();

        // Create decoration type for selected code
        this._decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.selectionHighlightBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editorInfo.foreground'),
            overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });

        // Register event to update decorations when editor changes
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(this.updateDecorations.bind(this))
        );
    }

    // Set server URL for API calls
    setServerUrl(url: string) {
        console.log(`MultiSelectManager: Setting server URL to ${url}`);
        this._serverUrl = url;
    }

    // Add current selection to the list
    async addSelection() {
        console.log('MultiSelectManager: addSelection called');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor");
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage("No text selected");
            return;
        }

        const text = editor.document.getText(selection);
        const fileName = path.basename(editor.document.fileName);
        
        this._selections.push({
            text,
            uri: editor.document.uri,
            fileName,
            range: selection
        });

        console.log(`MultiSelectManager: Added selection from ${fileName}, total selections: ${this._selections.length}`);
        this.updateStatusBar();
        this.updateDecorations();
        
        vscode.window.showInformationMessage(`Added selection from ${fileName}`);
    }

    // Clear all selections
    clearSelections() {
        console.log('MultiSelectManager: clearSelections called');
        this._selections = [];
        this.updateStatusBar();
        this.updateDecorations();
        vscode.window.showInformationMessage("All code selections cleared");
    }

    // View all current selections in a new editor
    async viewSelections() {
        console.log('MultiSelectManager: viewSelections called');
        if (this._selections.length === 0) {
            vscode.window.showInformationMessage("No code selections to display");
            return;
        }

        const doc = await vscode.workspace.openTextDocument({
            content: this._selections.map((s, index) => 
                `// Selection ${index + 1} from file: ${s.fileName}\n${s.text}\n\n`
            ).join('// ---------------\n')
        });

        await vscode.window.showTextDocument(doc);
    }

    // Analyze all selected code blocks with an API call
    async analyzeSelections() {
        console.log('MultiSelectManager: analyzeSelections called');
        if (this._selections.length === 0) {
            vscode.window.showWarningMessage("No code selections to analyze");
            return;
        }

        if (!this._serverUrl) {
            vscode.window.showErrorMessage("Server URL not set. Please connect to CodeGenie server first.");
            return;
        }

        try {
            console.log(`MultiSelectManager: Analyzing ${this._selections.length} selections using server URL: ${this._serverUrl}`);
            
            // Create output channel
            const outputChannel = vscode.window.createOutputChannel('CodeGenie Analysis');
            outputChannel.show();
            outputChannel.appendLine('--- Starting Multi-Selection Analysis ---');

            // Show progress notification
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing code selections...",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Sending to server..." });

                console.log('MultiSelectManager: Sending analysis request to server');
                const response = await fetch(`${this._serverUrl}/analyze_multi`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selections: this._selections.map(s => ({
                            fileName: s.fileName,
                            text: s.text
                        }))
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('MultiSelectManager: Received analysis result');
                
                // Display results
                outputChannel.appendLine('--- Analysis Results ---\n');
                outputChannel.appendLine(result.analysis || "No analysis returned");
                
                // Show completion message
                vscode.window.showInformationMessage('Multi-selection analysis completed! Results in output panel.');
            });
        }
        catch (error) {
            console.error('MultiSelectManager: Analysis error:', error);
            vscode.window.showErrorMessage(`Analysis error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Update status bar with current selection count
    private updateStatusBar() {
        this._statusBarItem.text = `$(list-selection) Code Selections: ${this._selections.length}`;
        this._statusBarItem.show();
    }

    // Update decorations in all visible editors
    private updateDecorations() {
        console.log(`MultiSelectManager: Updating decorations for ${this._selections.length} selections`);
        
        // Clear all decorations first
        vscode.window.visibleTextEditors.forEach(editor => {
            editor.setDecorations(this._decorationType, []);
        });
        
        // If no selections, we're done
        if (this._selections.length === 0) {
            return;
        }
        
        // Apply decorations to each editor where we have selections
        vscode.window.visibleTextEditors.forEach(editor => {
            const decorations: vscode.DecorationOptions[] = [];
            
            // Find all selections for this editor
            const editorSelections = this._selections.filter(s => 
                s.uri.toString() === editor.document.uri.toString()
            );
            
            // Create decoration for each selection
            editorSelections.forEach(selection => {
                decorations.push({
                    range: selection.range,
                    hoverMessage: `Selection #${this._selections.indexOf(selection) + 1} in ${selection.fileName}`
                });
            });
            
            // Apply decorations
            if (decorations.length > 0) {
                console.log(`MultiSelectManager: Applying ${decorations.length} decorations in ${editor.document.fileName}`);
                editor.setDecorations(this._decorationType, decorations);
            }
        });
    }
}