-- CLABE interbancaria de la cuenta (18 dígitos, sin espacios). La web valida
-- el dígito de control (src/lib/finance/clabe.ts); aquí solo el formato.
ALTER TABLE public.cuentas
  ADD COLUMN clabe TEXT CHECK (clabe ~ '^[0-9]{18}$');

-- saldos_cuentas lista columnas explícitas: se añade clabe al final para que
-- CREATE OR REPLACE no choque y la app iOS, que pide columnas por nombre, siga igual.
CREATE OR REPLACE VIEW public.saldos_cuentas
WITH (security_invoker = true) AS
SELECT
  c.id, c.user_id, c.nombre, c.tipo, c.saldo_inicial, c.divisa, c.valor_mercado,
  c.rendimiento_mensual, c.created_at, c.updated_at, c.tipo_inversion, c.modalidad,
  c.rendimiento_bruto, c.rendimiento_neto, c.fecha_inicio, c.ultimo_pago, c.vendida,
  c.saldo_inicial + COALESCE(m.movimientos, 0) AS saldo_actual,
  COALESCE(m.capital_neto, 0) AS capital_neto,
  c.clabe
FROM public.cuentas c
LEFT JOIN (
  SELECT
    t.cuenta_id,
    SUM(COALESCE(t.ingreso, 0) - COALESCE(t.gasto, 0)) AS movimientos,
    SUM(CASE WHEN cat.tipo IN ('Aportación', 'Retiro')
             THEN COALESCE(t.ingreso, 0) - COALESCE(t.gasto, 0) ELSE 0 END) AS capital_neto
  FROM public.transacciones t
  LEFT JOIN public.categorias cat ON cat.id = t.subcategoria_id
  GROUP BY t.cuenta_id
) m ON m.cuenta_id = c.id;

NOTIFY pgrst, 'reload schema';
