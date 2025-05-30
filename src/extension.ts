import * as vscode from 'vscode';
import fetch from 'cross-fetch';
import { WebviewPanel } from './webviewPanel';

interface ApiResponse {
    completion?: string;
    error?: string;
}

// Debounce function to limit API calls
function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
): (...args: Parameters<F>) => Promise<ReturnType<F>> {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => resolve(func(...args)), waitFor);
        });
}

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeGenie is now active!');

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    context.subscriptions.push(statusBarItem);
    
    let isProcessing = false;

    // Command to open the Webview Panel
    let startDisposable = vscode.commands.registerCommand('code-genie.start', () => {
        WebviewPanel.createOrShow(context.extensionUri);
    });

    // Command to get code completion
    let completeDisposable = vscode.commands.registerCommand('code-genie.complete', () => {
        console.log("Command codegenie.complete executed.");
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            handleCompletion(editor);
        } else {
            console.log("No active text editor.");
        }
    });

    // Command to optimize code
    vscode.commands.registerCommand('codegenie.optimize', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found');
            return;
        }
    
        try {
            // Show progress notification
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Optimizing your code...",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Analyzing code..." });
    
                const originalCode = editor.document.getText();
    
                // Making a POST request using fetch
                const response = await fetch('http://127.0.0.1:5000/optimize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: originalCode,
                        type: 'optimize'
                    })
                });
    
                if (!response.ok) {
                    vscode.window.showErrorMessage(`Failed to optimize code: ${response.statusText}`);
                    return;
                }
    
                const data = await response.json();
                const optimizedCode = data.completion;
    
                if (!optimizedCode) {
                    vscode.window.showErrorMessage('No optimized code returned from the server');
                    return;
                }
    
                progress.report({ message: "Optimization complete" });
    
                // Show apply confirmation
                const selection = await vscode.window.showInformationMessage(
                    "Code optimization complete. Apply changes?",
                    { modal: true },
                    "Apply", "Cancel"
                );
    
                if (selection === "Apply") {
                    progress.report({ message: "Applying changes..." });
    
                    // Apply the optimized code
                    await editor.edit((editBuilder) => {
                        const fullRange = new vscode.Range(
                            editor.document.positionAt(0),
                            editor.document.positionAt(originalCode.length)
                        );
                        editBuilder.replace(fullRange, optimizedCode);
                    });
    
                    vscode.window.showInformationMessage("Optimized code applied successfully!");
                }
            });
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to optimize code: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('Failed to optimize code: An unknown error occurred.');
            }
            console.error('Optimization error:', error);
        }
    });
    
    context.subscriptions.push(startDisposable, completeDisposable);

    // Command for filling in the middle
    let fillMiddleDisposable = vscode.commands.registerCommand('code-genie.fillInTheMiddle', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found.");
            return;
        }
        
        const document = editor.document;
        const selection = editor.selection;
        
        // Get selected text or text from the start to the cursor
        let text = selection.isEmpty
            ? document.getText(new vscode.Range(new vscode.Position(0, 0), selection.active))
            : document.getText(selection);
        
        // Show error if there's no text to work with
        if (!text.trim()) {
            vscode.window.showErrorMessage("No text selected or before cursor to fill.");
            return;
        }
        
        // Update status bar
        updateStatusBar("Generating middle fill...");
        
        // Get result from your custom middle-fill function
        const result = await getMiddleFill(text);
        
        // Insert result only if editor is still active and result is available
        if (result && editor === vscode.window.activeTextEditor) {
            editor.edit(editBuilder => {
                editBuilder.insert(selection.end, result);
            });
        }
        
        // Hide status bar
        hideStatusBar();
    });

    context.subscriptions.push(startDisposable, completeDisposable, fillMiddleDisposable);

    // Status bar management functions
    function updateStatusBar(message: string) {
        statusBarItem.text = `$(sync~spin) ${message}`;
        statusBarItem.show();
    }
    
    function hideStatusBar() {
        statusBarItem.hide();
    }

    const debouncedCompletion = debounce(getCompletion, 750);

    async function getCompletion(text: string): Promise<string> {
        try {
            console.log("Sending text to API:", text);
            updateStatusBar("Generating completion...");
            
            const response = await fetch('http://127.0.0.1:5000/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as ApiResponse;
            console.log("API response:", data);

            if (data.error) {
                throw new Error(data.error);
            }

            return data.completion ?? '';
        } catch (error) {
            if (error instanceof Error) {
                console.error("API error:", error.message);
                throw new Error(`API error: ${error.message}`);
            }
            console.error("Unknown API error:", error);
            throw error;
        } finally {
            hideStatusBar();
        }
    }

    async function handleCompletion(editor: vscode.TextEditor) {
        if (isProcessing) return;

        try {
            isProcessing = true;
            updateStatusBar("Generating completion...");

            const document = editor.document;
            const selection = editor.selection;

            let text: string;
            if (!selection.isEmpty) {
                text = document.getText(selection);
                console.log("Selected text:", text);
            } else {
                text = document.getText(new vscode.Range(new vscode.Position(0, 0), selection.active));
                console.log("Text up to cursor:", text);
            }

            if (!text.trim()) {
                throw new Error("No text found for completion.");
            }

            const completion = await debouncedCompletion(text);

            if (editor === vscode.window.activeTextEditor && document === editor.document) {
                await editor.edit(editBuilder => {
                    editBuilder.insert(selection.end, completion);
                    console.log("Completion inserted:", completion);
                });
            } else {
                console.log("Editor or document changed, completion not inserted.");
            }
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(error.message);
                console.error("Completion error:", error.message);
            } else {
                console.error("Unknown completion error:", error);
            }
        } finally {
            isProcessing = false;
            hideStatusBar();
        }
    }

    // Ghost Suggestion Logic
    let isInsertingSuggestion = false;
    let currentSuggestion = '';
    const suggestionDecoration = vscode.window.createTextEditorDecorationType({
        after: {
            color : '#C6C6CA',
            fontStyle: 'italic',
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    async function showSuggestion(editor: vscode.TextEditor, suggestion: string) {
        if (!editor) return;
        
        const position = editor.selection.active;
        const decoration = {
            range: new vscode.Range(position, position),
            renderOptions: {
                after: {
                    contentText: suggestion,
                },
            },
        };
        editor.setDecorations(suggestionDecoration, [decoration]);
    }

    function clearSuggestion(editor: vscode.TextEditor | undefined) {
        if (!editor) return;
        editor.setDecorations(suggestionDecoration, []);
        currentSuggestion = '';
    }

    const getGhostCompletion = debounce(async (text: string): Promise<string> => {
        try {
            // Show status bar for ghost completion
            updateStatusBar("Generating suggestion...");
            
            const res = await fetch('http://127.0.0.1:5000/hf-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: text }),
            });
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            return data.completion?.trim() || '';
        } catch (e) {
            console.error('Ghost completion error:', e);
            return '';
        } finally {
            // Hide status bar when done
            hideStatusBar();
        }
    }, 700);

    // Command to accept ghost suggestion
    context.subscriptions.push(
        vscode.commands.registerCommand('code-genie.acceptGhostSuggestion', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && currentSuggestion) {
                isInsertingSuggestion = true;
                editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, currentSuggestion);
                }).then(() => {
                    clearSuggestion(editor);
                    isInsertingSuggestion = false;
                });
                
            }
        })
    );

    // Handle user typing (and ghost suggestion logic)
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || event.document !== editor.document) return;

            // Skip suggestion if just inserted
            if (isInsertingSuggestion) return;

            const position = editor.selection.active;
            const text = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), position));

            const suggestion = await getGhostCompletion(text);
            if (editor === vscode.window.activeTextEditor && suggestion) {
                currentSuggestion = suggestion;
                showSuggestion(editor, currentSuggestion);
            } else if (editor === vscode.window.activeTextEditor) {
                clearSuggestion(editor);
            }
        })
    );

    // Function to handle fill in the middle
    async function getMiddleFill(text: string): Promise<string> { 
        try { 
            updateStatusBar("Generating middle fill...");
            
            const response = await fetch('http://127.0.0.1:5000/fill_in_the_middle', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ text }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data.completion ?? '';
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Fill-in-the-middle error: ${error.message}`);
                console.error("Fill-in-the-middle error:", error.message);
            } else {
                console.error("Unknown fill-in-the-middle error:", error);
            }
            return '';
        } finally {
            hideStatusBar();
        }
    }
}

export function deactivate() {}