-- Revertir todo lo relacionado con la versión Empresa

-- 1. Eliminar función del trigger de inventario
DROP FUNCTION IF EXISTS public.actualizar_inventario_en_movimiento() CASCADE;

-- 2. Eliminar función de métricas de negocio
DROP FUNCTION IF EXISTS public.get_business_dashboard_metrics(uuid, date, date) CASCADE;

-- 3. Eliminar vistas
DROP VIEW IF EXISTS public.rentabilidad_proyectos CASCADE;
DROP VIEW IF EXISTS public.cuentas_por_cobrar_aging CASCADE;
DROP VIEW IF EXISTS public.cuentas_por_pagar_aging CASCADE;

-- 4. Eliminar columna proyecto_id de transacciones (si existe)
ALTER TABLE public.transacciones DROP COLUMN IF EXISTS proyecto_id;

-- 5. Eliminar columnas de categorias
ALTER TABLE public.categorias DROP COLUMN IF EXISTS sat_codigo;
ALTER TABLE public.categorias DROP COLUMN IF EXISTS es_costo_directo;

-- 6. Eliminar tabla movimientos_inventario
DROP TABLE IF EXISTS public.movimientos_inventario CASCADE;

-- 7. Eliminar tabla inventario
DROP TABLE IF EXISTS public.inventario CASCADE;

-- 8. Eliminar tabla facturas
DROP TABLE IF EXISTS public.facturas CASCADE;

-- 9. Eliminar tabla proyectos
DROP TABLE IF EXISTS public.proyectos CASCADE;

-- 10. Eliminar tabla proveedores
DROP TABLE IF EXISTS public.proveedores CASCADE;

-- 11. Eliminar tabla clientes
DROP TABLE IF EXISTS public.clientes CASCADE;

-- 12. Eliminar tabla sat_cuentas
DROP TABLE IF EXISTS public.sat_cuentas CASCADE;

-- 13. Eliminar columna tipo_cuenta de profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tipo_cuenta;