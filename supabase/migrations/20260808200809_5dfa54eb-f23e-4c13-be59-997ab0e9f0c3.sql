CREATE OR REPLACE FUNCTION public.create_default_investment_types(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.investment_types (user_id, nombre, comportamiento, permite_reinversion, requiere_vencimiento, orden)
  VALUES
    (target_user_id, 'Valor de mercado (actualización manual)', 'valuacion_manual', false, false, 1),
    (target_user_id, 'Interés fijo · Reinversión', 'interes_fijo', true, false, 2),
    (target_user_id, 'Interés fijo · Cobro mensual', 'interes_fijo', false, false, 3),
    (target_user_id, 'Participación / Fideicomiso a plazo', 'reparto_variable', false, true, 4),
    (target_user_id, 'Bien raíz', 'activo_patrimonial', false, false, 5),
    (target_user_id, 'Criptomoneda', 'valuacion_manual', false, false, 6),
    (target_user_id, 'Participación en empresa', 'activo_patrimonial', false, false, 7)
  ON CONFLICT (user_id, nombre) DO NOTHING;
END;
$function$;