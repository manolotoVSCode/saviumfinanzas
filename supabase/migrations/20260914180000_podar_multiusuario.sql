-- Savium es una app de un solo usuario: se eliminan gestión de usuarios,
-- roles de administrador y datos de muestra (ver docs/index.md).
BEGIN;

-- 1. profiles: la única política SELECT dependía de is_admin(); se sustituye
--    por "cada usuario ve su propio perfil" antes de borrar la función.
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Datos de muestra
DROP TRIGGER IF EXISTS on_auth_user_created_sample_data ON auth.users;
DROP FUNCTION IF EXISTS public.create_sample_data_for_user();
DROP FUNCTION IF EXISTS public.clear_sample_data(uuid);
DROP FUNCTION IF EXISTS public.user_has_sample_data(uuid);
ALTER TABLE public.cuentas DROP COLUMN IF EXISTS is_sample;
ALTER TABLE public.categorias DROP COLUMN IF EXISTS is_sample;

-- 3. Administración de usuarios y roles
DROP FUNCTION IF EXISTS public.get_admin_user_stats();
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
DROP FUNCTION IF EXISTS public.is_admin();
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE IF EXISTS public.app_role;

COMMIT;
