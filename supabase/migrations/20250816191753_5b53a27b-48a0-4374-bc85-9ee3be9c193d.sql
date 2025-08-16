-- Add seguimiento_pago field to categorias table
ALTER TABLE public.categorias 
ADD COLUMN seguimiento_pago BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to explain the field
COMMENT ON COLUMN public.categorias.seguimiento_pago IS 'Indica si esta categoría de ingreso debe incluirse en el seguimiento de pagos recurrentes';