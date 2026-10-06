-- Vistas para que la web y la app iOS lean saldos y patrimonio calculados en un
-- solo sitio. Mismas reglas que computeAccountBalances y computeDashboardMetrics
-- (src/lib/finance). security_invoker = true: se aplican las RLS de cuentas y
-- transacciones del usuario que consulta.

CREATE VIEW public.saldos_cuentas
WITH (security_invoker = true) AS
SELECT
  c.*,
  c.saldo_inicial + COALESCE(m.movimientos, 0) AS saldo_actual
FROM public.cuentas c
LEFT JOIN (
  SELECT cuenta_id, SUM(COALESCE(ingreso, 0) - COALESCE(gasto, 0)) AS movimientos
  FROM public.transacciones
  GROUP BY cuenta_id
) m ON m.cuenta_id = c.id;

-- Una fila por (usuario, divisa, rubro). Activos sin cuentas vendidas; pasivos =
-- parte negativa del saldo de tarjetas e hipotecas, en positivo (sin filtrar
-- vendidas, como hoy). Divisa vacía = MXN; otras divisas no entran.
-- user_id está para poder filtrar desde el SQL Editor (que ignora RLS).
CREATE VIEW public.patrimonio_por_divisa
WITH (security_invoker = true) AS
WITH clasificadas AS (
  SELECT
    user_id,
    COALESCE(NULLIF(divisa, ''), 'MXN') AS divisa,
    COALESCE(vendida, false) AS vendida,
    CASE
      WHEN tipo IN ('Efectivo', 'Banco', 'Ahorros') THEN 'efectivo_bancos'
      WHEN tipo = 'Inversiones' THEN 'inversiones'
      WHEN tipo = 'Empresa Propia' THEN 'empresas_privadas'
      WHEN tipo = 'Bien Raíz' THEN 'bien_raiz'
      WHEN tipo = 'Tarjeta de Crédito' THEN 'tarjetas_credito'
      WHEN tipo = 'Hipoteca' THEN 'hipoteca'
    END AS rubro,
    CASE WHEN tipo IN ('Tarjeta de Crédito', 'Hipoteca') THEN 'pasivo' ELSE 'activo' END AS clase,
    CASE
      WHEN tipo IN ('Tarjeta de Crédito', 'Hipoteca') THEN ABS(LEAST(0, saldo_actual))
      ELSE saldo_actual
    END AS importe
  FROM public.saldos_cuentas
)
SELECT user_id, divisa, clase, rubro, SUM(importe) AS importe
FROM clasificadas
WHERE rubro IS NOT NULL
  AND divisa IN ('MXN', 'USD', 'EUR')
  AND NOT (clase = 'activo' AND vendida)
GROUP BY user_id, divisa, clase, rubro;

GRANT SELECT ON public.saldos_cuentas TO authenticated;
GRANT SELECT ON public.patrimonio_por_divisa TO authenticated;
GRANT ALL ON public.saldos_cuentas TO service_role;
GRANT ALL ON public.patrimonio_por_divisa TO service_role;

-- Que PostgREST vea las vistas nuevas sin esperar a la recarga automática.
NOTIFY pgrst, 'reload schema';
