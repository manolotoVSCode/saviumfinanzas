-- Limpieza de reglas de clasificación (2026-09-22)
--
-- 1. Borra las dos reglas que hoy no clasifican nada: "Mascotas" (ninguna
--    transacción la activa) e "Higiene Personal" (sus únicas coincidencias eran
--    "FIVE GUYS SPAIN", que se lleva Restaurantes). Se volverán a crear a mano
--    cuando aparezca un gasto de verdad.
-- 2. Quita DIESEL de "Ropa y Accesorios": la marca chocaba con el combustible,
--    que se queda en la regla de Gasolina.
-- 3. Quita palabras clave repetidas dentro de una misma regla, comparando sin
--    distinguir mayúsculas ni espacios de más y conservando la primera aparición.
--
-- Solo toca las filas del usuario que ejecuta (RLS). Para revisar antes de
-- aplicar, ejecuta primero las consultas del bloque de verificación del final.

BEGIN;

-- 1) Reglas vacías
DELETE FROM classification_rules
WHERE name IN ('Mascotas', 'Higiene Personal');

-- 2) DIESEL fuera de Ropa y Accesorios
UPDATE classification_rules
SET keyword = (
  SELECT string_agg(kw, ',' ORDER BY orden)
  FROM unnest(string_to_array(keyword, ',')) WITH ORDINALITY AS t(kw, orden)
  WHERE lower(btrim(kw)) <> 'diesel'
)
WHERE name = 'Ropa y Accesorios';

-- 3) Palabras clave repetidas dentro de la misma regla
UPDATE classification_rules r
SET keyword = limpias.keyword
FROM (
  SELECT id, string_agg(kw, ',' ORDER BY orden) AS keyword
  FROM (
    SELECT DISTINCT ON (id, regexp_replace(lower(btrim(kw)), '\s+', ' ', 'g'))
           id,
           btrim(kw) AS kw,
           orden
    FROM classification_rules,
         LATERAL unnest(string_to_array(keyword, ',')) WITH ORDINALITY AS t(kw, orden)
    WHERE btrim(kw) <> ''
    ORDER BY id, regexp_replace(lower(btrim(kw)), '\s+', ' ', 'g'), orden
  ) sin_repetir
  GROUP BY id
) limpias
WHERE r.id = limpias.id
  AND r.keyword IS DISTINCT FROM limpias.keyword;

COMMIT;

-- Verificación: ninguna fila debería salir en las dos primeras consultas.
--
-- -- a) ¿Quedan reglas con palabras clave repetidas?
-- SELECT name,
--        regexp_replace(lower(btrim(kw)), '\s+', ' ', 'g') AS palabra,
--        count(*)
-- FROM classification_rules,
--      LATERAL unnest(string_to_array(keyword, ',')) AS kw
-- GROUP BY 1, 2
-- HAVING count(*) > 1;
--
-- -- b) ¿Sigue DIESEL en Ropa y Accesorios?
-- SELECT name FROM classification_rules
-- WHERE name = 'Ropa y Accesorios'
--   AND EXISTS (
--     SELECT 1 FROM unnest(string_to_array(keyword, ',')) AS kw
--     WHERE lower(btrim(kw)) = 'diesel'
--   );
--
-- -- c) Recuento final: 26 reglas y cuántas palabras clave tiene cada una.
-- SELECT count(*) AS reglas FROM classification_rules;
-- SELECT name, array_length(string_to_array(keyword, ','), 1) AS palabras
-- FROM classification_rules ORDER BY name;
