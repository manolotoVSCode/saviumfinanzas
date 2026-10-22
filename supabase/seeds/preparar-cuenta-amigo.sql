-- Prepara la cuenta nueva de un amigo con la configuración del titular, para que funcione desde el primer día:
--   · perfil (nombre y divisa)
--   · todas las categorías del titular (con seguimiento de pago y frecuencia: Por pagar y Pagos anuales igual)
--   · todas sus reglas de clasificación, apuntando a las categorías copiadas. Las que en la cuenta del titular
--     iban acotadas a una cuenta suya se copian SIN cuenta (conservan los montos): el resumen final las marca
--     para que el amigo las vuelva a acotar cuando cree sus cuentas.
--   · sus tipos de inversión
-- No copia nada más: ni cuentas, ni movimientos, ni suscripciones, pendientes, provisiones, inversiones, criptos,
-- «Para mi familia», contactos ni código de emergencia.
--
-- El editor SQL ignora RLS: este script SOLO LEE de la cuenta del titular (01ad1bcc-…) y SOLO ESCRIBE en la del
-- amigo (cada sentencia filtra por su user_id). Se puede ejecutar varias veces mientras el amigo no haya creado
-- cuentas ni movimientos: borra lo copiado antes y lo vuelve a copiar.
--
-- Antes de ejecutarlo:
--   1) Crear al amigo en Supabase → Authentication → Users → Add user (correo y contraseña, «Auto confirm»).
--   2) Cambiar abajo CORREO, NOMBRE, APELLIDOS y DIVISA (no dejar el correo en el repo: es público).
--   3) Proyecto SAVIUM APP (no TORTRACS).

DO $$
DECLARE
  origen      constant uuid := '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e';  -- titular (solo lectura)
  v_correo    constant text := 'CORREO_DEL_AMIGO';
  v_nombre    constant text := 'NOMBRE';
  v_apellidos constant text := 'APELLIDOS';
  v_divisa    constant text := 'MXN';
  u uuid;
BEGIN
  SELECT id INTO u FROM auth.users WHERE lower(email) = lower(v_correo);
  IF u IS NULL THEN
    RAISE EXCEPTION 'No hay ninguna cuenta con el correo %: créala antes en Authentication → Users', v_correo;
  END IF;
  IF u = origen THEN
    RAISE EXCEPTION 'Ese correo es el del titular';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lectores WHERE lector_id = u OR propietario_id = u) THEN
    RAISE EXCEPTION 'La cuenta % participa en un acceso de lectura (tabla lectores): no es una cuenta de amigo', v_correo;
  END IF;
  IF EXISTS (SELECT 1 FROM public.cuentas WHERE user_id = u)
     OR EXISTS (SELECT 1 FROM public.transacciones WHERE user_id = u)
     OR EXISTS (SELECT 1 FROM public.inversiones WHERE user_id = u) THEN
    RAISE EXCEPTION 'La cuenta % ya tiene cuentas, movimientos o inversiones: este script es solo para una cuenta nueva', v_correo;
  END IF;

  -- 1) Perfil (puede existir ya, vacío, si el alta lo creó)
  INSERT INTO public.profiles (user_id, nombre, apellidos, divisa_preferida)
  VALUES (u, v_nombre, v_apellidos, v_divisa)
  ON CONFLICT (user_id) DO UPDATE
    SET nombre = EXCLUDED.nombre, apellidos = EXCLUDED.apellidos, divisa_preferida = EXCLUDED.divisa_preferida;

  -- 2) Borrar lo de una ejecución anterior (o lo que creara el alta). Solo el user_id del amigo.
  DELETE FROM public.classification_rules WHERE user_id = u;
  DELETE FROM public.categorias           WHERE user_id = u;
  DELETE FROM public.investment_types     WHERE user_id = u;

  -- 3) Categorías: id nuevo por cada categoría del titular, para remapear las reglas
  CREATE TEMP TABLE mapa_categorias ON COMMIT DROP AS
    SELECT id AS viejo, gen_random_uuid() AS nuevo FROM public.categorias WHERE user_id = origen;

  INSERT INTO public.categorias (id, user_id, categoria, subcategoria, tipo, seguimiento_pago, frecuencia_seguimiento)
  SELECT m.nuevo, u, c.categoria, c.subcategoria, c.tipo, c.seguimiento_pago, c.frecuencia_seguimiento
  FROM public.categorias c JOIN mapa_categorias m ON m.viejo = c.id
  WHERE c.user_id = origen;

  -- 4) Reglas (sin cuenta: las cuentas del titular no son suyas)
  INSERT INTO public.classification_rules
    (user_id, name, keyword, match_type, category_id, priority, active, amount_min, amount_max, cuenta_id)
  SELECT u, r.name, r.keyword, r.match_type, m.nuevo, r.priority, r.active, r.amount_min, r.amount_max, NULL
  FROM public.classification_rules r JOIN mapa_categorias m ON m.viejo = r.category_id
  WHERE r.user_id = origen;

  -- 5) Tipos de inversión
  INSERT INTO public.investment_types
    (user_id, nombre, comportamiento, permite_reinversion, requiere_vencimiento, orden, active, color)
  SELECT u, t.nombre, t.comportamiento, t.permite_reinversion, t.requiere_vencimiento, t.orden, t.active, t.color
  FROM public.investment_types t
  WHERE t.user_id = origen;

  -- Para el resumen de abajo (el editor solo enseña el resultado de la última sentencia)
  CREATE TEMP TABLE IF NOT EXISTS resumen_cuenta_amigo (orden int, que text, detalle text);
  DELETE FROM resumen_cuenta_amigo;
  INSERT INTO resumen_cuenta_amigo
  SELECT 0, 'Copiado a ' || v_correo, format('%s categorías, %s reglas, %s tipos de inversión',
    (SELECT count(*) FROM public.categorias WHERE user_id = u),
    (SELECT count(*) FROM public.classification_rules WHERE user_id = u),
    (SELECT count(*) FROM public.investment_types WHERE user_id = u));
  INSERT INTO resumen_cuenta_amigo
  SELECT CASE WHEN r.cuenta_id IS NULL THEN 2 ELSE 1 END,
         CASE WHEN r.cuenta_id IS NULL THEN 'Regla' ELSE 'Regla a reacotar a una cuenta suya' END,
         format('%s · «%s» → %s / %s%s', coalesce(r.name, '(sin nombre)'), r.keyword, c.categoria, c.subcategoria,
                CASE WHEN r.cuenta_id IS NULL THEN '' ELSE ' · en tu cuenta iba solo en ' || coalesce(a.nombre, '?') END)
  FROM public.classification_rules r
  JOIN public.categorias c ON c.id = r.category_id
  LEFT JOIN public.cuentas a ON a.id = r.cuenta_id AND a.user_id = origen
  WHERE r.user_id = origen AND c.user_id = origen;
END $$;

SELECT que, detalle FROM resumen_cuenta_amigo ORDER BY orden, detalle;
