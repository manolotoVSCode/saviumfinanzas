-- Datos ficticios para la cuenta de revisión de Apple (apple_user@manoloto.com).
-- SOLO toca el user_id 4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418: el SQL Editor ignora RLS y en la
-- base hay otras cuentas (la del usuario es 01ad1bcc-…; nunca debe aparecer aquí).
-- Las fechas son relativas a hoy para que «mes anterior» y «próximos pagos» siempre tengan datos.
-- Para regenerar: borrar primero las filas de ese user_id (bloque al final, comentado).

DO $$
DECLARE
  u constant uuid := '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418';
  hoy constant date := current_date;
  mes_ant constant date := (date_trunc('month', current_date) - interval '1 month')::date;  -- día 1 del mes anterior
  mes_ant2 constant date := (date_trunc('month', current_date) - interval '2 month')::date;
  mes_act constant date := date_trunc('month', current_date)::date;
  c_sueldo uuid; c_super uuid; c_rest uuid; c_gas uuid; c_luz uuid; c_internet uuid; c_streaming uuid; c_pago_tc uuid;
  a_banco uuid; a_efectivo uuid; a_tarjeta uuid; a_inversion uuid; a_usd uuid; a_depto uuid; a_hipoteca uuid;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = u) IS DISTINCT FROM 'apple_user@manoloto.com' THEN
    RAISE EXCEPTION 'El user_id no es la cuenta de revisión de Apple';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cuentas WHERE user_id = u) THEN
    RAISE EXCEPTION 'La cuenta de revisión ya tiene datos: bórralos antes de volver a cargar';
  END IF;

  INSERT INTO public.profiles (user_id, nombre, apellidos, divisa_preferida) VALUES (u, 'Revisión', 'Apple', 'MXN')
    ON CONFLICT DO NOTHING;

  -- Categorías
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Ingresos', 'Nómina', 'Ingreso') RETURNING id INTO c_sueldo;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Alimentación', 'Supermercado', 'Gastos') RETURNING id INTO c_super;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Alimentación', 'Restaurantes', 'Gastos') RETURNING id INTO c_rest;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Transporte', 'Gasolina', 'Gastos') RETURNING id INTO c_gas;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Hogar', 'Luz', 'Gastos') RETURNING id INTO c_luz;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Servicios', 'Internet', 'Gastos') RETURNING id INTO c_internet;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Ocio y tiempo libre', 'Streaming', 'Gastos') RETURNING id INTO c_streaming;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Movimientos', 'Abono tarjeta de crédito', 'Aportación') RETURNING id INTO c_pago_tc;

  -- Cuentas (saldo inicial; el saldo actual lo calcula la vista saldos_cuentas)
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Banco Principal', 'Banco', 'MXN', 85000) RETURNING id INTO a_banco;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Efectivo', 'Efectivo', 'MXN', 2500) RETURNING id INTO a_efectivo;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Tarjeta de crédito', 'Tarjeta de Crédito', 'MXN', 0) RETURNING id INTO a_tarjeta;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Fondo de inversión', 'Inversiones', 'MXN', 150000) RETURNING id INTO a_inversion;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Cuenta en dólares', 'Banco', 'USD', 3000) RETURNING id INTO a_usd;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Departamento', 'Bien Raíz', 'MXN', 2500000) RETURNING id INTO a_depto;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Hipoteca', 'Hipoteca', 'MXN', -1200000) RETURNING id INTO a_hipoteca;

  -- Movimientos: dos meses completos + el mes en curso (se evita el día 1)
  INSERT INTO public.transacciones (user_id, cuenta_id, subcategoria_id, fecha, comentario, ingreso, gasto, divisa) VALUES
    (u, a_banco,    c_sueldo,    mes_ant2 + 14, 'Nómina',                   45000, 0,    'MXN'),
    (u, a_banco,    c_luz,       mes_ant2 + 4,  'Recibo de luz',            0,     640,  'MXN'),
    (u, a_banco,    c_internet,  mes_ant2 + 7,  'Internet hogar',           0,     599,  'MXN'),
    (u, a_tarjeta,  c_super,     mes_ant2 + 9,  'Supermercado semanal',     0,     2180, 'MXN'),
    (u, a_banco,    c_sueldo,    mes_ant + 14,  'Nómina',                   45000, 0,    'MXN'),
    (u, a_banco,    c_luz,       mes_ant + 4,   'Recibo de luz',            0,     655,  'MXN'),
    (u, a_banco,    c_internet,  mes_ant + 7,   'Internet hogar',           0,     599,  'MXN'),
    (u, a_tarjeta,  c_super,     mes_ant + 2,   'Supermercado semanal',     0,     2350, 'MXN'),
    (u, a_tarjeta,  c_super,     mes_ant + 16,  'Supermercado semanal',     0,     1980, 'MXN'),
    (u, a_tarjeta,  c_rest,      mes_ant + 10,  'Cena con amigos',          0,     890,  'MXN'),
    (u, a_tarjeta,  c_gas,       mes_ant + 12,  'Gasolina',                 0,     1200, 'MXN'),
    (u, a_tarjeta,  c_streaming, mes_ant + 11,  'Plataforma de video',      0,     229,  'MXN'),
    (u, a_tarjeta,  c_rest,      mes_ant + 20,  'Reembolso cena de trabajo', 450,  0,    'MXN'),
    (u, a_tarjeta,  c_pago_tc,   mes_ant + 22,  'Pago de tarjeta',          4000,  0,    'MXN'),
    (u, a_banco,    c_pago_tc,   mes_ant + 22,  'Pago de tarjeta',          0,     4000, 'MXN'),
    (u, a_efectivo, c_rest,      mes_ant + 25,  'Café',                     0,     85,   'MXN'),
    (u, a_usd,      c_rest,      mes_ant + 18,  'Comida en viaje',          0,     42,   'USD'),
    (u, a_tarjeta,  c_super,     mes_act + 2,   'Supermercado semanal',     0,     2240, 'MXN'),
    (u, a_efectivo, c_rest,      mes_act + 3,   'Tacos',                    0,     160,  'MXN');

  -- Pendientes: uno vencido y uno futuro
  INSERT INTO public.transaction_pendings (user_id, concepto, tipo, monto_esperado, divisa, fecha_esperada, estado) VALUES
    (u, 'Reembolso de gastos de viaje', 'reembolso_gasto', 1800, 'MXN', hoy - 3,  'pendiente'),
    (u, 'Factura a cliente',            'ingreso_esperado', 8000, 'MXN', hoy + 20, 'pendiente');

  -- Suscripciones activas
  INSERT INTO public.subscription_services (user_id, service_name, tipo_servicio, frecuencia, ultimo_pago_fecha, ultimo_pago_monto, proximo_pago, active) VALUES
    (u, 'Plataforma de video',       'Entretenimiento', 'Mensual', mes_ant + 11, 229,  (mes_ant + 11 + interval '1 month')::date + interval '1 month', true),
    (u, 'Música',                    'Entretenimiento', 'Mensual', mes_ant + 6,  129,  (mes_ant + 6 + interval '2 month')::date, true),
    (u, 'Almacenamiento en la nube', 'Productividad',   'Anual',   mes_ant2 + 3, 1200, (mes_ant2 + 3 + interval '1 year')::date, true);
END $$;

-- Para borrar y volver a cargar (solo la cuenta de revisión):
-- DELETE FROM public.transacciones          WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418';
-- DELETE FROM public.transaction_pendings   WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418';
-- DELETE FROM public.subscription_services  WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418';
-- DELETE FROM public.cuentas                WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418';
-- DELETE FROM public.categorias             WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418';
