import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, User, Bot, Sparkles, Heart, MessageCircle } from 'lucide-react';
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
      
      if (data.isComplete) {
        if (data.question && data.question.trim()) {
          const finalMessage: Message = { role: 'assistant', content: data.question };
          const finalMessages = [...updatedMessages, finalMessage];
          setMessages(finalMessages);
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
      <AnimatePresence>
        {!hasStarted && (
          <motion.div 
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-accent/40 to-health-blue/10 p-6 border border-primary/20 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-health-blue/20 to-transparent rounded-full blur-2xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative">
              <motion.div 
                className="flex items-center gap-4 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div 
                  className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-xl shadow-primary/30"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Heart className="h-7 w-7 text-primary-foreground" />
                </motion.div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">Welcome to Your Health Assessment</h3>
                  <p className="text-sm text-muted-foreground">I'm here to help understand your symptoms</p>
                </div>
              </motion.div>
              <motion.p 
                className="text-sm text-muted-foreground leading-relaxed bg-card/50 p-4 rounded-xl backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Tell me what's bothering you in as much detail as you can. I'll ask a few personalized follow-up questions 
                based on your health profile and history, then provide a comprehensive analysis.
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div 
            className="space-y-4 max-h-[400px] overflow-y-auto p-5 bg-gradient-to-b from-secondary/30 to-secondary/50 rounded-2xl border border-border/50 scroll-smooth shadow-inner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            {messages.map((message, index) => (
              <motion.div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {message.role === 'assistant' && (
                  <motion.div 
                    className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </motion.div>
                )}
                <motion.div
                  className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg",
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md'
                      : 'bg-card border border-border/50 rounded-bl-md backdrop-blur-sm'
                  )}
                  whileHover={{ scale: 1.01 }}
                >
                  {message.content}
                </motion.div>
                {message.role === 'user' && (
                  <motion.div 
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center flex-shrink-0 shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <User className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                )}
              </motion.div>
            ))}
            
            {/* Loading indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div 
                  className="flex gap-3 justify-start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <motion.div 
                    className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </motion.div>
                  <div className="p-4 rounded-2xl rounded-bl-md bg-card border border-border/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span 
                            key={i}
                            className="w-2.5 h-2.5 bg-primary/60 rounded-full"
                            animate={{ 
                              scale: [1, 1.3, 1],
                              opacity: [0.5, 1, 0.5]
                            }}
                            transition={{ 
                              duration: 1, 
                              repeat: Infinity, 
                              delay: i * 0.2 
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analyzing indicator */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div 
                  className="flex gap-3 justify-start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div 
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-health-green to-health-teal flex items-center justify-center flex-shrink-0 shadow-lg"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-5 w-5 text-white" />
                  </motion.div>
                  <motion.div 
                    className="p-4 rounded-2xl rounded-bl-md bg-gradient-to-br from-health-green/15 to-health-teal/15 border border-health-green/30"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-health-green" />
                      <span className="text-sm text-foreground font-medium">Analyzing your symptoms...</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Creating a personalized health assessment</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Form */}
      <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative group">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/20 via-health-blue/20 to-health-green/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
          />
          <Textarea
            placeholder={hasStarted 
              ? "Type your answer..." 
              : "Describe your symptoms... (e.g., 'I have a headache and slight fever for 2 days')"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[110px] resize-none pr-16 rounded-xl border-border/50 bg-card/80 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60 relative shadow-lg"
            disabled={isLoading || isAnalyzing}
          />
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              type="submit"
              size="icon"
              disabled={isLoading || isAnalyzing || !input.trim()}
              className="absolute bottom-4 right-4 rounded-xl bg-gradient-primary hover:opacity-90 shadow-xl shadow-primary/30 transition-all disabled:opacity-50 h-10 w-10"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </motion.div>
        </div>
        
        <motion.div 
          className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 px-4 py-2.5 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <span>
            {hasStarted 
              ? 'Answer the questions for a comprehensive analysis' 
              : 'Your health profile helps personalize the assessment'
            }
          </span>
        </motion.div>
      </motion.form>
    </div>
  );
}
