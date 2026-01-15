-- Corregir seguridad de la vista rentabilidad_proyectos
DROP VIEW IF EXISTS public.rentabilidad_proyectos;

CREATE VIEW public.rentabilidad_proyectos 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.user_id,
  p.codigo,
  p.nombre,
  p.tipo,
  p.estatus,
  c.nombre as cliente_nombre,
  p.fecha_inicio,
  p.fecha_fin,
  COALESCE(ingresos.total, 0) as ingresos_total,
  COALESCE(gastos.total, 0) as gastos_directos,
  COALESCE(inventario.total, 0) as costo_inventario,
  COALESCE(ingresos.total, 0) - COALESCE(gastos.total, 0) - COALESCE(inventario.total, 0) as utilidad_bruta,
  CASE 
    WHEN COALESCE(ingresos.total, 0) > 0 
    THEN ROUND(((COALESCE(ingresos.total, 0) - COALESCE(gastos.total, 0) - COALESCE(inventario.total, 0)) / COALESCE(ingresos.total, 0) * 100)::numeric, 2)
    ELSE 0 
  END as margen_porcentaje
FROM public.proyectos p
LEFT JOIN public.clientes c ON p.cliente_id = c.id
LEFT JOIN (
  SELECT proyecto_id, SUM(total) as total
  FROM public.facturas
  WHERE tipo = 'emitida' AND estatus != 'cancelada'
  GROUP BY proyecto_id
) ingresos ON p.id = ingresos.proyecto_id
LEFT JOIN (
  SELECT proyecto_id, SUM(gasto) as total
  FROM public.transacciones
  WHERE proyecto_id IS NOT NULL
  GROUP BY proyecto_id
) gastos ON p.id = gastos.proyecto_id
LEFT JOIN (
  SELECT proyecto_id, SUM(costo_total) as total
  FROM public.movimientos_inventario
  WHERE tipo = 'salida' AND proyecto_id IS NOT NULL
  GROUP BY proyecto_id
) inventario ON p.id = inventario.proyecto_id;

-- Habilitar RLS en sat_cuentas (catálogo público de solo lectura)
ALTER TABLE public.sat_cuentas ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para el catálogo SAT
CREATE POLICY "SAT catalog is readable by authenticated users"
  ON public.sat_cuentas FOR SELECT
  TO authenticated
  USING (true);