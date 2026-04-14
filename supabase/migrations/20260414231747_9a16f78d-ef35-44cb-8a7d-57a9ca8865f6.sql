ALTER TABLE public.classification_rules 
ADD COLUMN IF NOT EXISTS cuenta_id UUID REFERENCES public.cuentas(id) ON DELETE SET NULL;