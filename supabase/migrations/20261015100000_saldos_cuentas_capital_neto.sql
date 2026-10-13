-- capital_neto: movimientos de la cuenta con categoría de tipo Aportación menos los
-- de tipo Retiro. Inversiones lo suma al capital invertido de las inversiones
-- vinculadas, para que meter o sacar dinero no cuente como rendimiento.
-- Columna añadida al final: la app iOS 1.3 pide columnas explícitas y sigue igual.
-- Columnas de cuentas explícitas (no c.*) para que CREATE OR REPLACE no choque si
-- cuentas gana columnas.

CREATE OR REPLACE VIEW public.saldos_cuentas
WITH (security_invoker = true) AS
SELECT
  c.id, c.user_id, c.nombre, c.tipo, c.saldo_inicial, c.divisa, c.valor_mercado,
  c.rendimiento_mensual, c.created_at, c.updated_at, c.tipo_inversion, c.modalidad,
  c.rendimiento_bruto, c.rendimiento_neto, c.fecha_inicio, c.ultimo_pago, c.vendida,
  c.saldo_inicial + COALESCE(m.movimientos, 0) AS saldo_actual,
  COALESCE(m.capital_neto, 0) AS capital_neto
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
