
-- =====================================================
-- FIX #1: Replace hardcoded admin email with role-based access
-- =====================================================

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS: only admins can view roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Helper function to check admin status (no recursive RLS issue)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Seed current admin user into the roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'manoloto@hotmail.com'
ON CONFLICT DO NOTHING;

-- Update profiles RLS policy to use is_admin()
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_admin() OR auth.uid() = user_id);

-- Update get_admin_user_stats to use is_admin()
CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS TABLE(
  user_id uuid,
  email character varying,
  nombre text,
  apellidos text,
  divisa_preferida text,
  created_at timestamp with time zone,
  transacciones_count bigint,
  categorias_count bigint,
  cuentas_count bigint,
  inversiones_count bigint,
  criptomonedas_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin only function';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    u.email,
    p.nombre,
    p.apellidos,
    p.divisa_preferida,
    p.created_at,
    COALESCE(t.transacciones_count, 0) as transacciones_count,
    COALESCE(cat.categorias_count, 0) as categorias_count,
    COALESCE(cue.cuentas_count, 0) as cuentas_count,
    COALESCE(inv.inversiones_count, 0) as inversiones_count,
    COALESCE(cry.criptomonedas_count, 0) as criptomonedas_count
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN (SELECT t_inner.user_id, COUNT(*) as transacciones_count FROM transacciones t_inner GROUP BY t_inner.user_id) t ON t.user_id = p.user_id
  LEFT JOIN (SELECT cat_inner.user_id, COUNT(*) as categorias_count FROM categorias cat_inner GROUP BY cat_inner.user_id) cat ON cat.user_id = p.user_id
  LEFT JOIN (SELECT cue_inner.user_id, COUNT(*) as cuentas_count FROM cuentas cue_inner GROUP BY cue_inner.user_id) cue ON cue.user_id = p.user_id
  LEFT JOIN (SELECT inv_inner.user_id, COUNT(*) as inversiones_count FROM inversiones inv_inner GROUP BY inv_inner.user_id) inv ON inv.user_id = p.user_id
  LEFT JOIN (SELECT cry_inner.user_id, COUNT(*) as criptomonedas_count FROM criptomonedas cry_inner GROUP BY cry_inner.user_id) cry ON cry.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$function$;

-- Update admin_delete_user to use is_admin()
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin only function';
  END IF;

  DELETE FROM public.transacciones WHERE user_id = target_user_id;
  DELETE FROM public.cuentas WHERE user_id = target_user_id;
  DELETE FROM public.categorias WHERE user_id = target_user_id;
  DELETE FROM public.inversiones WHERE user_id = target_user_id;
  DELETE FROM public.criptomonedas WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$;

-- =====================================================
-- FIX #4: Fix clear_sample_data to only delete sample records
-- =====================================================

-- Add is_sample column to categorias and cuentas
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS is_sample boolean DEFAULT false;
ALTER TABLE public.cuentas ADD COLUMN IF NOT EXISTS is_sample boolean DEFAULT false;

-- Mark existing sample data (created by the trigger for new users)
-- Sample accounts have specific names from the trigger
UPDATE public.cuentas SET is_sample = true
WHERE nombre IN ('Cuenta Principal', 'Efectivo', 'Tarjeta de Crédito', 'Portafolio ETFs', 'Acciones Individuales', 'Cuenta Empresarial', 'Caja Chica')
AND EXISTS (SELECT 1 FROM public.transacciones t WHERE t.user_id = cuentas.user_id AND t.csv_id = 'SAMPLE_DATA');

UPDATE public.categorias SET is_sample = true
WHERE EXISTS (SELECT 1 FROM public.transacciones t WHERE t.user_id = categorias.user_id AND t.csv_id = 'SAMPLE_DATA')
AND categoria IN ('Trabajo', 'Inversiones', 'Alimentación', 'Transporte', 'Salud', 'Hogar', 'Interno', 'Reembolsos', 'Ventas', 'Operación', 'Marketing', 'Administrativo', 'Financiero');

-- Update the clear_sample_data function to only delete sample records
CREATE OR REPLACE FUNCTION public.clear_sample_data(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Access denied: Can only clear your own sample data';
  END IF;

  -- Delete sample transactions
  DELETE FROM public.transacciones 
  WHERE user_id = user_uuid AND csv_id = 'SAMPLE_DATA';
  
  -- Delete only sample categories
  DELETE FROM public.categorias 
  WHERE user_id = user_uuid AND is_sample = true;
  
  -- Delete only sample accounts
  DELETE FROM public.cuentas 
  WHERE user_id = user_uuid AND is_sample = true;
END;
$function$;

-- Update the create_sample_data_for_user trigger function to mark sample data
CREATE OR REPLACE FUNCTION public.create_sample_data_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
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

  -- Insert sample categories marked as sample
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'Trabajo', 'Salario', 'Ingreso', true),
    (NEW.id, 'Trabajo', 'Freelance', 'Ingreso', true),
    (NEW.id, 'Inversiones', 'Rendimientos', 'Ingreso', true),
    (NEW.id, 'Alimentación', 'Supermercado', 'Gastos', true),
    (NEW.id, 'Alimentación', 'Restaurantes', 'Gastos', true),
    (NEW.id, 'Transporte', 'Gasolina', 'Gastos', true),
    (NEW.id, 'Transporte', 'Seguros', 'Gastos', true),
    (NEW.id, 'Salud', 'Medicina', 'Gastos', true),
    (NEW.id, 'Hogar', 'Varios', 'Gastos', true),
    (NEW.id, 'Inversiones', 'Aportación ETFs', 'Aportación', true),
    (NEW.id, 'Inversiones', 'Aportación Acciones', 'Aportación', true),
    (NEW.id, 'Interno', 'Transferencia Entre Cuentas', 'Gastos', true),
    (NEW.id, 'Reembolsos', 'Reembolso de Gastos', 'Reembolso', true),
    (NEW.id, 'Reembolsos', 'Reembolso de Ingresos', 'Reembolso', true),
    (NEW.id, 'Reembolsos', 'Devolución de Compras', 'Reembolso', true);

  -- Insert sample accounts marked as sample
  INSERT INTO public.cuentas (user_id, nombre, tipo, saldo_inicial, divisa, is_sample) VALUES
    (NEW.id, 'Cuenta Principal', 'Banco', 10000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Efectivo', 'Líquido', 2000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Tarjeta de Crédito', 'Tarjeta de Crédito', 0, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Portafolio ETFs', 'Inversiones', 50000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Acciones Individuales', 'Inversiones', 22000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true);

  -- Insert sample transactions
  WITH sample_accounts AS (
    SELECT id, nombre FROM public.cuentas WHERE user_id = NEW.id
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
      ('Tarjeta de Crédito', 'Hogar', 'Varios', CURRENT_DATE - INTERVAL '1 day', 0, 1800, 'Compras casa'),
      ('Cuenta Principal', 'Reembolsos', 'Devolución de Compras', CURRENT_DATE - INTERVAL '5 days', 450, 0, 'REEMBOLSO (gasto): Devolución producto defectuoso')
  ) AS sample_data(cuenta_nombre, categoria_nombre, subcategoria_nombre, fecha, ingreso, gasto, comentario)
  JOIN sample_accounts sa ON sa.nombre = sample_data.cuenta_nombre
  JOIN sample_categories sc ON sc.categoria = sample_data.categoria_nombre AND sc.subcategoria = sample_data.subcategoria_nombre;

  RETURN NEW;
END;
$function$;
