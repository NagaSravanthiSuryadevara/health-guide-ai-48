-- Create symptom_history table
CREATE TABLE public.symptom_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symptoms TEXT NOT NULL,
  possible_conditions JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  urgency_level TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.symptom_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own symptom history" 
ON public.symptom_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own symptom history" 
ON public.symptom_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptom history" 
ON public.symptom_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_symptom_history_user_id ON public.symptom_history(user_id);
CREATE INDEX idx_symptom_history_created_at ON public.symptom_history(created_at DESC);