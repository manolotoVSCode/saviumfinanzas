-- Agregar campo divisa_compra a la tabla criptomonedas
ALTER TABLE public.criptomonedas 
ADD COLUMN divisa_compra TEXT NOT NULL DEFAULT 'USD';

-- Renombrar el campo precio_compra_usd para ser más genérico
ALTER TABLE public.criptomonedas 
RENAME COLUMN precio_compra_usd TO precio_compra;

-- Agregar constraint para validar divisas permitidas
ALTER TABLE public.criptomonedas 
ADD CONSTRAINT criptomonedas_divisa_compra_check 
CHECK (divisa_compra IN ('USD', 'EUR'));