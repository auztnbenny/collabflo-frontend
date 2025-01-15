// AIAssistant.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Send, Paperclip, Code, Plus, Loader, Menu, X } from "lucide-react";
import "./Chatbot.css";

interface Message {
    id: string;
    sender: "user" | "ai";
    content: string;
    timestamp: Date;
    attachments?: string[];
    codeBlocks?: string[];
}

interface FileAttachment {
    name: string;
    content: string;
    type: string;
}

interface ChatSession {
    id: string;
    title: string;
    timestamp: Date;
    messages: Message[];
}

const GREETING_MESSAGES = [
    'hi', 'hello', 'hey', 'greetings', 'hola', 'hi there'
];

const AIAssistant = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const savedSessions = localStorage.getItem("chatSessions");
        if (savedSessions) {
            const sessions = JSON.parse(savedSessions);
            setChatSessions(sessions);
            if (sessions.length > 0) {
                setCurrentSessionId(sessions[0].id);
                setMessages(sessions[0].messages);
            }
        } else {
            startNewChat(); // Initialize with a new chat if no sessions exist
        }
    }, []);

    useEffect(() => {
        if (chatSessions.length > 0) {
            localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
        }
    }, [chatSessions]);

    const startNewChat = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: "New Chat",
            timestamp: new Date(),
            messages: [{
                id: Date.now().toString(),
                sender: "ai",
                content: "Welcome to CollabFlow AI Assistant! How can I help you today?",
                timestamp: new Date(),
            }]
        };

        setChatSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages(newSession.messages);
        setAttachments([]);
    };

    const switchChat = (sessionId: string) => {
        const session = chatSessions.find(s => s.id === sessionId);
        if (session) {
            setCurrentSessionId(sessionId);
            setMessages(session.messages);
            setAttachments([]);
        }
    };

    const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
        setChatSessions(prev => prev.map(session => 
            session.id === sessionId 
                ? { ...session, messages: newMessages } 
                : session
        ));
    };

    const formatMessage = (content: string): string => {
        // Remove markdown style asterisks
        content = content.replace(/\*\*/g, '');
        
        // Format questions with proper spacing
        content = content.replace(/\?\*\*/g, '?');
        
        return content.trim();
    };

    const isGreeting = (text: string): boolean => {
        return GREETING_MESSAGES.includes(text.toLowerCase().trim());
    };

    const handleSend = async () => {
        const question = input.trim();
        if (!question && attachments.length === 0) {
            toast.error("Please enter a message or attach files.");
            return;
        }

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: "user",
            content: question,
            timestamp: new Date(),
            attachments: attachments.map(a => a.name),
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        updateSessionMessages(currentSessionId, updatedMessages);
        setInput("");
        setLoading(true);

        try {
            if (isGreeting(question)) {
                const greetingResponse: Message = {
                    id: Date.now().toString(),
                    sender: "ai",
                    content: "Hello! I'm your CollabFlow AI assistant. How can I help you today?",
                    timestamp: new Date()
                };
                const finalMessages = [...updatedMessages, greetingResponse];
                setMessages(finalMessages);
                updateSessionMessages(currentSessionId, finalMessages);
            } else {
                const response = await axios.post(`${BACKEND_URL}/api/ai/ask`, {
                    question,
                    attachments,
                    context: messages.slice(-5), // Send last 5 messages for context
                });

                if (response.status === 200) {
                    const aiResponse = response.data.answer;
                    const codeBlocks = extractCodeBlocks(aiResponse);
                    
                    const aiMessage: Message = {
                        id: Date.now().toString(),
                        sender: "ai",
                        content: aiResponse,
                        timestamp: new Date(),
                        codeBlocks,
                    };
                    
                    const finalMessages = [...updatedMessages, aiMessage];
                    setMessages(finalMessages);
                    updateSessionMessages(currentSessionId, finalMessages);

                    // Update chat session title if it's the first user message
                    if (updatedMessages.length === 2) {
                        setChatSessions(prev => prev.map(session =>
                            session.id === currentSessionId
                                ? { ...session, title: question.slice(0, 30) + "..." }
                                : session
                        ));
                    }
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Request failed:", error.message);
                toast.error("Failed to get AI response");
            }
        } finally {
            setLoading(false);
            setAttachments([]);
        }
    };

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newAttachments: FileAttachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const content = await file.text();
                newAttachments.push({
                    name: file.name,
                    content,
                    type: file.type,
                });
            } catch (error) {
                toast.error(`Failed to read file: ${file.name}`);
            }
        }

        setAttachments((prev) => [...prev, ...newAttachments]);
        toast.success(`${newAttachments.length} file(s) attached`);
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard!");
        } catch (err) {
            toast.error("Failed to copy to clipboard");
        }
    };

    const extractCodeBlocks = (content: string): string[] => {
        const regex = /```[\s\S]*?```/g;
        return content.match(regex) || [];
    };

    const renderCodeBlock = (code: string, index: number) => {
        return (
            <div key={index} className="code-block">
                <div className="code-header">
                    <span>Code</span>
                    <button
                        className="copy-button"
                        onClick={() => copyToClipboard(code.trim())}
                    >
                        <Copy size={16} />
                        Copy
                    </button>
                </div>
                <SyntaxHighlighter
                    language="javascript"
                    style={oneDark}
                    customStyle={{
                        margin: 0,
                        padding: '12px',
                        background: '#1a1a1a',
                    }}
                    wrapLongLines={false}
                    showLineNumbers={true}
                >
                    {code.trim()}
                </SyntaxHighlighter>
            </div>
        );
    };

    const renderMessage = (msg: Message) => {
        const formattedContent = formatMessage(msg.content);
        
        const renderText = (text: string) => {
            return text.split('\n').map((line, index) => {
                // Check if line is a question
                const isQuestion = line.includes('?');
                
                return (
                    <p 
                        key={index} 
                        data-question={isQuestion}
                        className={isQuestion ? 'question-line' : ''}
                    >
                        {line}
                    </p>
                );
            });
        };

        return (
            <div className={`message ${msg.sender}`}>
                <div className={`message-content ${msg.sender}`}>
                    <div className="message-header">
                        <strong>{msg.sender === "ai" ? "AI Assistant" : "You"}</strong>
                        <span className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <div className="message-text">
                        {renderText(formattedContent)}
                    </div>
                </div>
            </div>
        );
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="chatbot-layout">
            <div className="main-content">
                <div className="top-nav">
                    <button className="menu-button" onClick={toggleSidebar}>
                        <Menu size={24} />
                    </button>
                    <button className="new-chat-button" onClick={startNewChat}>
                        <Plus size={20} />
                        New Chat
                    </button>
                </div>
                
                <div className="messages-container">
                    {messages.map((msg) => renderMessage(msg))}
                    <div ref={messagesEndRef} />
                    {loading && (
                        <div className="loading-indicator">
                            <Loader className="spin" />
                            <span>Generating response...</span>
                        </div>
                    )}
                </div>
                
                <div className="input-container">
                    <div className="input-wrapper">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type your message here..."
                            disabled={loading}
                            className="ai-input"
                            rows={2}
                        />
                        
                        <div className="input-actions">
                            <button
                                className="action-button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                            >
                                <Paperclip size={20} />
                            </button>
                            <button
                                className="action-button send-button"
                                onClick={handleSend}
                                disabled={loading}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                    
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        style={{ display: "none" }}
                    />
                    
                    {attachments.length > 0 && (
                        <div className="attachments-preview">
                            {attachments.map((file, index) => (
                                <span key={index} className="attachment-badge">
                                    {file.name}
                                    <button
                                        className="remove-attachment"
                                        onClick={() => {
                                            setAttachments(attachments.filter((_, i) => i !== index));
                                        }}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="chat-history">
                    {chatSessions.map(session => (
                        <div
                            key={session.id}
                            className={`chat-history-item ${session.id === currentSessionId ? 'active' : ''}`}
                            onClick={() => {
                                switchChat(session.id);
                                setSidebarOpen(false);
                            }}
                        >
                            <span>{session.title}</span>
                            <span className="chat-time">
                                {new Date(session.timestamp).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {sidebarOpen && (
                <div 
                    className="sidebar-overlay visible" 
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default AIAssistant;