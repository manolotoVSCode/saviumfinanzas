-- Limpieza de reglas de clasificación (2026-09-22)
--
-- OJO: el editor SQL de Supabase corre como administrador y NO aplica RLS, así
-- que ve las reglas de TODOS los user_id. La base tiene dos juegos completos de
-- reglas (dos cuentas). Por eso cada sentencia filtra por user_id de forma
-- explícita: sin ese filtro se tocan también las del otro usuario.
--
-- Sustituye :usuario por el id de la cuenta que usas en la app.
--
-- 1. Borra las reglas que no clasifican nada ("Mascotas", "Higiene Personal").
-- 2. Quita DIESEL de "Ropa y Accesorios" (se queda en la regla de Gasolina).
-- 3. Quita palabras clave repetidas dentro de una misma regla. La comparación
--    ignora mayúsculas Y signos, igual que hace la app al clasificar: para ella
--    "AT&T" y "AT T" son la misma palabra, y "F.AHORRO" y "F AHORRO" también.

BEGIN;

-- 1) Reglas que no clasifican nada
DELETE FROM classification_rules
WHERE user_id = :'usuario'
  AND name IN ('Mascotas', 'Higiene Personal');

-- 2) DIESEL fuera de Ropa y Accesorios
UPDATE classification_rules
SET keyword = (
  SELECT string_agg(kw, ',' ORDER BY orden)
  FROM unnest(string_to_array(keyword, ',')) WITH ORDINALITY AS t(kw, orden)
  WHERE lower(btrim(kw)) <> 'diesel'
)
WHERE user_id = :'usuario'
  AND name = 'Ropa y Accesorios';

-- 3) Palabras clave repetidas (ignorando mayúsculas y signos)
UPDATE classification_rules r
SET keyword = limpias.keyword
FROM (
  SELECT id, string_agg(kw, ',' ORDER BY orden) AS keyword
  FROM (
    SELECT DISTINCT ON (id, btrim(regexp_replace(lower(kw), '[^a-z0-9áéíóúñü]+', ' ', 'g')))
           id,
           btrim(kw) AS kw,
           orden
    FROM classification_rules,
         LATERAL unnest(string_to_array(keyword, ',')) WITH ORDINALITY AS t(kw, orden)
    WHERE user_id = :'usuario'
      AND btrim(kw) <> ''
    ORDER BY id,
             btrim(regexp_replace(lower(kw), '[^a-z0-9áéíóúñü]+', ' ', 'g')),
             orden
  ) sin_repetir
  GROUP BY id
) limpias
WHERE r.id = limpias.id
  AND r.user_id = :'usuario'
  AND r.keyword IS DISTINCT FROM limpias.keyword;

COMMIT;

-- Verificación (no debe devolver filas la primera):
--
-- SELECT name,
--        btrim(regexp_replace(lower(kw), '[^a-z0-9áéíóúñü]+', ' ', 'g')) AS palabra,
--        count(*)
-- FROM classification_rules,
--      LATERAL unnest(string_to_array(keyword, ',')) AS kw
-- WHERE user_id = :'usuario'
-- GROUP BY 1, 2
-- HAVING count(*) > 1;
--
-- SELECT name, array_length(string_to_array(keyword, ','), 1) AS palabras
-- FROM classification_rules
-- WHERE user_id = :'usuario'
-- ORDER BY name;
