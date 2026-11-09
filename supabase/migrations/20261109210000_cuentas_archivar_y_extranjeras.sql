-- Cuentas archivadas (se ocultan en la lista de Cuentas salvo que se pida verlas)
-- y datos para identificar cuentas de otros países. Todo se guarda sin espacios
-- y en mayúsculas; la web valida los dígitos de control (src/lib/finance/datosBancarios.ts),
-- aquí solo el formato.
ALTER TABLE public.cuentas
  ADD COLUMN archivada BOOLEAN NOT NULL DEFAULT false,
  -- País del banco, ISO 3166 de 2 letras; NULL = México. 'ZZ' = otro país.
  ADD COLUMN pais TEXT CHECK (pais ~ '^[A-Z]{2}$'),
  ADD COLUMN banco TEXT CHECK (char_length(banco) <= 100),
  ADD COLUMN numero_cuenta TEXT CHECK (numero_cuenta ~ '^[A-Z0-9]{4,34}$'),
  -- Routing number ABA en EE. UU.; código del banco o sucursal en otros países.
  ADD COLUMN routing TEXT CHECK (routing ~ '^[A-Z0-9]{3,20}$'),
  ADD COLUMN iban TEXT CHECK (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  ADD COLUMN swift TEXT CHECK (swift ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$');

-- saldos_cuentas lista columnas explícitas: las nuevas van al final para que
-- CREATE OR REPLACE no choque y la app iOS, que pide columnas por nombre, siga igual.
CREATE OR REPLACE VIEW public.saldos_cuentas
WITH (security_invoker = true) AS
SELECT
  c.id, c.user_id, c.nombre, c.tipo, c.saldo_inicial, c.divisa, c.valor_mercado,
  c.rendimiento_mensual, c.created_at, c.updated_at, c.tipo_inversion, c.modalidad,
  c.rendimiento_bruto, c.rendimiento_neto, c.fecha_inicio, c.ultimo_pago, c.vendida,
  c.saldo_inicial + COALESCE(m.movimientos, 0) AS saldo_actual,
  COALESCE(m.capital_neto, 0) AS capital_neto,
  c.clabe,
  c.archivada, c.pais, c.banco, c.numero_cuenta, c.routing, c.iban, c.swift
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
