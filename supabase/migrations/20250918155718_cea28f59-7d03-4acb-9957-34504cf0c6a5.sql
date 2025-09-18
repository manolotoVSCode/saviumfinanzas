-- First check current constraint
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'categorias_tipo_check';

-- Remove the constraint temporarily to see all data
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;

-- Update any 'Reembolso' types to 'Gastos' to preserve functionality
UPDATE public.categorias SET tipo = 'Gastos' WHERE tipo = 'Reembolso';

-- Now add constraint including all existing valid types
ALTER TABLE public.categorias ADD CONSTRAINT categorias_tipo_check 
CHECK (tipo IS NULL OR tipo IN ('Ingreso', 'Gastos', 'Aportación', 'Retiro'));