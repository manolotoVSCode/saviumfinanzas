-- Revisar y corregir la constraint de la tabla cuentas
-- Primero, eliminar la constraint actual que está causando problemas
ALTER TABLE public.cuentas DROP CONSTRAINT IF EXISTS cuentas_tipo_check;

-- Crear una nueva constraint que permita los valores correctos
ALTER TABLE public.cuentas ADD CONSTRAINT cuentas_tipo_check 
CHECK (tipo IN ('Líquido', 'Pasivo', 'Inversiones', 'Activo'));

-- También vamos a verificar si hay otros valores que puedan estar causando problemas
-- y actualizar la función que crea datos de muestra para usar valores válidos