import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Condition } from '@/lib/symptomAnalyzer';

export interface SymptomHistoryHandle {
  refresh: () => void;
}

interface SymptomHistoryEntry {
  id: string;
  symptoms: string;
  possible_conditions: Condition[];
  recommendations: string[];
  urgency_level: string;
  created_at: string;
}

export const SymptomHistory = forwardRef<SymptomHistoryHandle>((_, ref) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SymptomHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    refresh: fetchHistory,
  }));

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('symptom_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load symptom history');
    } else {
      setHistory((data || []).map(item => ({
        ...item,
        possible_conditions: item.possible_conditions as unknown as Condition[],
        recommendations: item.recommendations as unknown as string[],
      })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from('symptom_history')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete entry');
    } else {
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success('Entry deleted');
    }
    setDeletingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">Symptom History</CardTitle>
              <CardDescription>Your past symptom analyses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No symptom history yet. Analyze your symptoms to start building your history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
            <History className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl">Symptom History</CardTitle>
            <CardDescription>Your past symptom analyses ({history.length})</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        entry.urgency_level === 'Emergency' 
                          ? 'bg-destructive/20 text-destructive' 
                          : entry.urgency_level === 'Urgent'
                          ? 'bg-health-orange/20 text-health-orange'
                          : 'bg-health-green/20 text-health-green'
                      }`}>
                        {entry.urgency_level}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{entry.symptoms}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      {expandedId === entry.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>

                {expandedId === entry.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Possible Conditions</h4>
                      <div className="space-y-2">
                        {entry.possible_conditions.map((condition, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{condition.name}</span>
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                              condition.likelihood === 'High' 
                                ? 'bg-health-orange/20 text-health-orange' 
                                : condition.likelihood === 'Medium'
                                ? 'bg-health-blue/20 text-health-blue'
                                : 'bg-health-green/20 text-health-green'
                            }`}>
                              {condition.likelihood}
                            </span>
                            <p className="text-muted-foreground mt-0.5">{condition.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {entry.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
