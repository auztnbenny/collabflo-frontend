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

const GREETING_MESSAGES = ['hi', 'hello', 'hey', 'greetings', 'hola', 'hi there'];

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

    // Load saved sessions
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
            startNewChat();
        }
    }, []);

    // Save sessions to localStorage
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
                content: "Welcome to CollabFlo AI Assistant! How can I help you today?",
                timestamp: new Date(),
            }]
        };

        setChatSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages(newSession.messages);
        setAttachments([]);
        setSidebarOpen(false);
    };

    const switchChat = (sessionId: string) => {
        const session = chatSessions.find(s => s.id === sessionId);
        if (session) {
            setCurrentSessionId(sessionId);
            setMessages(session.messages);
            setAttachments([]);
            setSidebarOpen(false);
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
        content = content.replace(/\*\*/g, "");
        return content.trim();
    };

    const extractCodeContent = (content: string): string => {
        const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
        return codeBlocks.map(block => block.replace(/```/g, '').trim()).join('\n\n');
    };

    const copyToClipboard = async (text: string, type: 'code' | 'response' = 'code') => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${type === 'code' ? 'Code' : 'Response'} copied to clipboard!`, {
                icon: '📋',
                style: {
                    background: '#2d3748',
                    color: '#e2e8f0',
                },
            });
        } catch (err) {
            toast.error(`Failed to copy ${type}`);
        }
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
            if (GREETING_MESSAGES.includes(question.toLowerCase())) {
                const greetingResponse: Message = {
                    id: Date.now().toString(),
                    sender: "ai",
                    content: "Hello! I'm your CollabFlo AI assistant. How can I help you today?",
                    timestamp: new Date()
                };
                const finalMessages = [...updatedMessages, greetingResponse];
                setMessages(finalMessages);
                updateSessionMessages(currentSessionId, finalMessages);
            } else {
                const response = await axios.post(`${BACKEND_URL}/api/ai/ask`, {
                    question,
                    attachments,
                    context: messages.slice(-5),
                });

                if (response.status === 200) {
                    const aiMessage: Message = {
                        id: Date.now().toString(),
                        sender: "ai",
                        content: response.data.answer,
                        timestamp: new Date(),
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
            console.error("Request failed:", error);
            toast.error("Failed to get AI response");
        } finally {
            setLoading(false);
            setAttachments([]);
        }
    };

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
                <div className="code-content">
                    <SyntaxHighlighter
                        language="javascript"
                        style={oneDark}
                        showLineNumbers={true}
                        customStyle={{
                            margin: 0,
                            padding: '12px',
                            background: '#1a1a1a',
                        }}
                    >
                        {code.trim()}
                    </SyntaxHighlighter>
                </div>
            </div>
        );
    };

    const renderMessage = (msg: Message) => {
        const hasCode = msg.content.includes("```");
        
        return (
            <div className={`message ${msg.sender}`}>
                <div className={`message-container ${msg.sender}`}>
                    <div className="message-header">
                        <div className="header-left">
                            <strong>{msg.sender === "ai" ? "AI Assistant" : "You"}</strong>
                            {msg.sender === "ai" && hasCode && (
                                <div className="copy-actions">
                                    {/* <button
                                        className="copy-action-button"
                                        onClick={() => copyToClipboard(extractCodeContent(msg.content), 'code')}
                                        title="Copy code only"
                                    >
                                        <Code size={16} />
                                        <span>Copy code</span>
                                    </button> */}
                                    {/* <button
                                        className="copy-action-button"
                                        onClick={() => copyToClipboard(msg.content, 'response')}
                                        title="Copy entire response"
                                    >
                                        <Copy size={16} />
                                        <span>Copy all</span>
                                    </button> */}
                                </div>
                            )}
                        </div>
                        <span className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <div className="message-container">
                        {hasCode ? (
                            msg.content.split("```").map((part, index) => {
                                if (index % 2 === 1) {
                                    return renderCodeBlock(part, index);
                                }
                                return (
                                    <div key={index}>
                                        {part.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                );
                            })
                        ) : (
                            msg.content.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="chatbot-layout">
            <div className="main-content">
                <div className="top-nav">
                    <button className="menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
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
                
                <div className="message-container">
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
                            onClick={() => switchChat(session.id)}
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