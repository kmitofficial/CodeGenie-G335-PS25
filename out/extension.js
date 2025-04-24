"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const webviewPanel_1 = require("./webviewPanel");
// Debounce function to limit API calls
function debounce(func, waitFor) {
    let timeout;
    return (...args) => new Promise(resolve => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}
function activate(context) {
    console.log('CodeGenie is now active!');
    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    context.subscriptions.push(statusBarItem);
    let isProcessing = false;
    // Command to open the Webview Panel
    let startDisposable = vscode.commands.registerCommand('code-genie.start', () => {
        webviewPanel_1.WebviewPanel.createOrShow(context.extensionUri);
    });
    // Command to get code completion
    let completeDisposable = vscode.commands.registerCommand('code-genie.complete', () => {
        console.log("Command code-genie.complete executed.");
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            handleCompletion(editor);
        }
        else {
            console.log("No active text editor.");
        }
    });
    // Command for filling in the middle
    // let fillMiddleDisposable = vscode.commands.registerCommand('codegenie.fillInTheMiddle', async () => {
    //     const editor = vscode.window.activeTextEditor;
    //     if (!editor) {
    //         vscode.window.showInformationMessage("No active editor found.");
    //         return;
    //     }
    //     const document = editor.document;
    //     const selection = editor.selection;
    //     // Get selected text or text from the start to the cursor
    //     let text = selection.isEmpty
    //         ? document.getText(new vscode.Range(new vscode.Position(0, 0), selection.active))
    //         : document.getText(selection);
    //     // Show error if there's no text to work with
    //     if (!text.trim()) {
    //         vscode.window.showErrorMessage("No text selected or before cursor to fill.");
    //         return;
    //     }
    //     // Update status bar
    //     updateStatusBar("Generating middle fill...");
    //     // Get result from your custom middle-fill function
    //     const result = await getMiddleFill(text);
    //     // Insert result only if editor is still active and result is available
    //     if (result && editor === vscode.window.activeTextEditor) {
    //         editor.edit(editBuilder => {
    //             editBuilder.insert(selection.end, result);
    //         });
    //     }
    //     // Hide status bar
    //     hideStatusBar();
    // });
    //context.subscriptions.push(startDisposable, completeDisposable, fillMiddleDisposable);
    context.subscriptions.push(startDisposable, completeDisposable);
    // Status bar management functions
    function updateStatusBar(message) {
        statusBarItem.text = `$(sync~spin) ${message}`;
        statusBarItem.show();
    }
    function hideStatusBar() {
        statusBarItem.hide();
    }
    const debouncedCompletion = debounce(getCompletion, 750);
    async function getCompletion(text) {
        try {
            console.log("Sending text to API:", text);
            updateStatusBar("Generating completion...");
            const response = await (0, cross_fetch_1.default)('http://127.0.0.1:5000/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("API response:", data);
            if (data.error) {
                throw new Error(data.error);
            }
            return data.completion ?? '';
        }
        catch (error) {
            if (error instanceof Error) {
                console.error("API error:", error.message);
                throw new Error(`API error: ${error.message}`);
            }
            console.error("Unknown API error:", error);
            throw error;
        }
        finally {
            hideStatusBar();
        }
    }
    async function handleCompletion(editor) {
        if (isProcessing)
            return;
        try {
            isProcessing = true;
            updateStatusBar("Generating completion...");
            const document = editor.document;
            const selection = editor.selection;
            let text;
            if (!selection.isEmpty) {
                text = document.getText(selection);
                console.log("Selected text:", text);
            }
            else {
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
            }
            else {
                console.log("Editor or document changed, completion not inserted.");
            }
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(error.message);
                console.error("Completion error:", error.message);
            }
            else {
                console.error("Unknown completion error:", error);
            }
        }
        finally {
            isProcessing = false;
            hideStatusBar();
        }
    }
    // Ghost Suggestion Logic
    let isInsertingSuggestion = false;
    let currentSuggestion = '';
    const suggestionDecoration = vscode.window.createTextEditorDecorationType({
        after: {
            //color: '#6A9955',
            color: '#F8F8FF',
            fontStyle: 'italic',
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    async function showSuggestion(editor, suggestion) {
        if (!editor)
            return;
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
    function clearSuggestion(editor) {
        if (!editor)
            return;
        editor.setDecorations(suggestionDecoration, []);
        currentSuggestion = '';
    }
    const getGhostCompletion = debounce(async (text) => {
        try {
            // Show status bar for ghost completion
            updateStatusBar("Generating suggestion...");
            const res = await (0, cross_fetch_1.default)('http://127.0.0.1:5000/hf-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: text }),
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            return data.completion?.trim() || '';
        }
        catch (e) {
            console.error('Ghost completion error:', e);
            return '';
        }
        finally {
            // Hide status bar when done
            hideStatusBar();
        }
    }, 700);
    // Command to accept ghost suggestion
    context.subscriptions.push(vscode.commands.registerCommand('code-genie.acceptGhostSuggestion', () => {
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
    }));
    // Handle user typing (and ghost suggestion logic)
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document)
            return;
        // Skip suggestion if just inserted
        if (isInsertingSuggestion)
            return;
        const position = editor.selection.active;
        const text = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const suggestion = await getGhostCompletion(text);
        if (editor === vscode.window.activeTextEditor && suggestion) {
            currentSuggestion = suggestion;
            showSuggestion(editor, currentSuggestion);
        }
        else if (editor === vscode.window.activeTextEditor) {
            clearSuggestion(editor);
        }
    }));
    // let debounceTimer: NodeJS.Timeout | undefined;
    // let lastLineContent = "";
    // context.subscriptions.push(
    //     vscode.workspace.onDidChangeTextDocument(async (event) => {
    //         const editor = vscode.window.activeTextEditor;
    //         if (!editor || event.document !== editor.document) return;
    //         if (isInsertingSuggestion) return;
    //         const changes = event.contentChanges;
    //         const position = editor.selection.active;
    //         const line = editor.document.lineAt(position.line);
    //         const currentLineText = line.text;
    //         // Cancel suggestion if Enter was pressed
    //         if (changes.some(change => change.text.includes('\n'))) {
    //             clearSuggestion(editor);
    //             return;
    //         }
    //         // Only show suggestion if cursor is at end of the line
    //         if (position.character !== currentLineText.length) {
    //             clearSuggestion(editor);
    //             return;
    //         }
    //         // Don't suggest if line is empty
    //         if (currentLineText.trim() === "") {
    //             clearSuggestion(editor);
    //             return;
    //         }
    //         // Debounce logic to wait before fetching suggestion
    //         if (debounceTimer) clearTimeout(debounceTimer);
    //         debounceTimer = setTimeout(async () => {
    //             const newPosition = editor.selection.active;
    //             const updatedLineText = editor.document.lineAt(newPosition.line).text.trim();
    //             // If line hasn't changed, don't request again
    //             if (updatedLineText === lastLineContent) return;
    //             lastLineContent = updatedLineText;
    //             const textUptoCursor = editor.document.getText(
    //                 new vscode.Range(new vscode.Position(0, 0), newPosition)
    //             );
    //             const suggestion = await getGhostCompletion(textUptoCursor);
    //             if (editor === vscode.window.activeTextEditor && suggestion) {
    //                 currentSuggestion = suggestion;
    //                 showSuggestion(editor, currentSuggestion);
    //             } else if (editor === vscode.window.activeTextEditor) {
    //                 clearSuggestion(editor);
    //             }
    //         }, 400); // debounce delay
    //     })
    // );
    // Function to handle fill in the middle
    // async function getMiddleFill(text: string): Promise<string> { 
    //     try { 
    //         updateStatusBar("Generating middle fill...");
    //         const response = await fetch('http://127.0.0.1:5000/fill_in_the_middle', { 
    //             method: 'POST', 
    //             headers: { 'Content-Type': 'application/json' }, 
    //             body: JSON.stringify({ text }),
    //         });
    //         if (!response.ok) {
    //             throw new Error(`HTTP error! status: ${response.status}`);
    //         }
    //         const data = await response.json();
    //         if (data.error) {
    //             throw new Error(data.error);
    //         }
    //         return data.completion ?? '';
    //     } catch (error) {
    //         if (error instanceof Error) {
    //             vscode.window.showErrorMessage(`Fill-in-the-middle error: ${error.message}`);
    //             console.error("Fill-in-the-middle error:", error.message);
    //         } else {
    //             console.error("Unknown fill-in-the-middle error:", error);
    //         }
    //         return '';
    //     } finally {
    //         hideStatusBar();
    //     }
    // }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map