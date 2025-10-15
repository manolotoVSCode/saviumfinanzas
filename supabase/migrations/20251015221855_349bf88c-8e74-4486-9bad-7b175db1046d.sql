-- Create table for financial health history
CREATE TABLE IF NOT EXISTS public.financial_health_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  fecha date NOT NULL,
  score integer NOT NULL,
  liquidez_score integer NOT NULL,
  ahorro_score integer NOT NULL,
  diversificacion_score integer NOT NULL,
  endeudamiento_score integer NOT NULL,
  rendimiento_inversiones_score integer NOT NULL,
  liquidez_ratio numeric,
  ahorro_ratio numeric,
  endeudamiento_ratio numeric,
  rendimiento_inversiones numeric,
  activos_total numeric,
  pasivos_total numeric,
  balance_mensual numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_health_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own financial health history"
ON public.financial_health_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial health history"
ON public.financial_health_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial health history"
ON public.financial_health_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial health history"
ON public.financial_health_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financial_health_history_updated_at
BEFORE UPDATE ON public.financial_health_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_financial_health_history_user_fecha ON public.financial_health_history(user_id, fecha DESC);