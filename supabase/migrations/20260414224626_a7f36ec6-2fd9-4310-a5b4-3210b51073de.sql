-- Add name column to classification_rules table
ALTER TABLE public.classification_rules 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.classification_rules.name IS 'Nombre descriptivo de la regla para identificación rápida';