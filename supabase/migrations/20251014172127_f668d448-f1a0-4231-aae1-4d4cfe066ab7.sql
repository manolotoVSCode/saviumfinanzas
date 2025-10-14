-- Actualizar el check constraint para incluir todos los tipos válidos
-- Primero eliminamos el constraint existente
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;

-- Creamos el nuevo constraint que incluye todos los tipos: Ingreso, Gastos, Aportación, Reembolso, y Retiro
ALTER TABLE public.categorias 
ADD CONSTRAINT categorias_tipo_check 
CHECK (tipo IS NULL OR tipo IN ('Ingreso', 'Gastos', 'Aportación', 'Reembolso', 'Retiro'));