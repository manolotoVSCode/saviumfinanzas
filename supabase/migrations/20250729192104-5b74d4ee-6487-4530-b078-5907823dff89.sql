-- Primero, permitir valores NULL en la columna tipo para categorías "SIN ASIGNAR"
ALTER TABLE public.categorias ALTER COLUMN tipo DROP NOT NULL;

-- Crear función para asegurar que cada usuario tenga una categoría "SIN ASIGNAR"
CREATE OR REPLACE FUNCTION public.ensure_sin_asignar_category(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sin_asignar_id uuid;
BEGIN
  -- Buscar si ya existe una categoría "SIN ASIGNAR" para el usuario
  SELECT id INTO sin_asignar_id 
  FROM public.categorias 
  WHERE user_id = user_uuid 
    AND LOWER(subcategoria) = 'sin asignar';
  
  -- Si no existe, crearla
  IF sin_asignar_id IS NULL THEN
    INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo)
    VALUES (user_uuid, 'SIN ASIGNAR', 'SIN ASIGNAR', NULL)
    RETURNING id INTO sin_asignar_id;
  END IF;
  
  RETURN sin_asignar_id;
END;
$function$;

-- Función para reasignar transacciones cuando se elimina una categoría
CREATE OR REPLACE FUNCTION public.reassign_transactions_to_sin_asignar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sin_asignar_id uuid;
BEGIN
  -- Obtener o crear la categoría "SIN ASIGNAR" para el usuario
  sin_asignar_id := public.ensure_sin_asignar_category(OLD.user_id);
  
  -- Reasignar todas las transacciones de la categoría eliminada
  UPDATE public.transacciones 
  SET subcategoria_id = sin_asignar_id
  WHERE subcategoria_id = OLD.id;
  
  RETURN OLD;
END;
$function$;

-- Crear trigger para reasignar transacciones automáticamente al eliminar categorías
DROP TRIGGER IF EXISTS reassign_transactions_before_category_delete ON public.categorias;
CREATE TRIGGER reassign_transactions_before_category_delete
  BEFORE DELETE ON public.categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.reassign_transactions_to_sin_asignar();

-- Asegurar que todos los usuarios existentes tengan una categoría "SIN ASIGNAR"
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM public.categorias LOOP
    PERFORM public.ensure_sin_asignar_category(user_record.user_id);
  END LOOP;
END $$;