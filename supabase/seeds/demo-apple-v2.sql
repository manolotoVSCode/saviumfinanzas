-- Datos ficticios para la cuenta de demostración (apple_user@manoloto.com): revisión de Apple y para enseñar
-- la app a amigos. SOLO toca el user_id 4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418 (el editor SQL ignora RLS: la cuenta
-- del usuario es 01ad1bcc-…; nunca debe aparecer aquí).
--
-- Se puede ejecutar cuantas veces se quiera: borra los datos de la demo y los vuelve a cargar con fechas relativas
-- a hoy (dos meses completos y el mes en curso), para que «Mes anterior», «Por pagar» y los pendientes parezcan
-- siempre recientes. Conviene ejecutarlo a principio de cada mes.
--
-- Qué enseña (apps 1.2–1.4):
--   · Inicio: patrimonio, «Atención» (un pendiente vencido y un pago grande), mes anterior y gastos por categoría.
--   · Movimientos: tocar para editar, deslizar para borrar.
--   · Pendientes: 4 por cobrar para deslizar (cobrar / borrar) y «Por pagar» con recibos, seguro anual y provisiones.
--   · Código de emergencia de la demo: 2468 → entra en modo señuelo. La demo no tiene lectores, así que la alerta
--     no avisa a nadie (ni notificación ni correo).
--   · Web: Configuración → Para mi familia, con carta, contactos, seguros y documentos ficticios.

