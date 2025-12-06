import React, { useState, useEffect, useRef, Component, ErrorInfo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, logout } from './services/firebase';
import { createChatSession, sendMessageStream } from './services/geminiService';
import { Chat } from '@google/genai';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { Message, Role, ChatSession, ModelType } from './types';
import { ATTRIBUTION_TEXT } from './constants';
import { Menu, Send, StopCircle, Zap, Sparkles, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Error Boundary Component to catch rendering errors
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#343541] text-white flex flex-col items-center justify-center p-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-400 mb-4 text-center max-w-md">
            The application encountered an error. Please try refreshing the page.
          </p>
          <div className="bg-black/30 p-4 rounded text-xs font-mono text-red-300 max-w-full overflow-auto">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Chat State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>(ModelType.FLASH);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Refs for persistent chat objects (to avoid recreating on every render)
  const chatInstanceRef = useRef<Chat | null>(null);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSessionId, sessions]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Helper to get current messages
  const getCurrentMessages = () => {
    if (!currentSessionId) return [];
    const session = sessions.find(s => s.id === currentSessionId);
    return session ? session.messages : [];
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      alert("Failed to sign in");
    }
  };

  const handleLogout = async () => {
    await logout();
    setSessions([]);
    setCurrentSessionId(null);
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setSidebarOpen(false);
    
    // Initialize Gemini Chat Instance
    chatInstanceRef.current = createChatSession(selectedModel);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      chatInstanceRef.current = null;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    if (!currentSessionId) {
      createNewSession();
      // Wait for state update is risky in standard React without flushSync, 
      // but we will initialize a temp variable for the logic below
    }

    // Ensure we have a valid session ID (if we just created one, we might need to rely on the functional update or local var)
    // For simplicity, let's assume valid session or we just created one. 
    // If currentSessionId was null, we just called createNewSession, but React state updates are async.
    // Better approach: Check if chatInstanceRef is ready.
    
    let activeSessionId = currentSessionId;
    let activeChatInstance = chatInstanceRef.current;

    if (!activeSessionId || !activeChatInstance) {
        // Just-in-time creation for the first message if no session exists
        const newId = uuidv4();
        const newSession: ChatSession = {
          id: newId,
          title: input.slice(0, 30) + '...',
          messages: [],
          createdAt: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        activeSessionId = newId;
        
        activeChatInstance = createChatSession(selectedModel);
        chatInstanceRef.current = activeChatInstance;
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: input.trim(),
      timestamp: Date.now()
    };

    // Update UI with user message immediately
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        // Update title if it's the first message and still "New Chat"
        const title = s.messages.length === 0 ? input.slice(0, 30) : s.title;
        return { ...s, title, messages: [...s.messages, userMessage] };
      }
      return s;
    }));

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsProcessing(true);

    // Create a placeholder for the bot response
    const botMessageId = uuidv4();
    const botPlaceholder: Message = {
      id: botMessageId,
      role: Role.MODEL,
      text: '', // Start empty for streaming
      timestamp: Date.now()
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: [...s.messages, botPlaceholder] };
      }
      return s;
    }));

    try {
      let accumulatedText = "";
      
      await sendMessageStream(activeChatInstance, userMessage.text, (chunk) => {
        accumulatedText += chunk;
        
        // Update the specific message in the specific session
        setSessions(prevSessions => prevSessions.map(session => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => 
                msg.id === botMessageId ? { ...msg, text: accumulatedText } : msg
              )
            };
          }
          return session;
        }));
      });

    } catch (error: any) {
      console.error("Chat error:", error);
       setSessions(prevSessions => prevSessions.map(session => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => 
                msg.id === botMessageId ? { ...msg, text: "Sorry, something went wrong. Please check your API key or network connection.", isError: true } : msg
              )
            };
          }
          return session;
        }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#343541] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const currentMessages = getCurrentMessages();

  return (
    <div className="flex h-screen bg-[#343541] overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectSession={(id) => {
            setCurrentSessionId(id);
            setSidebarOpen(false);
            chatInstanceRef.current = createChatSession(selectedModel);
        }}
        onDeleteSession={handleDeleteSession}
        onLogout={handleLogout}
        userEmail={user.email}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header (Mobile) */}
        <div className="flex items-center justify-between p-2 md:hidden bg-[#343541] border-b border-white/10 text-gray-200">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-700 rounded-md">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-sm font-medium">AkinAI</span>
          <button onClick={createNewSession} className="p-2 hover:bg-gray-700 rounded-md">
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Model Selector (Desktop/Top) */}
        <div className="hidden md:flex justify-center p-2 border-b border-white/5 bg-[#343541]">
           <div className="bg-[#202123] p-1 rounded-lg flex text-sm">
              <button 
                onClick={() => setSelectedModel(ModelType.FLASH)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all ${selectedModel === ModelType.FLASH ? 'bg-[#40414F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Zap className="w-3 h-3" />
                Gemini Flash
              </button>
              <button 
                 onClick={() => setSelectedModel(ModelType.PRO)}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all ${selectedModel === ModelType.PRO ? 'bg-[#40414F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Sparkles className="w-3 h-3" />
                Gemini Pro
              </button>
           </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-100 p-8 space-y-6">
               <div className="bg-white/10 p-4 rounded-full mb-4">
                  <Sparkles className="w-8 h-8 text-emerald-400" />
               </div>
               <h2 className="text-2xl font-semibold">How can I help you today?</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                  <button onClick={() => setInput("Explain quantum computing in simple terms")} className="p-4 border border-white/20 rounded-xl hover:bg-white/5 text-left text-sm text-gray-300 transition-colors">
                    "Explain quantum computing"
                  </button>
                  <button onClick={() => setInput("Write a poem about Liberia")} className="p-4 border border-white/20 rounded-xl hover:bg-white/5 text-left text-sm text-gray-300 transition-colors">
                    "Write a poem about Liberia"
                  </button>
               </div>
               <p className="absolute bottom-4 text-xs text-gray-600">
                  {ATTRIBUTION_TEXT}
               </p>
            </div>
          ) : (
            <div className="flex flex-col pb-32">
              {currentMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#343541] via-[#343541] to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
             <div className="relative flex items-end w-full p-3 bg-[#40414F] rounded-xl border border-black/10 dark:border-gray-900/50 shadow-md overflow-hidden ring-offset-2 focus-within:ring-2 ring-emerald-600/50">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Send a message..."
                  className="w-full max-h-[200px] py-2 px-2 bg-transparent border-0 text-white focus:ring-0 resize-none text-base scrollbar-hide"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isProcessing}
                  className={`absolute right-3 bottom-3 p-2 rounded-md transition-colors ${
                    input.trim() && !isProcessing 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-transparent text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                     <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full"></div>
                  ) : (
                     <Send className="w-4 h-4" />
                  )}
                </button>
             </div>
             <div className="text-center mt-2">
                <span className="text-[10px] text-gray-500">
                  AkinAI can make mistakes. Consider checking important information.
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;