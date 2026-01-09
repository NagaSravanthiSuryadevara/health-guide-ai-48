import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, CheckCircle2, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [canFinish, setCanFinish] = useState(false);

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
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.question };
      setMessages([...updatedMessages, assistantMessage]);
      
      // Enable finish button after first follow-up question
      if (updatedMessages.length >= 1) {
        setCanFinish(true);
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

  const handleDone = () => {
    onComplete(messages);
  };

  return (
    <div className="space-y-4">
      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto p-4 bg-secondary/30 rounded-lg">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-lg text-sm",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                )}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder={hasStarted 
            ? "Answer the question..." 
            : "Describe your symptoms in detail. For example: 'I have a headache, slight fever, and sore throat...'"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[100px] resize-none"
          disabled={isLoading || isAnalyzing}
        />
        <div className="flex gap-2 flex-wrap">
          <Button 
            type="submit"
            disabled={isLoading || isAnalyzing || !input.trim()}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {hasStarted ? 'Send Answer' : 'Start Assessment'}
              </>
            )}
          </Button>
          
          {canFinish && (
            <Button 
              type="button"
              variant="secondary"
              onClick={handleDone}
              disabled={isLoading || isAnalyzing}
              className="flex-1 sm:flex-none bg-health-green/20 text-health-green hover:bg-health-green/30 border-health-green/30"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Done - Get Results
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {!hasStarted && (
        <p className="text-xs text-muted-foreground">
          After you describe your symptoms, I'll ask a few follow-up questions to better understand your condition.
        </p>
      )}
    </div>
  );
}
