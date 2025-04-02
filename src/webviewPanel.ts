import * as vscode from 'vscode';
import * as path from 'path';

export class WebviewPanel {
    public static currentPanel: WebviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getHtmlForWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }


    public static createOrShow(extensionUri: vscode.Uri) {
        if (this.currentPanel) {
            this.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'codeGenie',
            'CodeGenie AI',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        this.currentPanel = new WebviewPanel(panel, extensionUri);
    }

    public dispose() {
        WebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview() {
        return `
            <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeGenie AI</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            text-align: center;
        }
        textarea {
            width: 80%;
            height: 100px;
            margin-bottom: 10px;
            padding: 10px;
        }
        button {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
        }
        #output {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #ccc;
            min-height: 50px;
            white-space: pre-wrap;
            text-align: left;
        }
    </style>
</head>
<body>
    <h2>CodeGenie AI Assistant</h2>
    <textarea id="input" placeholder="Enter your prompt..."></textarea><br>
    <button onclick="sendPrompt()">Generate</button>
    <div id="output"></div>
    
    <script>
        function sendPrompt() {
            const inputText = document.getElementById('input').value;
            document.getElementById('output').innerText = "Generating response...";
            
            fetch('http://127.0.0.1:5000/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: inputText })
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('output').innerText = data.response;
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('output').innerText = "Error generating response. Please check the server.";
            });
        }
    </script>
</body>
</html>

        `;
    }
}
