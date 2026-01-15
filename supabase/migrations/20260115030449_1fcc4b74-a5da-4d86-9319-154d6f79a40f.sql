-- Fix security definer views by recreating them as SECURITY INVOKER (default)
-- The underlying tables already have RLS, so the views will inherit that security

DROP VIEW IF EXISTS public.cuentas_por_cobrar_aging;
DROP VIEW IF EXISTS public.cuentas_por_pagar_aging;

-- Recreate view for accounts receivable aging (CxC) - now uses SECURITY INVOKER by default
CREATE VIEW public.cuentas_por_cobrar_aging 
WITH (security_invoker = true) AS
SELECT 
  f.user_id,
  f.id as factura_id,
  f.numero_factura,
  c.nombre as cliente_nombre,
  f.fecha_emision,
  f.fecha_vencimiento,
  f.total,
  f.monto_pagado,
  (f.total - f.monto_pagado) as saldo_pendiente,
  f.divisa,
  CASE 
    WHEN f.fecha_vencimiento >= CURRENT_DATE THEN '0-30'
    WHEN CURRENT_DATE - f.fecha_vencimiento <= 30 THEN '1-30'
    WHEN CURRENT_DATE - f.fecha_vencimiento <= 60 THEN '31-60'
    WHEN CURRENT_DATE - f.fecha_vencimiento <= 90 THEN '61-90'
    ELSE '+90'
  END as aging_bucket,
  GREATEST(0, CURRENT_DATE - f.fecha_vencimiento) as dias_vencidos
FROM public.facturas f
LEFT JOIN public.clientes c ON f.cliente_id = c.id
WHERE f.tipo = 'emitida' 
  AND f.estatus NOT IN ('pagada', 'cancelada')
  AND (f.total - f.monto_pagado) > 0;

-- Recreate view for accounts payable (CxP) - now uses SECURITY INVOKER by default
CREATE VIEW public.cuentas_por_pagar_aging 
WITH (security_invoker = true) AS
SELECT 
  f.user_id,
  f.id as factura_id,
  f.numero_factura,
  p.nombre as proveedor_nombre,
  f.fecha_emision,
  f.fecha_vencimiento,
  f.total,
  f.monto_pagado,
  (f.total - f.monto_pagado) as saldo_pendiente,
  f.divisa,
  CASE 
    WHEN f.fecha_vencimiento >= CURRENT_DATE THEN 'vigente'
    WHEN CURRENT_DATE - f.fecha_vencimiento <= 30 THEN '1-30 vencido'
    WHEN CURRENT_DATE - f.fecha_vencimiento <= 60 THEN '31-60 vencido'
    ELSE '+60 vencido'
  END as aging_bucket,
  GREATEST(0, CURRENT_DATE - f.fecha_vencimiento) as dias_vencidos
FROM public.facturas f
LEFT JOIN public.proveedores p ON f.proveedor_id = p.id
WHERE f.tipo = 'recibida' 
  AND f.estatus NOT IN ('pagada', 'cancelada')
  AND (f.total - f.monto_pagado) > 0;