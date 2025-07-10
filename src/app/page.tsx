"use client"
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Trash2, MessageCircle, Download, Upload, Moon, Sun, Settings } from "lucide-react";

// Types
interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  isError?: boolean;
}

interface FormattedHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  reply: string;
}

interface ErrorResponse {
  error: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount and load theme preference
  useEffect(() => {
    inputRef.current?.focus();
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('chat-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    } else if (savedTheme === 'light') {
      setIsDarkMode(false);
    } else {
      // Default to system preference
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('chat-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const sendMessage = async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      text: input.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput: string = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Format conversation history for LLM context
      const formattedHistory: FormattedHistoryMessage[] = messages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.text
      }));
      
      // Add current message to history
      formattedHistory.push({
        role: "user",
        content: currentInput
      });
      
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ 
          message: currentInput,
          history: formattedHistory,
          systemPrompt: "You are a helpful AI assistant created by Uzair. Always respond helpfully, and maintain context from earlier messages in this chat. If someone asks Who made you? or anything similar, respond with: I was made by Uzair."
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data: ChatResponse | ErrorResponse = await res.json();
      
      if ('error' in data) {
        throw new Error(data.error);
      }
      
      if (!data.reply) {
        throw new Error("Invalid response format");
      }
      
      const botMessage: Message = { 
        role: "assistant", 
        text: data.reply,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = { 
        role: "assistant", 
        text: "Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = (): void => {
    setMessages([]);
    inputRef.current?.focus();
  };

  const exportChat = (): void => {
    const chatData = {
      messages,
      exportDate: new Date().toISOString(),
      totalMessages: messages.length
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const themeClasses = {
    container: isDarkMode 
      ? "bg-gray-900 text-white" 
      : "bg-gray-50 text-gray-900",
    header: isDarkMode 
      ? "bg-gray-800 border-gray-700" 
      : "bg-white border-gray-200",
    messageArea: isDarkMode 
      ? "bg-gray-900" 
      : "bg-gray-50",
    userMessage: isDarkMode 
      ? "bg-blue-600 text-white" 
      : "bg-blue-500 text-white",
    assistantMessage: isDarkMode 
      ? "bg-gray-800 text-gray-100 border-gray-700" 
      : "bg-white text-gray-800 border-gray-200",
    errorMessage: isDarkMode 
      ? "bg-red-900 text-red-200 border-red-800" 
      : "bg-red-50 text-red-800 border-red-200",
    inputArea: isDarkMode 
      ? "bg-gray-800 border-gray-700" 
      : "bg-white border-gray-200",
    input: isDarkMode 
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" 
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500",
    button: isDarkMode 
      ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" 
      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100",
    emptyState: isDarkMode 
      ? "text-gray-400" 
      : "text-gray-500",
    timestamp: isDarkMode 
      ? "text-gray-500" 
      : "text-gray-400"
  };

  return (
    <div className={`${themeClasses.container}`}>
    <div className={`max-w-5xl mx-auto h-screen flex flex-col transition-colors duration-200 ${themeClasses.container}`}>
      {/* Header */}
      <div className={`border-b p-4 flex items-center justify-between shadow-sm ${themeClasses.header}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Gemini Chat
            </h1>
            <p className={`text-sm ${themeClasses.timestamp}`}>
              {messages.length > 0 ? `${messages.length} messages` : "Ready to assist you"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${themeClasses.button}`}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {messages.length > 0 && (
            <>
              <button
                onClick={exportChat}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${themeClasses.button}`}
                title="Export chat"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={clearChat}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${themeClasses.button}`}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${themeClasses.messageArea}`}>
        {messages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${themeClasses.emptyState}`}>
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Start a conversation</h2>
            <p className="text-center max-w-md text-lg leading-relaxed">
              Ask me anything! I'll maintain our conversation history to provide better context-aware responses.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              <div className={`p-4 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <h3 className="font-medium mb-2">💡 Ask for help</h3>
                <p className="text-sm opacity-75">Get assistance with coding, writing, or problem-solving</p>
              </div>
              <div className={`p-4 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <h3 className="font-medium mb-2">🔍 Research topics</h3>
                <p className="text-sm opacity-75">Explore subjects and get detailed explanations</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className={`max-w-[75%] ${msg.role === "user" ? "order-2" : ""}`}>
                <div
                  className={`p-4 rounded-2xl shadow-sm border ${
                    msg.role === "user"
                      ? themeClasses.userMessage
                      : msg.isError
                      ? themeClasses.errorMessage
                      : themeClasses.assistantMessage
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
                <div className={`text-xs mt-2 ${themeClasses.timestamp} ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>

              {msg.role === "user" && (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-600"
                }`}>
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className={`rounded-2xl p-4 shadow-sm border ${themeClasses.assistantMessage}`}>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t p-6 shadow-lg ${themeClasses.inputArea}`}>
        <div className="flex gap-4 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`w-full border-2 rounded-2xl px-6 py-4 pr-14 resize-none transition-all duration-200 ${themeClasses.input}`}
              placeholder="Type your message..."
              rows={1}
              style={{ minHeight: "56px", maxHeight: "120px" }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className={`text-sm mt-3 text-center ${themeClasses.timestamp}`}>
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
    </div>
  );
}