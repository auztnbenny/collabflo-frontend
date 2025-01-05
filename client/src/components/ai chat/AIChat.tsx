import React, { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import axios from "axios"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import analyzeCode from "@/utils/analyzeCode"
import "./Chatbot.css" // Ensure this path is correct

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

interface Message {
    sender: "user" | "ai"
    content: string
}

const AIAssistant = () => {
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        const question = input.trim()
        if (!question) {
            toast.error("Please enter a question.")
            return
        }

        if (!BACKEND_URL) {
            toast.error("Backend URL is not defined.")
            return
        }

        const newMessage: Message = { sender: "user", content: question }
        setMessages((prev) => [...prev, newMessage])
        setInput("")
        setLoading(true)

        try {
            // Check if the user is asking for code analysis
            if (question.toLowerCase().includes("analyze code")) {
                const codeToAnalyze = "Your code here" // Replace with the actual code you want to analyze
                const analysisResult = await analyzeCode(codeToAnalyze)
                const aiAnswer: Message = {
                    sender: "ai",
                    content: analysisResult,
                }
                setMessages((prev) => [...prev, aiAnswer])
            } else {
                const response = await axios.post(`${BACKEND_URL}/api/ai/ask`, { question })

                if (response.status === 200) {
                    const aiAnswer: Message = {
                        sender: "ai",
                        content: response.data.answer,
                    }
                    setMessages((prev) => [...prev, aiAnswer])
                } else {
                    toast.error(
                        response.data.error ||
                            "Failed to get a response from AI.",
                    )
                }
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    console.error('Resource not found:', error.response.config.url);
                    toast.error("Requested resource not found.");
                } else {
                    console.error('Request failed:', error.message);
                    toast.error("An error occurred while asking the AI.");
                }
            } else {
                console.error("Unexpected error:", error);
                toast.error("An unexpected error occurred.");
            }
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="ai-assistant-container">
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <div className={`message-content ${msg.sender}`}>
                            <strong>
                                {msg.sender === "ai" ? "AI Assistant" : "You"}
                            </strong>
                            <div className="message-text">
                                {msg.sender === "ai" ? (
                                    msg.content.includes("```") ? (
                                        <SyntaxHighlighter
                                            language="javascript"
                                            style={oneDark}
                                        >
                                            {msg.content.split("```")[1]}
                                        </SyntaxHighlighter>
                                    ) : (
                                        msg.content
                                    )
                                ) : (
                                    msg.content // Display user message as is
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-container">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here..."
                    disabled={loading}
                    className="ai-input"
                    rows={2}
                />
                <button
                    onClick={handleSend}
                    disabled={loading}
                    className="ai-button"
                >
                    {loading ? "Asking..." : "Send"}
                </button>
            </div>
        </div>
    )
}

export default AIAssistant
