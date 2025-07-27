-- Fix the create_sample_data_for_user function to use correct tipo values
CREATE OR REPLACE FUNCTION public.create_sample_data_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- First, create the profile if it doesn't exist
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

  -- Insert sample categories with correct tipo values
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES
    (NEW.id, 'Trabajo', 'Salario', 'Ingreso'),
    (NEW.id, 'Trabajo', 'Freelance', 'Ingreso'),
    (NEW.id, 'Inversiones', 'Rendimientos', 'Ingreso'),
    (NEW.id, 'Alimentación', 'Supermercado', 'Gastos'),
    (NEW.id, 'Alimentación', 'Restaurantes', 'Gastos'),
    (NEW.id, 'Transporte', 'Gasolina', 'Gastos'),
    (NEW.id, 'Transporte', 'Seguros', 'Gastos'),
    (NEW.id, 'Salud', 'Medicina', 'Gastos'),
    (NEW.id, 'Hogar', 'Varios', 'Gastos'),
    (NEW.id, 'Inversiones', 'Aportación ETFs', 'Aportación'),
    (NEW.id, 'Inversiones', 'Aportación Acciones', 'Aportación'),
    (NEW.id, 'Interno', 'Transferencia Entre Cuentas', 'Gastos');

  -- Insert sample accounts
  INSERT INTO public.cuentas (user_id, nombre, tipo, saldo_inicial, divisa) VALUES
    (NEW.id, 'Cuenta Principal', 'Líquido', 10000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN')),
    (NEW.id, 'Efectivo', 'Líquido', 2000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN')),
    (NEW.id, 'Tarjeta de Crédito', 'Pasivo', 0, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN')),
    (NEW.id, 'Portafolio ETFs', 'Inversiones', 50000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN')),
    (NEW.id, 'Acciones Individuales', 'Inversiones', 22000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'));

  -- Insert sample transactions (last 30 days)
  WITH sample_accounts AS (
    SELECT id, nombre FROM public.cuentas WHERE user_id = NEW.id
  ),
  sample_categories AS (
    SELECT id, categoria, subcategoria FROM public.categorias WHERE user_id = NEW.id
  )
  INSERT INTO public.transacciones (user_id, cuenta_id, subcategoria_id, fecha, ingreso, gasto, comentario, divisa, csv_id)
  SELECT 
    NEW.id,
    sa.id,
    sc.id,
    fecha,
    ingreso,
    gasto,
    comentario,
    COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'),
    'SAMPLE_DATA'
  FROM (
    VALUES 
      ('Cuenta Principal', 'Trabajo', 'Salario', CURRENT_DATE - INTERVAL '25 days', 32000, 0, 'Salario agosto'),
      ('Cuenta Principal', 'Alimentación', 'Supermercado', CURRENT_DATE - INTERVAL '24 days', 0, 4500, 'Supermercado semanal'),
      ('Cuenta Principal', 'Transporte', 'Gasolina', CURRENT_DATE - INTERVAL '23 days', 0, 2800, 'Gasolina auto'),
      ('Efectivo', 'Trabajo', 'Freelance', CURRENT_DATE - INTERVAL '21 days', 15000, 0, 'Proyecto freelance web'),
      ('Tarjeta de Crédito', 'Alimentación', 'Restaurantes', CURRENT_DATE - INTERVAL '20 days', 0, 1200, 'Cena restaurante'),
      ('Portafolio ETFs', 'Inversiones', 'Aportación ETFs', CURRENT_DATE - INTERVAL '18 days', 28000, 0, 'Aportación mensual ETFs'),
      ('Acciones Individuales', 'Inversiones', 'Aportación Acciones', CURRENT_DATE - INTERVAL '16 days', 22000, 0, 'Compra acciones Google'),
      ('Efectivo', 'Salud', 'Medicina', CURRENT_DATE - INTERVAL '14 days', 0, 800, 'Compras farmacia'),
      ('Cuenta Principal', 'Trabajo', 'Freelance', CURRENT_DATE - INTERVAL '11 days', 18000, 0, 'Consultoría marketing'),
      ('Cuenta Principal', 'Alimentación', 'Supermercado', CURRENT_DATE - INTERVAL '10 days', 0, 3200, 'Compras supermercado'),
      ('Cuenta Principal', 'Transporte', 'Seguros', CURRENT_DATE - INTERVAL '8 days', 0, 1500, 'Pago seguro auto'),
      ('Portafolio ETFs', 'Inversiones', 'Rendimientos', CURRENT_DATE - INTERVAL '6 days', 800, 0, 'Dividendos ETFs'),
      ('Tarjeta de Crédito', 'Alimentación', 'Restaurantes', CURRENT_DATE - INTERVAL '4 days', 0, 650, 'Almuerzo negocios'),
      ('Cuenta Principal', 'Transporte', 'Gasolina', CURRENT_DATE - INTERVAL '2 days', 0, 2600, 'Gasolina'),
      ('Tarjeta de Crédito', 'Hogar', 'Varios', CURRENT_DATE - INTERVAL '1 day', 0, 1800, 'Compras casa')
  ) AS sample_data(cuenta_nombre, categoria_nombre, subcategoria_nombre, fecha, ingreso, gasto, comentario)
  JOIN sample_accounts sa ON sa.nombre = sample_data.cuenta_nombre
  JOIN sample_categories sc ON sc.categoria = sample_data.categoria_nombre AND sc.subcategoria = sample_data.subcategoria_nombre;

  RETURN NEW;
END;
$function$;