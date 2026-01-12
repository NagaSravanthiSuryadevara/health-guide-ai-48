import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, User, Bot, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SymptomChatProps {
  onComplete: (conversationHistory: Message[]) => void;
  isAnalyzing: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/symptom-followup`;

export function SymptomChat({ onComplete, isAnalyzing }: SymptomChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: Message = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setHasStarted(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: updatedMessages,
          userId: user?.id 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Check if the AI signals that analysis is ready
      if (data.isComplete) {
        // Add final message if there is one
        if (data.question && data.question.trim()) {
          const finalMessage: Message = { role: 'assistant', content: data.question };
          const finalMessages = [...updatedMessages, finalMessage];
          setMessages(finalMessages);
          // Wait a moment then trigger analysis
          setTimeout(() => {
            onComplete(finalMessages);
          }, 1000);
        } else {
          onComplete(updatedMessages);
        }
      } else {
        const assistantMessage: Message = { role: 'assistant', content: data.question };
        setMessages([...updatedMessages, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...updatedMessages, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="space-y-4">
      {/* Welcome Message */}
      {!hasStarted && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-accent/30 to-health-blue/5 p-6 border border-primary/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-health-blue/20 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Heart className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Welcome to Your Health Assessment</h3>
                <p className="text-sm text-muted-foreground">I'm here to help understand your symptoms</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tell me what's bothering you in as much detail as you can. I'll ask a few personalized follow-up questions 
              based on your health profile and history, then provide a comprehensive analysis.
            </p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gradient-to-b from-secondary/20 to-secondary/40 rounded-2xl border border-border/50 scroll-smooth">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-3 duration-300",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {message.role === 'assistant' && (
                <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md'
                    : 'bg-card border border-border/50 rounded-bl-md backdrop-blur-sm'
                )}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-in fade-in-0 slide-in-from-bottom-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="p-4 rounded-2xl rounded-bl-md bg-card border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          {isAnalyzing && (
            <div className="flex gap-3 justify-start animate-in fade-in-0 slide-in-from-bottom-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-health-green to-health-teal flex items-center justify-center flex-shrink-0 shadow-md">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="p-4 rounded-2xl rounded-bl-md bg-gradient-to-br from-health-green/10 to-health-teal/10 border border-health-green/30">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-health-green" />
                  <span className="text-sm text-foreground font-medium">Analyzing your symptoms...</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Creating a personalized health assessment</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            placeholder={hasStarted 
              ? "Type your answer..." 
              : "Describe your symptoms... (e.g., 'I have a headache and slight fever for 2 days')"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none pr-14 rounded-xl border-border/50 bg-card/50 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
            disabled={isLoading || isAnalyzing}
          />
          <Button 
            type="submit"
            size="icon"
            disabled={isLoading || isAnalyzing || !input.trim()}
            className="absolute bottom-3 right-3 rounded-xl bg-gradient-primary hover:opacity-90 shadow-lg shadow-primary/25 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>
            {hasStarted 
              ? 'Answer the questions for a comprehensive analysis' 
              : 'Your health profile helps personalize the assessment'
            }
          </span>
        </div>
      </form>
    </div>
  );
}
