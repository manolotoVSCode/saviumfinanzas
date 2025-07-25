-- Fix security warnings: Set proper search_path for functions
CREATE OR REPLACE FUNCTION public.user_has_sample_data(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transacciones 
    WHERE user_id = user_uuid AND csv_id = 'SAMPLE_DATA'
  );
$$;

CREATE OR REPLACE FUNCTION public.clear_sample_data(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete sample transactions
  DELETE FROM public.transacciones 
  WHERE user_id = user_uuid AND csv_id = 'SAMPLE_DATA';
  
  -- Delete sample categories
  DELETE FROM public.categorias 
  WHERE user_id = user_uuid;
  
  -- Delete sample accounts
  DELETE FROM public.cuentas 
  WHERE user_id = user_uuid;
END;
$$;