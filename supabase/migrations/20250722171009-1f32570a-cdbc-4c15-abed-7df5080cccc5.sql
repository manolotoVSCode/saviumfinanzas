-- Agregar campos específicos de inversiones a la tabla cuentas
ALTER TABLE public.cuentas 
ADD COLUMN tipo_inversion TEXT CHECK (tipo_inversion IN ('Interés fijo', 'Fondo variable', 'Criptomoneda')),
ADD COLUMN modalidad TEXT CHECK (modalidad IN ('Reinversión', 'Pago mensual', 'Pago trimestral')),
ADD COLUMN rendimiento_bruto NUMERIC DEFAULT NULL,
ADD COLUMN rendimiento_neto NUMERIC DEFAULT NULL,
ADD COLUMN fecha_inicio DATE DEFAULT NULL,
ADD COLUMN ultimo_pago DATE DEFAULT NULL;