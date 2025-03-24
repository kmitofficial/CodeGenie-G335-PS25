const vscode = require('vscode');
const ApiClient = require('./api/client');

function activate(context) {
    const apiClient = new ApiClient('https://jsonplaceholder.typicode.com'); // Replace with your API base URL

    const fetchDataCommand = vscode.commands.registerCommand('extension.fetchData', async () => {
        try {
            const endpoint = await vscode.window.showInputBox({
                prompt: 'Enter the API endpoint to fetch data from',
            });

            if (!endpoint) {
                vscode.window.showErrorMessage('No endpoint provided.');
                return;
            }

            const data = await apiClient.fetchData(endpoint);
            vscode.window.showInformationMessage(`Data fetched: ${JSON.stringify(data)}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(fetchDataCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};