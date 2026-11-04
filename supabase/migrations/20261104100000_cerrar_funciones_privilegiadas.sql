-- Cierra funciones SECURITY DEFINER que reciben un user_id y que Postgres deja ejecutar a PUBLIC por defecto.
-- Sin esto, alguien sin sesión podría llamarlas por la API con el id de otra cuenta.
--
-- create_default_*: las usan triggers y funciones del propietario, que no necesitan este permiso.
-- ensure_sin_asignar_category: el importador la llama con sesión, así que authenticated la conserva. Su cuerpo ya
-- rechaza cuentas ajenas si hay sesión (20260922180000); sin sesión auth.uid() es NULL, por eso se cierra aquí.
--
-- Aplicar en el editor SQL. Es idempotente y no toca datos.

BEGIN;

DO $$
DECLARE
  firma text;
BEGIN
  FOREACH firma IN ARRAY ARRAY[
    'public.create_default_classification_rules(uuid)',
    'public.create_default_investment_types(uuid)'
  ] LOOP
    IF to_regprocedure(firma) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', firma);
    END IF;
  END LOOP;

  IF to_regprocedure('public.ensure_sin_asignar_category(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.ensure_sin_asignar_category(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.ensure_sin_asignar_category(uuid) TO authenticated;
  END IF;
END $$;

COMMIT;
