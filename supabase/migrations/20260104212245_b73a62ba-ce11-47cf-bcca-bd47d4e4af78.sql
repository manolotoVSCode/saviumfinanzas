-- Añadir campo para diferenciar frecuencia de seguimiento
ALTER TABLE public.categorias 
ADD COLUMN frecuencia_seguimiento text DEFAULT NULL;

COMMENT ON COLUMN public.categorias.frecuencia_seguimiento IS 'Frecuencia de seguimiento: mensual, anual, null (sin seguimiento)';