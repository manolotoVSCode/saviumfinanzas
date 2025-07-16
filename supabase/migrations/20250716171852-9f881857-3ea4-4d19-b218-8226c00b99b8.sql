-- Primero, eliminar el trigger problemático
DROP TRIGGER IF EXISTS create_profile_on_user_creation ON auth.users;
DROP FUNCTION IF EXISTS public.create_profile_for_user();

-- Crear una nueva función más robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nombre, apellidos, edad)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'edad' IS NOT NULL AND NEW.raw_user_meta_data->>'edad' != '' THEN 
        (NEW.raw_user_meta_data->>'edad')::INTEGER 
      ELSE NULL 
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla la inserción, aún permitir que se cree el usuario
    RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger nuevamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();