-- 1. Add tipo_cuenta column to profiles (personal or empresa, defaults to personal)
ALTER TABLE public.profiles 
ADD COLUMN tipo_cuenta text NOT NULL DEFAULT 'personal' 
CHECK (tipo_cuenta IN ('personal', 'empresa'));

-- 2. Create clientes table (for accounts receivable)
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  rfc text,
  email text,
  telefono text,
  direccion text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clientes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create proveedores table (for accounts payable)
CREATE TABLE public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  rfc text,
  email text,
  telefono text,
  direccion text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suppliers" ON public.proveedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own suppliers" ON public.proveedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suppliers" ON public.proveedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own suppliers" ON public.proveedores FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create facturas table (invoices - both issued and received)
CREATE TABLE public.facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('emitida', 'recibida')),
  numero_factura text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
  fecha_emision date NOT NULL,
  fecha_vencimiento date NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  iva numeric NOT NULL DEFAULT 0,
  isr_retenido numeric NOT NULL DEFAULT 0,
  iva_retenido numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  monto_pagado numeric NOT NULL DEFAULT 0,
  estatus text NOT NULL DEFAULT 'pendiente' CHECK (estatus IN ('pendiente', 'parcial', 'pagada', 'cancelada', 'vencida')),
  concepto text,
  notas text,
  divisa text NOT NULL DEFAULT 'MXN',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" ON public.facturas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own invoices" ON public.facturas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON public.facturas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON public.facturas FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON public.facturas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create indexes for better query performance
CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_proveedores_user_id ON public.proveedores(user_id);
CREATE INDEX idx_facturas_user_id ON public.facturas(user_id);
CREATE INDEX idx_facturas_cliente_id ON public.facturas(cliente_id);
CREATE INDEX idx_facturas_proveedor_id ON public.facturas(proveedor_id);
CREATE INDEX idx_facturas_fecha_vencimiento ON public.facturas(fecha_vencimiento);
CREATE INDEX idx_facturas_estatus ON public.facturas(estatus);
CREATE INDEX idx_facturas_tipo ON public.facturas(tipo);

-- 6. Create view for accounts receivable aging (CxC)
CREATE OR REPLACE VIEW public.cuentas_por_cobrar_aging AS
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

-- 7. Create view for accounts payable (CxP)
CREATE OR REPLACE VIEW public.cuentas_por_pagar_aging AS
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

