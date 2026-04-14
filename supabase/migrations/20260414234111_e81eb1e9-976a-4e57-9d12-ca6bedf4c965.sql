
CREATE OR REPLACE FUNCTION public.create_sample_data_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'SIN ASIGNAR', 'SIN ASIGNAR', NULL, false);

  INSERT INTO public.profiles (user_id, nombre, apellidos, edad, divisa_preferida)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''), 
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'edad' IS NOT NULL THEN 
        (NEW.raw_user_meta_data->>'edad')::INTEGER 
      ELSE NULL 
    END,
    COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- =============================================
  -- PERMANENT DEFAULT CATEGORIES (is_sample = false)
  -- These stay even after clearing sample data
  -- =============================================

  -- Gastos universales
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'Alimentación', 'Supermercados', 'Gastos', false),
    (NEW.id, 'Alimentación', 'Restaurantes', 'Gastos', false),
    (NEW.id, 'Alimentación', 'Delivery', 'Gastos', false),
    (NEW.id, 'Hogar', 'Alquiler / Hipoteca', 'Gastos', false),
    (NEW.id, 'Hogar', 'Electricidad', 'Gastos', false),
    (NEW.id, 'Hogar', 'Agua', 'Gastos', false),
    (NEW.id, 'Hogar', 'Gas', 'Gastos', false),
    (NEW.id, 'Hogar', 'Internet / Teléfono', 'Gastos', false),
    (NEW.id, 'Hogar', 'Administración', 'Gastos', false),
    (NEW.id, 'Transporte', 'Gasolina', 'Gastos', false),
    (NEW.id, 'Transporte', 'Casetas y Peajes', 'Gastos', false),
    (NEW.id, 'Transporte', 'Estacionamiento', 'Gastos', false),
    (NEW.id, 'Transporte', 'Movilidad', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Suscripciones', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Ropa y Accesorios', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Amazon', 'Gastos', false),
    (NEW.id, 'Salud', 'Farmacia / Consultas', 'Gastos', false),
    (NEW.id, 'Salud', 'Seguros', 'Gastos', false),
    (NEW.id, 'Educación', 'Colegiaturas / Cursos', 'Gastos', false),
    (NEW.id, 'Ocio y tiempo libre', 'Viajes', 'Gastos', false),
    (NEW.id, 'Ocio y tiempo libre', 'Deporte', 'Gastos', false),
    (NEW.id, 'Impuestos', 'Impuestos', 'Gastos', false);

  -- Ingresos
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'Nómina', 'Salario', 'Ingreso', false),
    (NEW.id, 'Ingresos adicionales', 'Otros ingresos', 'Ingreso', false);

  -- Aportación / Retiro (transferencias internas)
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'Transferencias internas', 'Pago tarjeta de crédito', 'Retiro', false),
    (NEW.id, 'Transferencias internas', 'Abono tarjeta de crédito', 'Aportación', false),
    (NEW.id, 'Transferencias internas', 'A otra cuenta propia', 'Aportación', false),
    (NEW.id, 'Inversiones', 'Aportación ahorro', 'Aportación', false);

  -- =============================================
  -- SAMPLE ACCOUNTS (is_sample = true, cleared with sample data)
  -- =============================================
  INSERT INTO public.cuentas (user_id, nombre, tipo, saldo_inicial, divisa, is_sample) VALUES
    (NEW.id, 'Cuenta Principal', 'Banco', 10000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Efectivo', 'Efectivo', 2000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Tarjeta de Crédito', 'Tarjeta de Crédito', 0, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true);

  -- =============================================
  -- SAMPLE TRANSACTIONS (cleared with sample data)
  -- =============================================
  WITH sample_accounts AS (
    SELECT id, nombre FROM public.cuentas WHERE user_id = NEW.id AND is_sample = true
  ),
  sample_categories AS (
    SELECT id, categoria, subcategoria FROM public.categorias WHERE user_id = NEW.id
  )
  INSERT INTO public.transacciones (user_id, cuenta_id, subcategoria_id, fecha, ingreso, gasto, comentario, divisa, csv_id)
  SELECT 
    NEW.id, sa.id, sc.id, fecha, ingreso, gasto, comentario,
    COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), 'SAMPLE_DATA'
  FROM (
    VALUES 
      ('Cuenta Principal', 'Nómina', 'Salario', CURRENT_DATE - INTERVAL '25 days', 32000, 0, 'Salario mensual'),
      ('Cuenta Principal', 'Alimentación', 'Supermercados', CURRENT_DATE - INTERVAL '24 days', 0, 4500, 'Compras supermercado'),
      ('Cuenta Principal', 'Transporte', 'Gasolina', CURRENT_DATE - INTERVAL '23 days', 0, 2800, 'Gasolina'),
      ('Efectivo', 'Ingresos adicionales', 'Otros ingresos', CURRENT_DATE - INTERVAL '21 days', 5000, 0, 'Ingreso adicional'),
      ('Tarjeta de Crédito', 'Alimentación', 'Restaurantes', CURRENT_DATE - INTERVAL '20 days', 0, 1200, 'Cena restaurante'),
      ('Efectivo', 'Salud', 'Farmacia / Consultas', CURRENT_DATE - INTERVAL '14 days', 0, 800, 'Farmacia'),
      ('Cuenta Principal', 'Alimentación', 'Supermercados', CURRENT_DATE - INTERVAL '10 days', 0, 3200, 'Supermercado semanal'),
      ('Tarjeta de Crédito', 'Compras personales', 'Suscripciones', CURRENT_DATE - INTERVAL '8 days', 0, 350, 'Netflix + Spotify'),
      ('Cuenta Principal', 'Hogar', 'Electricidad', CURRENT_DATE - INTERVAL '6 days', 0, 950, 'Recibo de luz'),
      ('Tarjeta de Crédito', 'Alimentación', 'Delivery', CURRENT_DATE - INTERVAL '4 days', 0, 450, 'Uber Eats'),
      ('Cuenta Principal', 'Transporte', 'Movilidad', CURRENT_DATE - INTERVAL '2 days', 0, 280, 'Uber'),
      ('Cuenta Principal', 'Ocio y tiempo libre', 'Deporte', CURRENT_DATE - INTERVAL '1 day', 0, 600, 'Mensualidad gym')
  ) AS sample_data(cuenta_nombre, categoria_nombre, subcategoria_nombre, fecha, ingreso, gasto, comentario)
  JOIN sample_accounts sa ON sa.nombre = sample_data.cuenta_nombre
  JOIN sample_categories sc ON sc.categoria = sample_data.categoria_nombre AND sc.subcategoria = sample_data.subcategoria_nombre;

  RETURN NEW;
END;
$function$;
