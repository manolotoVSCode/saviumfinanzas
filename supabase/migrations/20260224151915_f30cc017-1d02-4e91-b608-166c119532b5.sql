CREATE OR REPLACE FUNCTION public.clear_sample_data(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify the caller owns this data
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Access denied: Can only clear your own sample data';
  END IF;

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