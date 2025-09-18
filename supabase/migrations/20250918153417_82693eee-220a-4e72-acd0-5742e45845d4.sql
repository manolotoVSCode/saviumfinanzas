-- Eliminar el constraint existente
ALTER TABLE public.categorias DROP CONSTRAINT categorias_tipo_check;

-- Agregar el nuevo constraint que incluye 'Reembolso'
ALTER TABLE public.categorias ADD CONSTRAINT categorias_tipo_check 
CHECK (tipo = ANY (ARRAY['Ingreso'::text, 'Gastos'::text, 'Aportación'::text, 'Retiro'::text, 'Reembolso'::text]));

-- Agregar categorías de reembolso por defecto para usuarios existentes
INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo)
SELECT DISTINCT user_id, 'Reembolsos', 'Reembolso de Gastos', 'Reembolso'
FROM public.categorias
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias c2 
  WHERE c2.user_id = categorias.user_id 
  AND c2.categoria = 'Reembolsos' 
  AND c2.subcategoria = 'Reembolso de Gastos'
  AND c2.tipo = 'Reembolso'
);

INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo)
SELECT DISTINCT user_id, 'Reembolsos', 'Reembolso de Ingresos', 'Reembolso'
FROM public.categorias
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias c2 
  WHERE c2.user_id = categorias.user_id 
  AND c2.categoria = 'Reembolsos' 
  AND c2.subcategoria = 'Reembolso de Ingresos'
  AND c2.tipo = 'Reembolso'
);

INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo)
SELECT DISTINCT user_id, 'Reembolsos', 'Devolución de Compras', 'Reembolso'
FROM public.categorias
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias c2 
  WHERE c2.user_id = categorias.user_id 
  AND c2.categoria = 'Reembolsos' 
  AND c2.subcategoria = 'Devolución de Compras'
  AND c2.tipo = 'Reembolso'
);