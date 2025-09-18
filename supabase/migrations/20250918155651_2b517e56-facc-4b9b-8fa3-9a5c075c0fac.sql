-- First, delete any existing 'Reembolso' categories and reassign transactions to a default category
-- Get or create 'SIN ASIGNAR' categories for each user before deleting reembolso categories
DO $$
DECLARE
    user_record RECORD;
    sin_asignar_id uuid;
BEGIN
    -- For each user with reembolso categories
    FOR user_record IN 
        SELECT DISTINCT user_id FROM public.categorias WHERE tipo = 'Reembolso'
    LOOP
        -- Get or create SIN ASIGNAR category for this user
        sin_asignar_id := public.ensure_sin_asignar_category(user_record.user_id);
        
        -- Update transactions that use reembolso categories to use sin_asignar
        UPDATE public.transacciones 
        SET subcategoria_id = sin_asignar_id
        WHERE subcategoria_id IN (
            SELECT id FROM public.categorias 
            WHERE user_id = user_record.user_id AND tipo = 'Reembolso'
        );
    END LOOP;
END $$;

-- Now delete all reembolso categories
DELETE FROM public.categorias WHERE tipo = 'Reembolso';

-- Remove the old constraint and add the new one without 'Reembolso'
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;
ALTER TABLE public.categorias ADD CONSTRAINT categorias_tipo_check 
CHECK (tipo IS NULL OR tipo IN ('Ingreso', 'Gastos', 'Aportación'));