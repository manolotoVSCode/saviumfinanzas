-- ensure_sin_asignar_category recibe un user_uuid arbitrario y es SECURITY
-- DEFINER, así que cualquier sesión autenticada podía crear la categoría
-- "SIN ASIGNAR" dentro de la cuenta de otro usuario. La función se mantiene
-- (la llaman el importador y otras funciones internas), pero ahora rechaza
-- que un usuario actúe sobre una cuenta ajena.
--
-- auth.uid() es NULL cuando la llaman otras funciones SECURITY DEFINER o el
-- editor SQL; en ese caso se permite, igual que antes.

CREATE OR REPLACE FUNCTION public.ensure_sin_asignar_category(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sin_asignar_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND user_uuid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No se puede crear la categoría en una cuenta ajena';
  END IF;

  SELECT id INTO sin_asignar_id
  FROM public.categorias
  WHERE user_id = user_uuid
    AND LOWER(subcategoria) = 'sin asignar';

  IF sin_asignar_id IS NULL THEN
    INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo)
    VALUES (user_uuid, 'SIN ASIGNAR', 'SIN ASIGNAR', NULL)
    RETURNING id INTO sin_asignar_id;
  END IF;

  RETURN sin_asignar_id;
END;
$function$;
