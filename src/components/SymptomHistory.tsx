import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
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
  is_cured: boolean;
  cured_at: string | null;
}

export const SymptomHistory = forwardRef<SymptomHistoryHandle>((_, ref) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SymptomHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingCuredId, setTogglingCuredId] = useState<string | null>(null);

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
        is_cured: item.is_cured || false,
        cured_at: item.cured_at || null,
      })));
    }
    setLoading(false);
  };

  const handleToggleCured = async (id: string, currentStatus: boolean) => {
    setTogglingCuredId(id);
    const newStatus = !currentStatus;
    
    const { error } = await supabase
      .from('symptom_history')
      .update({ 
        is_cured: newStatus,
        cured_at: newStatus ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      setHistory(prev => prev.map(h => 
        h.id === id ? { ...h, is_cured: newStatus, cured_at: newStatus ? new Date().toISOString() : null } : h
      ));
      toast.success(newStatus ? 'Marked as cured! 🎉' : 'Marked as not cured');
    }
    setTogglingCuredId(null);
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
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/90">
        <CardContent className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/90 overflow-hidden relative">
        <motion.div 
          className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <CardHeader>
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div 
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center shadow-lg"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8 }}
            >
              <History className="h-7 w-7 text-muted-foreground" />
            </motion.div>
            <div>
              <CardTitle className="font-display text-2xl">Symptom History</CardTitle>
              <CardDescription>Your past symptom analyses</CardDescription>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.div
            className="text-center py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Clock className="h-10 w-10 text-muted-foreground/50" />
            </motion.div>
            <p className="text-muted-foreground">No symptom history yet. Analyze your symptoms to start building your history.</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/90 overflow-hidden relative">
      <motion.div 
        className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <CardHeader>
        <motion.div 
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <motion.div 
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.8 }}
          >
            <History className="h-7 w-7 text-accent-foreground" />
          </motion.div>
          <div>
            <CardTitle className="font-display text-2xl">Symptom History</CardTitle>
            <CardDescription>Your past symptom analyses ({history.length})</CardDescription>
          </div>
        </motion.div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            <AnimatePresence>
              {history.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  className={`p-5 rounded-xl border transition-all ${
                    entry.is_cured 
                      ? 'bg-health-green/5 border-health-green/30' 
                      : 'bg-secondary/40 border-border/50 hover:border-primary/30'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <AnimatePresence>
                          {entry.is_cured && (
                            <motion.span 
                              className="text-xs font-medium px-2.5 py-1 rounded-full bg-health-green/20 text-health-green flex items-center gap-1"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Cured
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          entry.urgency_level === 'Emergency' 
                            ? 'bg-destructive/20 text-destructive' 
                            : entry.urgency_level === 'Urgent'
                            ? 'bg-health-orange/20 text-health-orange'
                            : 'bg-health-green/20 text-health-green'
                        }`}>
                          {entry.urgency_level}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className={`text-sm line-clamp-2 ${entry.is_cured ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {entry.symptoms}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleCured(entry.id, entry.is_cured)}
                          disabled={togglingCuredId === entry.id}
                          className={`h-9 w-9 rounded-lg ${entry.is_cured ? 'text-health-green hover:text-health-green hover:bg-health-green/10' : 'text-muted-foreground hover:text-health-green hover:bg-health-green/10'}`}
                          title={entry.is_cured ? 'Mark as not cured' : 'Mark as cured'}
                        >
                          {togglingCuredId === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : entry.is_cured ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(entry.id)}
                          className="h-9 w-9 rounded-lg"
                        >
                          <motion.div
                            animate={{ rotate: expandedId === entry.id ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </motion.div>
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === entry.id && (
                      <motion.div 
                        className="mt-4 pt-4 border-t border-border/50 space-y-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-gradient-primary rounded-full" />
                            Possible Conditions
                          </h4>
                          <div className="space-y-2">
                            {entry.possible_conditions.map((condition, idx) => (
                              <motion.div 
                                key={idx} 
                                className="text-sm p-3 rounded-lg bg-secondary/30"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                              >
                                <span className="font-medium">{condition.name}</span>
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                  condition.likelihood === 'High' 
                                    ? 'bg-health-orange/20 text-health-orange' 
                                    : condition.likelihood === 'Medium'
                                    ? 'bg-health-blue/20 text-health-blue'
                                    : 'bg-health-green/20 text-health-green'
                                }`}>
                                  {condition.likelihood}
                                </span>
                                <p className="text-muted-foreground mt-1">{condition.description}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-gradient-to-b from-health-green to-health-teal rounded-full" />
                            Recommendations
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-2">
                            {entry.recommendations.map((rec, idx) => (
                              <motion.li 
                                key={idx} 
                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                              >
                                <motion.span 
                                  className="w-1.5 h-1.5 rounded-full bg-primary mt-2"
                                  animate={{ scale: [1, 1.3, 1] }}
                                  transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                                />
                                <span>{rec}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                        {entry.is_cured && entry.cured_at && (
                          <motion.div 
                            className="text-xs text-health-green flex items-center gap-2 bg-health-green/10 p-3 rounded-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Marked as cured on {format(new Date(entry.cured_at), 'MMM d, yyyy')}
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
