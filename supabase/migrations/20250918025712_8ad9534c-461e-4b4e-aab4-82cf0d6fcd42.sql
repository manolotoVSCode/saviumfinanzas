-- Add sold field to cuentas table for real estate properties
ALTER TABLE public.cuentas 
ADD COLUMN vendida BOOLEAN NOT NULL DEFAULT false;

-- Add index for better performance when filtering sold properties
CREATE INDEX idx_cuentas_vendida ON public.cuentas(vendida) WHERE tipo = 'Bien Raíz';