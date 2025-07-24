-- Create security definer functions for admin access
-- These functions bypass RLS for the admin user only

CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE(
  user_id uuid,
  email text,
  nombre text,
  apellidos text,
  divisa_preferida text,
  transacciones_count bigint,
  categorias_count bigint,
  cuentas_count bigint,
  inversiones_count bigint,
  criptomonedas_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin user to execute this function
  IF (auth.jwt() ->> 'email'::text) != 'manoloto@hotmail.com'::text THEN
    RAISE EXCEPTION 'Access denied: Admin only function';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    u.email,
    p.nombre,
    p.apellidos,
    p.divisa_preferida,
    COALESCE(t.transacciones_count, 0) as transacciones_count,
    COALESCE(cat.categorias_count, 0) as categorias_count,
    COALESCE(cue.cuentas_count, 0) as cuentas_count,
    COALESCE(inv.inversiones_count, 0) as inversiones_count,
    COALESCE(cry.criptomonedas_count, 0) as criptomonedas_count
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as transacciones_count 
    FROM transacciones 
    GROUP BY user_id
  ) t ON t.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as categorias_count 
    FROM categorias 
    GROUP BY user_id
  ) cat ON cat.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as cuentas_count 
    FROM cuentas 
    GROUP BY user_id
  ) cue ON cue.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as inversiones_count 
    FROM inversiones 
    GROUP BY user_id
  ) inv ON inv.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as criptomonedas_count 
    FROM criptomonedas 
    GROUP BY user_id
  ) cry ON cry.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;