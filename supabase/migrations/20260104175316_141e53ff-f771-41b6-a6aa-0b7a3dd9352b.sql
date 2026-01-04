-- 1. Reclasificar MUEVE CIUDAD a Estacionamiento
UPDATE public.transacciones 
SET subcategoria_id = '6fa2a0f0-c083-439d-b558-8c9a024076a9'
WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'
  AND comentario ILIKE '%MUEVE CIUDAD%';

-- 2. Reclasificar TRANSPORTACION, EMT, TAXI, TAXIS a Uber / Taxi
UPDATE public.transacciones 
SET subcategoria_id = 'a6f08d1e-6023-403b-b937-32ac5cafdebb'
WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'
  AND (comentario ILIKE '%TRANSPORTACION%' 
    OR comentario ILIKE '%EMT %' 
    OR comentario ILIKE '%TAXI%' 
    OR comentario ILIKE '%TAXIS%');

-- 3. Reclasificar cualquier Amazon restante a Amazon
UPDATE public.transacciones 
SET subcategoria_id = '737eff61-0f00-4201-b522-bdf37d18e49e'
WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'
  AND comentario ILIKE '%AMAZON%';

-- 4. Reclasificar MERCADO LIBRE a Amazon
UPDATE public.transacciones 
SET subcategoria_id = '737eff61-0f00-4201-b522-bdf37d18e49e'
WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'
  AND comentario ILIKE '%MERCADO LIBRE%';

-- 5. Reclasificar MENSAJERIA a Envíos
UPDATE public.transacciones 
SET subcategoria_id = 'dfcfff52-d1dd-445e-b741-a9b0b86737fd'
WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'
  AND comentario ILIKE '%MENSAJERIA%';