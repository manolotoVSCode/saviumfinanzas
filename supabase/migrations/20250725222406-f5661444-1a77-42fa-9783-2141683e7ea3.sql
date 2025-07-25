-- Create admin function to delete user completely
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admin user to execute this function
  IF (auth.jwt() ->> 'email'::text) != 'manoloto@hotmail.com'::text THEN
    RAISE EXCEPTION 'Access denied: Admin only function';
  END IF;

  -- Delete all user data in the correct order
  DELETE FROM public.transacciones WHERE user_id = target_user_id;
  DELETE FROM public.cuentas WHERE user_id = target_user_id;
  DELETE FROM public.categorias WHERE user_id = target_user_id;
  DELETE FROM public.inversiones WHERE user_id = target_user_id;
  DELETE FROM public.criptomonedas WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Delete the user from auth.users (this requires elevated privileges)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;