DO $$
DECLARE
  u constant uuid := '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418';
  hoy constant date := current_date;
  m0 constant date := date_trunc('month', current_date)::date;                         -- día 1 del mes en curso
  m1 constant date := (date_trunc('month', current_date) - interval '1 month')::date;  -- día 1 del mes anterior
  m2 constant date := (date_trunc('month', current_date) - interval '2 month')::date;
  c_sueldo uuid; c_bono uuid; c_super uuid; c_rest uuid; c_cafe uuid; c_gas uuid; c_uber uuid; c_luz uuid;
  c_agua uuid; c_internet uuid; c_celular uuid; c_streaming uuid; c_cine uuid; c_farmacia uuid; c_seguro_med uuid;
  c_seguro_auto uuid; c_colegiatura uuid; c_ropa uuid; c_regalos uuid; c_hipoteca uuid; c_pago_tc uuid;
  a_banco uuid; a_efectivo uuid; a_tarjeta uuid; a_inversion uuid; a_usd uuid; a_depto uuid; a_hipoteca uuid;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = u) IS DISTINCT FROM 'apple_user@manoloto.com' THEN
    RAISE EXCEPTION 'El user_id no es la cuenta de demostración';
  END IF;

  -- 1) Borrar los datos de la demo (hijos primero). Nunca otro user_id.
  DELETE FROM public.transaction_pendings  WHERE user_id = u;
  DELETE FROM public.transacciones         WHERE user_id = u;
  DELETE FROM public.subscription_services WHERE user_id = u;
  DELETE FROM public.provisiones_cxp       WHERE user_id = u;
  DELETE FROM public.informacion_familia   WHERE user_id = u;
  DELETE FROM public.codigos_emergencia    WHERE user_id = u;
  DELETE FROM public.alertas_emergencia    WHERE user_id = u;
  DELETE FROM public.cuentas               WHERE user_id = u;
  DELETE FROM public.categorias            WHERE user_id = u;

  INSERT INTO public.profiles (user_id, nombre, apellidos, divisa_preferida) VALUES (u, 'Revisión', 'Apple', 'MXN')
    ON CONFLICT DO NOTHING;

  -- 2) Categorías (las de Hogar, Servicios, Educación y Salud/Seguro salen en «Por pagar»; el seguro del auto es anual)
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Ingresos', 'Nómina', 'Ingreso') RETURNING id INTO c_sueldo;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Ingresos', 'Bonos', 'Ingreso') RETURNING id INTO c_bono;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Alimentación', 'Supermercado', 'Gastos') RETURNING id INTO c_super;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Alimentación', 'Restaurantes', 'Gastos') RETURNING id INTO c_rest;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Alimentación', 'Cafeterías', 'Gastos') RETURNING id INTO c_cafe;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Transporte', 'Gasolina', 'Gastos') RETURNING id INTO c_gas;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Transporte', 'Uber y taxis', 'Gastos') RETURNING id INTO c_uber;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Hogar', 'Luz', 'Gastos') RETURNING id INTO c_luz;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Hogar', 'Agua', 'Gastos') RETURNING id INTO c_agua;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Servicios', 'Internet', 'Gastos') RETURNING id INTO c_internet;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Servicios', 'Celular', 'Gastos') RETURNING id INTO c_celular;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Ocio y tiempo libre', 'Streaming', 'Gastos') RETURNING id INTO c_streaming;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Ocio y tiempo libre', 'Cine', 'Gastos') RETURNING id INTO c_cine;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Salud', 'Farmacia', 'Gastos') RETURNING id INTO c_farmacia;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Salud', 'Seguro médico', 'Gastos') RETURNING id INTO c_seguro_med;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, frecuencia_seguimiento) VALUES (u, 'Transporte', 'Seguro del auto', 'Gastos', 'anual') RETURNING id INTO c_seguro_auto;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Educación', 'Colegiatura', 'Gastos') RETURNING id INTO c_colegiatura;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Personal', 'Ropa', 'Gastos') RETURNING id INTO c_ropa;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Personal', 'Regalos', 'Gastos') RETURNING id INTO c_regalos;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Préstamos', 'Pago de hipoteca', 'Gastos') RETURNING id INTO c_hipoteca;
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES (u, 'Movimientos', 'Abono tarjeta de crédito', 'Aportación') RETURNING id INTO c_pago_tc;

  -- 3) Cuentas (saldo inicial; el actual lo calcula la vista saldos_cuentas)
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Banco Principal', 'Banco', 'MXN', 92000) RETURNING id INTO a_banco;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Efectivo', 'Efectivo', 'MXN', 3500) RETURNING id INTO a_efectivo;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Tarjeta de crédito', 'Tarjeta de Crédito', 'MXN', 0) RETURNING id INTO a_tarjeta;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Fondo de inversión', 'Inversiones', 'MXN', 180000) RETURNING id INTO a_inversion;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Cuenta en dólares', 'Banco', 'USD', 4200) RETURNING id INTO a_usd;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Departamento', 'Bien Raíz', 'MXN', 2600000) RETURNING id INTO a_depto;
  INSERT INTO public.cuentas (user_id, nombre, tipo, divisa, saldo_inicial) VALUES (u, 'Hipoteca', 'Hipoteca', 'MXN', -1150000) RETURNING id INTO a_hipoteca;

  -- 4) Movimientos: el mismo patrón en los dos meses completos; en el mes en curso solo hasta hoy.
  INSERT INTO public.transacciones (user_id, cuenta_id, subcategoria_id, fecha, comentario, ingreso, gasto, divisa)
  SELECT u, cuenta, sub, mes + (dia - 1), comentario, ingreso, gasto, divisa
  FROM (VALUES
    (a_banco,    c_hipoteca,    2,  'Mensualidad hipoteca',      0,     14500, 'MXN'),
    (a_banco,    c_colegiatura, 3,  'Colegiatura',               0,     6800,  'MXN'),
    (a_tarjeta,  c_super,       4,  'Supermercado semanal',      0,     2350,  'MXN'),
    (a_banco,    c_luz,         5,  'Recibo de luz',             0,     690,   'MXN'),
    (a_tarjeta,  c_gas,         6,  'Gasolina',                  0,     1100,  'MXN'),
    (a_banco,    c_internet,    7,  'Internet hogar',            0,     599,   'MXN'),
    (a_banco,    c_celular,     8,  'Plan celular',              0,     449,   'MXN'),
    (a_efectivo, c_cafe,        9,  'Café',                      0,     95,    'MXN'),
    (a_tarjeta,  c_rest,        10, 'Comida con amigos',         0,     1250,  'MXN'),
    (a_tarjeta,  c_streaming,   11, 'Plataforma de video',       0,     299,   'MXN'),
    (a_tarjeta,  c_super,       11, 'Supermercado semanal',      0,     1980,  'MXN'),
    (a_banco,    c_agua,        12, 'Recibo de agua',            0,     380,   'MXN'),
    (a_tarjeta,  c_uber,        13, 'Uber',                      0,     210,   'MXN'),
    (a_banco,    c_sueldo,      15, 'Nómina',                    48000, 0,     'MXN'),
    (a_banco,    c_seguro_med,  15, 'Seguro médico',             0,     1850,  'MXN'),
    (a_tarjeta,  c_farmacia,    17, 'Farmacia',                  0,     540,   'MXN'),
    (a_tarjeta,  c_super,       18, 'Supermercado semanal',      0,     2210,  'MXN'),
    (a_tarjeta,  c_cine,        19, 'Cine',                      0,     420,   'MXN'),
    (a_tarjeta,  c_rest,        20, 'Reembolso cena de trabajo', 650,   0,     'MXN'),
    (a_tarjeta,  c_gas,         21, 'Gasolina',                  0,     1050,  'MXN'),
    (a_tarjeta,  c_ropa,        22, 'Ropa',                      0,     1890,  'MXN'),
    (a_tarjeta,  c_pago_tc,     23, 'Pago de tarjeta',           9000,  0,     'MXN'),
    (a_banco,    c_pago_tc,     23, 'Pago de tarjeta',           0,     9000,  'MXN'),
    (a_tarjeta,  c_super,       25, 'Supermercado semanal',      0,     2090,  'MXN'),
    (a_efectivo, c_rest,        26, 'Tacos',                     0,     180,   'MXN'),
    (a_usd,      c_rest,        27, 'Comida en viaje',           0,     38,    'USD'),
    (a_tarjeta,  c_regalos,     28, 'Regalo de cumpleaños',      0,     760,   'MXN')
  ) AS v(cuenta, sub, dia, comentario, ingreso, gasto, divisa)
  CROSS JOIN (VALUES (m2), (m1), (m0)) AS meses(mes)
  WHERE mes + (dia - 1) <= hoy;

  -- Un bono y el seguro del auto (anual, para «Por pagar») solo en el mes anterior.
  INSERT INTO public.transacciones (user_id, cuenta_id, subcategoria_id, fecha, comentario, ingreso, gasto, divisa) VALUES
    (u, a_banco,   c_bono,        m1 + 24, 'Bono trimestral', 12000, 0,    'MXN'),
    (u, a_tarjeta, c_seguro_auto, m1 + 5,  'Seguro del auto', 0,     9800, 'MXN');

  -- 5) Pendientes por cobrar: uno vencido y tres próximos (para deslizar: cobrar o borrar).
  INSERT INTO public.transaction_pendings (user_id, concepto, tipo, monto_esperado, divisa, fecha_esperada, estado) VALUES
    (u, 'Reembolso de gastos de viaje', 'reembolso_gasto',  1800,  'MXN', hoy - 4,  'pendiente'),
    (u, 'Factura a cliente',            'ingreso_esperado', 8500,  'MXN', hoy + 6,  'pendiente'),
    (u, 'Préstamo a un amigo',          'ingreso_esperado', 3000,  'MXN', hoy + 15, 'pendiente'),
    (u, 'Devolución de compra en línea','reembolso_gasto',  1240,  'MXN', hoy + 22, 'pendiente');

  -- 6) Suscripciones activas (dos mensuales suman en «Mensuales activas»; la anual no).
  INSERT INTO public.subscription_services (user_id, service_name, tipo_servicio, frecuencia, ultimo_pago_fecha, ultimo_pago_monto, proximo_pago, active) VALUES
    (u, 'Plataforma de video',       'Entretenimiento', 'Mensual', m0 + 10 - interval '1 month', 299,  (m0 + 10)::date + CASE WHEN m0 + 10 < hoy THEN interval '1 month' ELSE interval '0' END, true),
    (u, 'Música',                    'Entretenimiento', 'Mensual', m1 + 6,                       129,  (m1 + 6 + interval '1 month')::date + CASE WHEN m1 + 6 + interval '1 month' < hoy THEN interval '1 month' ELSE interval '0' END, true),
    (u, 'Gimnasio',                  'Salud',           'Mensual', m1 + 1,                       650,  (m1 + 1 + interval '1 month')::date + CASE WHEN m1 + 1 + interval '1 month' < hoy THEN interval '1 month' ELSE interval '0' END, true),
    (u, 'Almacenamiento en la nube', 'Productividad',   'Anual',   m2 + 3,                       1200, (m2 + 3 + interval '1 year')::date, true);

  -- 7) Provisiones de CxP (app 1.4): una grande (sale en «Atención» y en el Dashboard de la web) y una mensual.
  INSERT INTO public.provisiones_cxp (user_id, concepto, monto, divisa, fecha, frecuencia, notas) VALUES
    (u, 'Mantenimiento mayor del departamento', 125000, 'MXN', (hoy + 40)::date, 'unica',   'Impermeabilización y fachada'),
    (u, 'Ahorro para vacaciones',               4000,   'MXN', (m0 + interval '1 month')::date, 'mensual', NULL);

  -- 8) Para mi familia (web: Configuración → Para mi familia).
  INSERT INTO public.informacion_familia (user_id, contenido, revisado_at) VALUES (u, jsonb_build_object(
    'carta', 'Si estás leyendo esto, respira. Todo lo importante está ordenado en esta página: a quién llamar, qué seguros hay y dónde están los papeles. No hace falta decidir nada hoy.',
    'contactos', jsonb_build_array(
      jsonb_build_object('id', 'c1', 'nombre', 'Laura Méndez', 'rol', 'Contadora', 'telefono', '+52 55 0000 0001', 'email', 'contadora@ejemplo.com', 'nota', 'Lleva los impuestos y sabe dónde está todo.'),
      jsonb_build_object('id', 'c2', 'nombre', 'Jorge Ruiz', 'rol', 'Abogado', 'telefono', '+52 55 0000 0002', 'email', 'abogado@ejemplo.com', 'nota', 'Tiene copia del testamento.')),
    'seguros', jsonb_build_array(
      jsonb_build_object('id', 's1', 'tipo', 'Vida', 'aseguradora', 'Aseguradora Ejemplo', 'poliza', 'VID-000123', 'sumaAsegurada', 2000000, 'divisa', 'MXN',
                         'beneficiarios', 'Familia', 'vencimiento', to_char(hoy + 300, 'YYYY-MM-DD'), 'comoReclamar', 'Llamar a la aseguradora con el número de póliza y el acta.'),
      jsonb_build_object('id', 's2', 'tipo', 'Gastos médicos', 'aseguradora', 'Salud Ejemplo', 'poliza', 'GMM-004567', 'sumaAsegurada', 5000000, 'divisa', 'MXN',
                         'beneficiarios', 'Titular y familia', 'vencimiento', to_char(hoy + 20, 'YYYY-MM-DD'), 'comoReclamar', 'App de la aseguradora o su línea 24 h.')),
    'documentos', jsonb_build_array(
      jsonb_build_object('id', 'd1', 'que', 'Escrituras del departamento', 'donde', 'Caja fuerte del estudio', 'nota', ''),
      jsonb_build_object('id', 'd2', 'que', 'Testamento', 'donde', 'Notaría 00 y copia con el abogado', 'nota', '')),
    'notasPatrimonio', jsonb_build_object(),
    'pagos', jsonb_build_object()
  ), now());

  -- 9) Código de emergencia de la demo: 2468 (se guarda cifrado, como el real).
  INSERT INTO public.codigos_emergencia (user_id, hash)
  VALUES (u, encode(extensions.digest('savium-coaccion:' || u::text || ':2468', 'sha256'), 'hex'));
END $$;

-- Comprobación (solo la cuenta de demostración).
SELECT
  (SELECT count(*) FROM public.cuentas              WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418') AS cuentas,
  (SELECT count(*) FROM public.transacciones        WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418') AS movimientos,
  (SELECT count(*) FROM public.transaction_pendings WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418') AS pendientes,
  (SELECT count(*) FROM public.provisiones_cxp      WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418') AS provisiones,
  (SELECT count(*) FROM public.informacion_familia  WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418') AS familia,
  (SELECT count(*) FROM public.codigos_emergencia   WHERE user_id = '4f5aa3ab-24ec-4a2f-b4a8-1ae99dd3c418') AS codigo;
