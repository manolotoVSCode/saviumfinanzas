
-- 1. Crear las nuevas subcategorías
INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo) VALUES
  ('01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e', 'Compras personales', 'Amazon', 'Gastos'),
  ('01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e', 'Compras personales', 'PayPal / Otros', 'Gastos'),
  ('01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e', 'Servicios', 'Celular', 'Gastos'),
  ('01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e', 'Servicios', 'Envíos', 'Gastos');

-- 2. Reclasificar transacciones a Amazon
UPDATE public.transacciones 
SET subcategoria_id = (SELECT id FROM public.categorias WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e' AND subcategoria = 'Amazon' LIMIT 1)
WHERE subcategoria_id = '4782e0ef-05c2-4d8a-8ed9-ca7063603a9c'
  AND (comentario ILIKE '%AMAZON MX MARKETPLACE%' OR comentario ILIKE '%AMAZON MX*AMAZON RETAIL%');

-- 3. Reclasificar transacciones a Celular (Telcel)
UPDATE public.transacciones 
SET subcategoria_id = (SELECT id FROM public.categorias WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e' AND subcategoria = 'Celular' LIMIT 1)
WHERE subcategoria_id = '4782e0ef-05c2-4d8a-8ed9-ca7063603a9c'
  AND comentario ILIKE '%TELCEL%';

-- 4. Reclasificar transacciones a Envíos
UPDATE public.transacciones 
SET subcategoria_id = (SELECT id FROM public.categorias WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e' AND subcategoria = 'Envíos' LIMIT 1)
WHERE subcategoria_id = '4782e0ef-05c2-4d8a-8ed9-ca7063603a9c'
  AND (comentario ILIKE '%ENVIOCLICK%' OR comentario ILIKE '%ENVIAYA%');

-- 5. Reclasificar transacciones a PayPal / Otros
UPDATE public.transacciones 
SET subcategoria_id = (SELECT id FROM public.categorias WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e' AND subcategoria = 'PayPal / Otros' LIMIT 1)
WHERE subcategoria_id = '4782e0ef-05c2-4d8a-8ed9-ca7063603a9c'
  AND (comentario ILIKE '%Recibo PayPal Europe%' OR comentario ILIKE '%PAYPAL *RANAXARNET%');

-- 6. Reclasificar transacciones dudosas a SIN ASIGNAR
UPDATE public.transacciones 
SET subcategoria_id = '81a57e73-5075-48f4-b126-20bf57ad3d1b'
WHERE subcategoria_id = '4782e0ef-05c2-4d8a-8ed9-ca7063603a9c'
  AND (comentario ILIKE '%CGO Transferencia SPEI%' 
    OR comentario ILIKE '%OMX 147%' 
    OR comentario ILIKE '%LAB CENTRO COPIAS%' 
    OR comentario ILIKE '%EXALTA HERO%');

-- 7. Eliminar la categoría antigua "Amazon / Online"
DELETE FROM public.categorias WHERE id = '4782e0ef-05c2-4d8a-8ed9-ca7063603a9c';