-- 8. Function to calculate business dashboard metrics
CREATE OR REPLACE FUNCTION public.get_business_dashboard_metrics(
  p_user_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_start_date date;
  v_end_date date;
BEGIN
  -- Default to current month if no dates provided
  v_start_date := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::date);
  v_end_date := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date);

  WITH 
  -- Bank balances
  bank_balances AS (
    SELECT 
      COALESCE(SUM(c.saldo_inicial), 0) + 
      COALESCE(SUM(
        (SELECT COALESCE(SUM(t.ingreso - t.gasto), 0) 
         FROM transacciones t 
         WHERE t.cuenta_id = c.id)
      ), 0) as total_bancos
    FROM cuentas c
    WHERE c.user_id = p_user_id AND c.tipo IN ('Banco', 'Líquido')
  ),
  -- Accounts receivable by aging
  cxc_aging AS (
    SELECT 
      aging_bucket,
      SUM(saldo_pendiente) as total
    FROM cuentas_por_cobrar_aging
    WHERE user_id = p_user_id
    GROUP BY aging_bucket
  ),
  -- Accounts payable summary
  cxp_summary AS (
    SELECT 
      aging_bucket,
      SUM(saldo_pendiente) as total
    FROM cuentas_por_pagar_aging
    WHERE user_id = p_user_id
    GROUP BY aging_bucket
  ),
  -- Income and expenses for period
  period_pl AS (
    SELECT 
      COALESCE(SUM(t.ingreso), 0) as ingresos,
      COALESCE(SUM(t.gasto), 0) as gastos
    FROM transacciones t
    WHERE t.user_id = p_user_id 
      AND t.fecha BETWEEN v_start_date AND v_end_date
  ),
  -- Monthly comparison (last 6 months)
  monthly_comparison AS (
    SELECT 
      date_trunc('month', t.fecha)::date as mes,
      SUM(t.ingreso) as ingresos,
      SUM(t.gasto) as gastos
    FROM transacciones t
    WHERE t.user_id = p_user_id 
      AND t.fecha >= (CURRENT_DATE - interval '6 months')
    GROUP BY date_trunc('month', t.fecha)
    ORDER BY mes
  ),
  -- Expenses by category
  gastos_categoria AS (
    SELECT 
      cat.categoria,
      SUM(t.gasto) as total
    FROM transacciones t
    JOIN categorias cat ON t.subcategoria_id = cat.id
    WHERE t.user_id = p_user_id 
      AND t.fecha BETWEEN v_start_date AND v_end_date
      AND t.gasto > 0
    GROUP BY cat.categoria
    ORDER BY total DESC
    LIMIT 10
  ),
  -- Invoice stats
  invoice_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE tipo = 'emitida') as facturas_emitidas,
      COUNT(*) FILTER (WHERE tipo = 'emitida' AND estatus = 'cancelada') as facturas_canceladas,
      COUNT(*) FILTER (WHERE tipo = 'emitida' AND estatus = 'pendiente') as facturas_pendientes,
      SUM(iva) FILTER (WHERE tipo = 'emitida' AND fecha_emision BETWEEN v_start_date AND v_end_date) as iva_cobrado,
      SUM(iva) FILTER (WHERE tipo = 'recibida' AND fecha_emision BETWEEN v_start_date AND v_end_date) as iva_pagado,
      SUM(isr_retenido) FILTER (WHERE fecha_emision BETWEEN v_start_date AND v_end_date) as isr_retenido
    FROM facturas
    WHERE user_id = p_user_id
  ),
  -- DSO calculation (Days Sales Outstanding)
  dso_calc AS (
    SELECT 
      CASE 
        WHEN COALESCE(SUM(total), 0) = 0 THEN 0
        ELSE ROUND(
          (SUM(saldo_pendiente) / (COALESCE(NULLIF(SUM(total), 0), 1) / 30.0))::numeric, 
          1
        )
      END as dso
    FROM cuentas_por_cobrar_aging
    WHERE user_id = p_user_id
  )
  SELECT jsonb_build_object(
    'saldo_bancos', (SELECT total_bancos FROM bank_balances),
    'cxc_aging', (SELECT jsonb_object_agg(aging_bucket, total) FROM cxc_aging),
    'cxc_total', (SELECT COALESCE(SUM(total), 0) FROM cxc_aging),
    'cxp_aging', (SELECT jsonb_object_agg(aging_bucket, total) FROM cxp_summary),
    'cxp_total', (SELECT COALESCE(SUM(total), 0) FROM cxp_summary),
    'ingresos_periodo', (SELECT ingresos FROM period_pl),
    'gastos_periodo', (SELECT gastos FROM period_pl),
    'utilidad_neta', (SELECT ingresos - gastos FROM period_pl),
    'margen_neto', (SELECT CASE WHEN ingresos = 0 THEN 0 ELSE ROUND(((ingresos - gastos) / ingresos * 100)::numeric, 2) END FROM period_pl),
    'monthly_comparison', (SELECT jsonb_agg(jsonb_build_object('mes', mes, 'ingresos', ingresos, 'gastos', gastos)) FROM monthly_comparison),
    'gastos_categoria', (SELECT jsonb_agg(jsonb_build_object('categoria', categoria, 'total', total)) FROM gastos_categoria),
    'facturas_emitidas', (SELECT facturas_emitidas FROM invoice_stats),
    'facturas_canceladas', (SELECT facturas_canceladas FROM invoice_stats),
    'facturas_pendientes', (SELECT facturas_pendientes FROM invoice_stats),
    'iva_por_pagar', (SELECT GREATEST(0, COALESCE(iva_cobrado, 0) - COALESCE(iva_pagado, 0)) FROM invoice_stats),
    'isr_retenido', (SELECT COALESCE(isr_retenido, 0) FROM invoice_stats),
    'dso', (SELECT dso FROM dso_calc),
    'periodo', jsonb_build_object('inicio', v_start_date, 'fin', v_end_date)
  ) INTO result;

  RETURN result;
END;
$$;