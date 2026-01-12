-- Add is_cured column to symptom_history table
ALTER TABLE public.symptom_history 
ADD COLUMN is_cured boolean DEFAULT false;

-- Add cured_at timestamp column
ALTER TABLE public.symptom_history 
ADD COLUMN cured_at timestamp with time zone DEFAULT NULL;