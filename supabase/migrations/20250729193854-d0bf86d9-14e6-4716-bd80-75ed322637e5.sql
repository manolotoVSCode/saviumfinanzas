-- Add "Bien Raíz" to the allowed account types
-- First, drop the existing check constraint if it exists
ALTER TABLE public.cuentas DROP CONSTRAINT IF EXISTS cuentas_tipo_check;

-- Add the new check constraint with "Bien Raíz" included
ALTER TABLE public.cuentas ADD CONSTRAINT cuentas_tipo_check 
CHECK (tipo IN ('Efectivo', 'Líquido', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia', 'Bien Raíz'));