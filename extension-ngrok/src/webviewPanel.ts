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
            { 
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
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
                <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    
                    .animate-fade-in {
                        animation: fadeIn 0.3s ease-out;
                    }
                    
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .scrollbar-thin::-webkit-scrollbar {
                        width: 6px;
                    }
                    
                    .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
                        background-color: rgba(75, 85, 99, 0.6);
                        border-radius: 3px;
                    }
                    
                    .scrollbar-track-transparent::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    /* Lucide Icons Styles */
                    .lucide {
                        width: 1em;
                        height: 1em;
                        stroke-width: 2;
                        stroke: currentColor;
                        fill: none;
                    }
                </style>
            </head>
            <body>
                <div id="root"></div>

                <script type="text/babel">
                    const { useState, useRef, useEffect } = React;

                    // Simple Lucide Icons Components
                    const Send = ({ size = 20, className = "" }) => (
                        <svg className={\`lucide \${className}\`} width={size} height={size} viewBox="0 0 24 24">
                            <path d="m22 2-7 20-4-9-9-4Z"/>
                            <path d="M22 2 11 13"/>
                        </svg>
                    );

                    const Bot = ({ size = 20, className = "" }) => (
                        <svg className={\`lucide \${className}\`} width={size} height={size} viewBox="0 0 24 24">
                            <path d="M12 8V4H8"/>
                            <rect width="16" height="12" x="4" y="8" rx="2"/>
                            <path d="M2 14h2"/>
                            <path d="M20 14h2"/>
                            <path d="M15 13v2"/>
                            <path d="M9 13v2"/>
                        </svg>
                    );

                    const User = ({ size = 20, className = "" }) => (
                        <svg className={\`lucide \${className}\`} width={size} height={size} viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    );

                    const CodeGenieChat = () => {
                        const [messages, setMessages] = useState([]);
                        const [inputText, setInputText] = useState('');
                        const [isLoading, setIsLoading] = useState(false);
                        const chatContainerRef = useRef(null);

                        const scrollToBottom = () => {
                            if (chatContainerRef.current) {
                                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                            }
                        };

                        useEffect(() => {
                            scrollToBottom();
                        }, [messages]);

                        const sendPrompt = async () => {
                            if (!inputText.trim() || isLoading) return;

                            const userMessage = {
                                id: Date.now(),
                                text: inputText,
                                sender: 'user',
                                timestamp: new Date()
                            };

                            setMessages(prev => [...prev, userMessage]);
                            const currentPrompt = inputText; // Store the prompt before clearing
                            setInputText('');
                            setIsLoading(true);

                            try {
                                console.log('Sending request to server...', currentPrompt);
                                
                                const response = await fetch('http://127.0.0.1:5000/generate', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ prompt: currentPrompt })
                                });

                                console.log('Response status:', response.status);

                                if (!response.ok) {
                                    throw new Error(\`HTTP error! status: \${response.status}\`);
                                }

                                const data = await response.json();
                                console.log('Received data:', data);
                                
                                const aiMessage = {
                                    id: Date.now() + 1,
                                    text: data.response,
                                    sender: 'ai',
                                    timestamp: new Date()
                                };

                                setMessages(prev => [...prev, aiMessage]);
                            } catch (error) {
                                console.error('Error:', error);
                                const errorMessage = {
                                    id: Date.now() + 1,
                                    text: \`Error generating response: \${error.message}. Please check if the server is running on http://127.0.0.1:5000\`,
                                    sender: 'ai',
                                    timestamp: new Date(),
                                    isError: true
                                };
                                setMessages(prev => [...prev, errorMessage]);
                            } finally {
                                setIsLoading(false);
                            }
                        };

                        const handleKeyPress = (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendPrompt();
                            }
                        };

                        const formatTime = (timestamp) => {
                            return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        };

                        return React.createElement('div', {
                            className: "min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col"
                        }, [
                            // Header
                            React.createElement('div', {
                                key: 'header',
                                className: "bg-gray-900/50 backdrop-blur-md border-b border-gray-700/50 p-6 text-center"
                            }, [
                                React.createElement('h1', {
                                    key: 'title',
                                    className: "text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 drop-shadow-lg"
                                }, 'CodeGenie'),
                                React.createElement('p', {
                                    key: 'subtitle',
                                    className: "text-gray-300 text-lg font-light"
                                }, 'Your AI Programming Assistant')
                            ]),

                            // Chat Container
                            React.createElement('div', {
                                key: 'chat-container',
                                className: "flex-1 flex flex-col max-w-4xl mx-auto w-full p-4"
                            }, [
                                // Messages
                                React.createElement('div', {
                                    key: 'messages',
                                    ref: chatContainerRef,
                                    className: "flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                                }, [
                                    // Empty state
                                    messages.length === 0 && React.createElement('div', {
                                        key: 'empty-state',
                                        className: "text-center text-gray-400 mt-20"
                                    }, [
                                        React.createElement(Bot, {
                                            key: 'bot-icon',
                                            size: 48,
                                            className: "mx-auto mb-4 opacity-50"
                                        }),
                                        React.createElement('p', {
                                            key: 'empty-title',
                                            className: "text-xl"
                                        }, 'Start a conversation with CodeGenie!'),
                                        React.createElement('p', {
                                            key: 'empty-subtitle',
                                            className: "text-sm mt-2"
                                        }, 'Ask me anything about programming, code reviews, or technical questions.')
                                    ]),

                                    // Messages
                                    ...messages.map((message) => 
                                        React.createElement('div', {
                                            key: message.id,
                                            className: \`flex items-start space-x-3 animate-fade-in \${
                                                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                            }\`
                                        }, [
                                            // Avatar
                                            React.createElement('div', {
                                                key: \`avatar-\${message.id}\`,
                                                className: \`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center \${
                                                    message.sender === 'user' 
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600' 
                                                        : 'bg-gradient-to-r from-blue-500 to-cyan-600'
                                                }\`
                                            }, [
                                                message.sender === 'user' 
                                                    ? React.createElement(User, { key: \`user-icon-\${message.id}\`, size: 20, className: "text-white" })
                                                    : React.createElement(Bot, { key: \`bot-icon-\${message.id}\`, size: 20, className: "text-white" })
                                            ]),

                                            // Message Bubble
                                            React.createElement('div', {
                                                key: \`message-bubble-\${message.id}\`,
                                                className: \`max-w-xs lg:max-w-md xl:max-w-lg \${
                                                    message.sender === 'user' ? 'text-right' : 'text-left'
                                                }\`
                                            }, [
                                                React.createElement('div', {
                                                    key: \`bubble-\${message.id}\`,
                                                    className: \`rounded-2xl px-4 py-3 \${
                                                        message.sender === 'user'
                                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'
                                                            : message.isError
                                                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                                                            : 'bg-gray-800/90 backdrop-blur-sm text-gray-100 border border-gray-700/50'
                                                    } shadow-lg\`
                                                }, [
                                                    React.createElement('p', {
                                                        key: \`text-\${message.id}\`,
                                                        className: "whitespace-pre-wrap break-words"
                                                    }, message.text)
                                                ]),
                                                React.createElement('p', {
                                                    key: \`timestamp-\${message.id}\`,
                                                    className: \`text-xs text-gray-500 mt-1 \${
                                                        message.sender === 'user' ? 'text-right' : 'text-left'
                                                    }\`
                                                }, formatTime(message.timestamp))
                                            ])
                                        ])
                                    ),

                                    // Loading indicator
                                    isLoading && React.createElement('div', {
                                        key: 'loading',
                                        className: "flex items-start space-x-3"
                                    }, [
                                        React.createElement('div', {
                                            key: 'loading-avatar',
                                            className: "flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center"
                                        }, [
                                            React.createElement(Bot, { key: 'loading-bot', size: 20, className: "text-white" })
                                        ]),
                                        React.createElement('div', {
                                            key: 'loading-bubble',
                                            className: "bg-gray-800/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-gray-700/50"
                                        }, [
                                            React.createElement('div', {
                                                key: 'dots',
                                                className: "flex space-x-1"
                                            }, [
                                                React.createElement('div', {
                                                    key: 'dot1',
                                                    className: "w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                                                }),
                                                React.createElement('div', {
                                                    key: 'dot2',
                                                    className: "w-2 h-2 bg-cyan-400 rounded-full animate-bounce",
                                                    style: { animationDelay: '0.1s' }
                                                }),
                                                React.createElement('div', {
                                                    key: 'dot3',
                                                    className: "w-2 h-2 bg-cyan-400 rounded-full animate-bounce",
                                                    style: { animationDelay: '0.2s' }
                                                })
                                            ])
                                        ])
                                    ])
                                ]),

                                // Input Area
                                React.createElement('div', {
                                    key: 'input-area',
                                    className: "bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 mt-4 border border-gray-700/50"
                                }, [
                                    React.createElement('div', {
                                        key: 'input-container',
                                        className: "flex space-x-3"
                                    }, [
                                        React.createElement('textarea', {
                                            key: 'textarea',
                                            value: inputText,
                                            onChange: (e) => setInputText(e.target.value),
                                            onKeyDown: handleKeyPress, // Changed from onKeyPress to onKeyDown
                                            placeholder: "Type your message here... (Shift+Enter for new line)",
                                            className: "flex-1 bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-3 text-gray-100 placeholder-gray-400 border border-gray-600/50 focus:border-cyan-500/50 focus:outline-none resize-none min-h-[50px] max-h-32",
                                            rows: "1",
                                            disabled: isLoading
                                        }),
                                        React.createElement('button', {
                                            key: 'send-button',
                                            onClick: sendPrompt,
                                            disabled: !inputText.trim() || isLoading,
                                            className: "bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 flex items-center justify-center min-w-[50px]"
                                        }, [
                                            React.createElement(Send, { key: 'send-icon', size: 20 })
                                        ])
                                    ])
                                ])
                            ])
                        ]);
                    };

                    // Wait for all scripts to load before rendering
                    window.addEventListener('load', () => {
                        ReactDOM.render(React.createElement(CodeGenieChat), document.getElementById('root'));
                    });
                </script>
            </body>
            </html>
        `;
    }
}