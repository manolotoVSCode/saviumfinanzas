
-- =====================================================
-- PASO 1: Crear nuevas subcategorías
-- =====================================================

-- Variables para el user_id
DO $$
DECLARE
  v_user_id uuid := '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e';
  
  -- IDs para las nuevas categorías
  v_casetas_id uuid;
  v_gasolina_id uuid;
  v_estacionamiento_id uuid;
  v_uber_id uuid;
  v_seguro_vehiculo_id uuid;
  
  v_supermercados_id uuid;
  v_tiendas_conveniencia_id uuid;
  v_restaurantes_id uuid;
  v_cafeterias_id uuid;
  v_comida_rapida_id uuid;
  v_delivery_id uuid;
  v_bares_id uuid;
  
  v_amazon_id uuid;
  v_ropa_id uuid;
  v_electronicos_id uuid;
  v_deportes_id uuid;
  v_bebe_id uuid;
  v_regalos_id uuid;
  v_hogar_ferreteria_id uuid;
  
  v_software_id uuid;
  v_streaming_id uuid;
  v_servicios_hogar_id uuid;
  v_cuotas_bancarias_id uuid;
  
  v_electricidad_id uuid;
  v_gas_id uuid;
  v_agua_id uuid;
  v_predial_id uuid;
  v_mantenimiento_id uuid;
  v_administracion_id uuid;
  
  -- Categorías antiguas a eliminar después
  v_old_casetas_id uuid;
  v_old_restaurantes_id uuid;
  v_old_compras_id uuid;
  v_old_supermercado_id uuid;
  v_old_suscripciones_id uuid;
  v_old_servicios_id uuid;
  v_old_movilidad_id uuid;

BEGIN
  -- =====================================================
  -- TRANSPORTE: Crear nuevas subcategorías
  -- =====================================================
  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Transporte', 'Casetas y Peajes', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_casetas_id;
  IF v_casetas_id IS NULL THEN
    SELECT id INTO v_casetas_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Casetas y Peajes';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Transporte', 'Gasolina', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_gasolina_id;
  IF v_gasolina_id IS NULL THEN
    SELECT id INTO v_gasolina_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Gasolina';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Transporte', 'Estacionamiento', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_estacionamiento_id;
  IF v_estacionamiento_id IS NULL THEN
    SELECT id INTO v_estacionamiento_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Estacionamiento';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Transporte', 'Uber / Taxi', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_uber_id;
  IF v_uber_id IS NULL THEN
    SELECT id INTO v_uber_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Uber / Taxi';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Transporte', 'Seguro Vehículo', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_seguro_vehiculo_id;
  IF v_seguro_vehiculo_id IS NULL THEN
    SELECT id INTO v_seguro_vehiculo_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Seguro Vehículo';
  END IF;

  -- =====================================================
  -- ALIMENTACIÓN: Crear nuevas subcategorías
  -- =====================================================
  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Alimentación', 'Supermercados', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_supermercados_id;
  IF v_supermercados_id IS NULL THEN
    SELECT id INTO v_supermercados_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Supermercados';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Alimentación', 'Tiendas Conveniencia', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_tiendas_conveniencia_id;
  IF v_tiendas_conveniencia_id IS NULL THEN
    SELECT id INTO v_tiendas_conveniencia_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Tiendas Conveniencia';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Alimentación', 'Restaurantes', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_restaurantes_id;
  IF v_restaurantes_id IS NULL THEN
    SELECT id INTO v_restaurantes_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Restaurantes' AND categoria = 'Alimentación';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Alimentación', 'Cafeterías', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_cafeterias_id;
  IF v_cafeterias_id IS NULL THEN
    SELECT id INTO v_cafeterias_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Cafeterías';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Alimentación', 'Comida Rápida', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_comida_rapida_id;
  IF v_comida_rapida_id IS NULL THEN
    SELECT id INTO v_comida_rapida_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Comida Rápida';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Alimentación', 'Delivery', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_delivery_id;
  IF v_delivery_id IS NULL THEN
    SELECT id INTO v_delivery_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Delivery';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Alimentación', 'Bares', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_bares_id;
  IF v_bares_id IS NULL THEN
    SELECT id INTO v_bares_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Bares';
  END IF;

  -- =====================================================
  -- COMPRAS: Crear nuevas subcategorías
  -- =====================================================
  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Amazon / Online', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_amazon_id;
  IF v_amazon_id IS NULL THEN
    SELECT id INTO v_amazon_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Amazon / Online';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Ropa y Accesorios', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_ropa_id;
  IF v_ropa_id IS NULL THEN
    SELECT id INTO v_ropa_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Ropa y Accesorios';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Electrónicos', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_electronicos_id;
  IF v_electronicos_id IS NULL THEN
    SELECT id INTO v_electronicos_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Electrónicos';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Deportes y Outdoor', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_deportes_id;
  IF v_deportes_id IS NULL THEN
    SELECT id INTO v_deportes_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Deportes y Outdoor';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Bebé y Niños', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_bebe_id;
  IF v_bebe_id IS NULL THEN
    SELECT id INTO v_bebe_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Bebé y Niños';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Regalos', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_regalos_id;
  IF v_regalos_id IS NULL THEN
    SELECT id INTO v_regalos_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Regalos';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Hogar y Ferretería', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_hogar_ferreteria_id;
  IF v_hogar_ferreteria_id IS NULL THEN
    SELECT id INTO v_hogar_ferreteria_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Hogar y Ferretería';
  END IF;

  -- =====================================================
  -- SUSCRIPCIONES: Crear nuevas subcategorías
  -- =====================================================
  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Software y Tech', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_software_id;
  IF v_software_id IS NULL THEN
    SELECT id INTO v_software_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Software y Tech';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Streaming', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_streaming_id;
  IF v_streaming_id IS NULL THEN
    SELECT id INTO v_streaming_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Streaming';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Hogar', 'Servicios Hogar', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_servicios_hogar_id;
  IF v_servicios_hogar_id IS NULL THEN
    SELECT id INTO v_servicios_hogar_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Servicios Hogar';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Compras personales', 'Cuotas Bancarias', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_cuotas_bancarias_id;
  IF v_cuotas_bancarias_id IS NULL THEN
    SELECT id INTO v_cuotas_bancarias_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Cuotas Bancarias';
  END IF;

  -- =====================================================
  -- HOGAR: Crear nuevas subcategorías de servicios
  -- =====================================================
  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Hogar', 'Electricidad (CFE)', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_electricidad_id;
  IF v_electricidad_id IS NULL THEN
    SELECT id INTO v_electricidad_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Electricidad (CFE)';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Hogar', 'Gas', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_gas_id;
  IF v_gas_id IS NULL THEN
    SELECT id INTO v_gas_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Gas';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Hogar', 'Agua', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_agua_id;
  IF v_agua_id IS NULL THEN
    SELECT id INTO v_agua_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Agua';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Hogar', 'Predial', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_predial_id;
  IF v_predial_id IS NULL THEN
    SELECT id INTO v_predial_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Predial';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Hogar', 'Mantenimiento Edificio', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_mantenimiento_id;
  IF v_mantenimiento_id IS NULL THEN
    SELECT id INTO v_mantenimiento_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Mantenimiento Edificio';
  END IF;

  INSERT INTO categorias (user_id, categoria, subcategoria, tipo)
  VALUES (v_user_id, 'Hogar', 'Administración', 'Gastos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_administracion_id;
  IF v_administracion_id IS NULL THEN
    SELECT id INTO v_administracion_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Administración';
  END IF;

  -- =====================================================
  -- PASO 2: RECLASIFICAR TRANSACCIONES
  -- =====================================================
  
  -- Obtener IDs de categorías antiguas
  SELECT id INTO v_old_casetas_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Casetas / Parking / Gas / Servicios';
  SELECT id INTO v_old_restaurantes_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Restaurantes' AND categoria = 'Ocio y tiempo libre';
  SELECT id INTO v_old_compras_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Compras';
  SELECT id INTO v_old_supermercado_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Supermercado, Oxxo';
  SELECT id INTO v_old_suscripciones_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Suscripciones';
  SELECT id INTO v_old_servicios_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Servicios (luz, agua, gas, mantenimiento)';
  SELECT id INTO v_old_movilidad_id FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Movilidad';

  -- =====================================================
  -- TRANSPORTE: Reclasificar desde "Casetas / Parking / Gas / Servicios"
  -- =====================================================
  
  -- Casetas y peajes
  UPDATE transacciones SET subcategoria_id = v_casetas_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_casetas_id
    AND (comentario ILIKE '%PASE %' OR comentario ILIKE '%PEAJE%' OR comentario ILIKE '%VIAPASS%');

  -- Gasolina
  UPDATE transacciones SET subcategoria_id = v_gasolina_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_casetas_id
    AND (comentario ILIKE '%GASOLIN%' OR comentario ILIKE '%PEMEX%');

  -- Estacionamiento
  UPDATE transacciones SET subcategoria_id = v_estacionamiento_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_casetas_id
    AND (comentario ILIKE '%PARCO%' OR comentario ILIKE '%PARKING%' OR comentario ILIKE '%ARTZ%' OR comentario ILIKE '%ESTACIONAMIENTO%');

  -- Uber / Taxi
  UPDATE transacciones SET subcategoria_id = v_uber_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_casetas_id
    AND (comentario ILIKE '%UBER%' OR comentario ILIKE '%DIDI%' OR comentario ILIKE '%CABIFY%' OR comentario ILIKE '%TAXI%');

  -- También mover los de Movilidad a Uber/Taxi
  UPDATE transacciones SET subcategoria_id = v_uber_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_movilidad_id
    AND (comentario ILIKE '%UBER%' OR comentario ILIKE '%DIDI%' OR comentario ILIKE '%CABIFY%');

  -- Seguro vehículo
  UPDATE transacciones SET subcategoria_id = v_seguro_vehiculo_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_casetas_id
    AND (comentario ILIKE '%QUALITAS%' OR comentario ILIKE '%SEGURO%' OR comentario ILIKE '%GNP%' OR comentario ILIKE '%AXA%');

  -- Los que queden en Casetas, moverlos a Casetas y Peajes como default
  UPDATE transacciones SET subcategoria_id = v_casetas_id
  WHERE user_id = v_user_id AND subcategoria_id = v_old_casetas_id;

  -- =====================================================
  -- ALIMENTACIÓN: Reclasificar desde "Supermercado, Oxxo"
  -- =====================================================
  
  -- Supermercados
  UPDATE transacciones SET subcategoria_id = v_supermercados_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_supermercado_id
    AND (comentario ILIKE '%COSTCO%' OR comentario ILIKE '%WALMART%' OR comentario ILIKE '%SUPERAMA%' 
         OR comentario ILIKE '%SORIANA%' OR comentario ILIKE '%CHEDRAUI%' OR comentario ILIKE '%LA COMER%'
         OR comentario ILIKE '%HEB%' OR comentario ILIKE '%CITY MARKET%' OR comentario ILIKE '%FRESKO%');

  -- Tiendas conveniencia
  UPDATE transacciones SET subcategoria_id = v_tiendas_conveniencia_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_supermercado_id
    AND (comentario ILIKE '%OXXO%' OR comentario ILIKE '%7-ELEVEN%' OR comentario ILIKE '%7 ELEVEN%' 
         OR comentario ILIKE '%CIRCLE K%' OR comentario ILIKE '%EXTRA%');

  -- Los que queden, mover a Supermercados
  UPDATE transacciones SET subcategoria_id = v_supermercados_id
  WHERE user_id = v_user_id AND subcategoria_id = v_old_supermercado_id;

  -- =====================================================
  -- ALIMENTACIÓN: Reclasificar desde "Restaurantes" (Ocio)
  -- =====================================================
  
  -- Cafeterías
  UPDATE transacciones SET subcategoria_id = v_cafeterias_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_restaurantes_id
    AND (comentario ILIKE '%CAFE%' OR comentario ILIKE '%STARBUCKS%' OR comentario ILIKE '%CIELITO%' 
         OR comentario ILIKE '%NIDDO%' OR comentario ILIKE '%CHIQUITITO%' OR comentario ILIKE '%LATTE%'
         OR comentario ILIKE '%COFFEE%' OR comentario ILIKE '%SIRENA%' OR comentario ILIKE '%CONEJO BLANCO%'
         OR comentario ILIKE '%BAKERS%' OR comentario ILIKE '%GRANIER%' OR comentario ILIKE '%OAKBERRY%'
         OR comentario ILIKE '%KRISPY KREME%');

  -- Comida rápida
  UPDATE transacciones SET subcategoria_id = v_comida_rapida_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_restaurantes_id
    AND (comentario ILIKE '%SHAKE SHACK%' OR comentario ILIKE '%FIVE GUYS%' OR comentario ILIKE '%PANDAEXPRESS%'
         OR comentario ILIKE '%PANDA EXPRESS%' OR comentario ILIKE '%MCDONALDS%' OR comentario ILIKE '%BURGER%'
         OR comentario ILIKE '%WENDYS%' OR comentario ILIKE '%CARLS%' OR comentario ILIKE '%DOMINOS%'
         OR comentario ILIKE '%LITTLE CAESARS%' OR comentario ILIKE '%SUBWAY%' OR comentario ILIKE '%TACO BELL%'
         OR comentario ILIKE '%CHIPOTLE%' OR comentario ILIKE '%KFC%' OR comentario ILIKE '%TACOS%'
         OR comentario ILIKE '%CALIFA%' OR comentario ILIKE '%TAQUERIA%');

  -- Delivery
  UPDATE transacciones SET subcategoria_id = v_delivery_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_restaurantes_id
    AND (comentario ILIKE '%UBER EATS%' OR comentario ILIKE '%RAPPI%' OR comentario ILIKE '%DIDI FOOD%'
         OR comentario ILIKE '%CORNERSHOP%');

  -- Bares
  UPDATE transacciones SET subcategoria_id = v_bares_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_restaurantes_id
    AND (comentario ILIKE '%JABA%' OR comentario ILIKE '%MONKEY BUTT%' OR comentario ILIKE '%BAR %'
         OR comentario ILIKE '%CANTINA%' OR comentario ILIKE '%PUB%');

  -- Restaurantes (los que queden van a la nueva categoría de Alimentación > Restaurantes)
  UPDATE transacciones SET subcategoria_id = v_restaurantes_id
  WHERE user_id = v_user_id AND subcategoria_id = v_old_restaurantes_id;

  -- =====================================================
  -- COMPRAS: Reclasificar desde "Compras"
  -- =====================================================
  
  -- Amazon / Online
  UPDATE transacciones SET subcategoria_id = v_amazon_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_compras_id
    AND (comentario ILIKE '%AMAZON%' OR comentario ILIKE '%MERCADO LIBRE%' OR comentario ILIKE '%EBAY%'
         OR comentario ILIKE '%ALIEXPRESS%');

  -- Ropa y Accesorios
  UPDATE transacciones SET subcategoria_id = v_ropa_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_compras_id
    AND (comentario ILIKE '%LEVI%' OR comentario ILIKE '%BARBOUR%' OR comentario ILIKE '%ZARA%'
         OR comentario ILIKE '%H&M%' OR comentario ILIKE '%OTHER STORIES%' OR comentario ILIKE '%TRINITATE%'
         OR comentario ILIKE '%PALACIO%' OR comentario ILIKE '%LIVERPOOL%' OR comentario ILIKE '%LA MARI%');

  -- Electrónicos
  UPDATE transacciones SET subcategoria_id = v_electronicos_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_compras_id
    AND (comentario ILIKE '%APPLE STORE%' OR comentario ILIKE '%STEREN%' OR comentario ILIKE '%BEST BUY%'
         OR comentario ILIKE '%ISTORE%');

  -- Deportes y Outdoor
  UPDATE transacciones SET subcategoria_id = v_deportes_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_compras_id
    AND (comentario ILIKE '%DECATHLON%' OR comentario ILIKE '%MOTOCARD%' OR comentario ILIKE '%BARRABES%'
         OR comentario ILIKE '%DEPORTES%' OR comentario ILIKE '%MARTÍ%' OR comentario ILIKE '%COTOPAXI%'
         OR comentario ILIKE '%QUAD LOCK%' OR comentario ILIKE '%PADEL%');

  -- Bebé y Niños
  UPDATE transacciones SET subcategoria_id = v_bebe_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_compras_id
    AND (comentario ILIKE '%NUNA%' OR comentario ILIKE '%BABY%' OR comentario ILIKE '%KIDS%'
         OR comentario ILIKE '%SHOTGUN%');

  -- Regalos
  UPDATE transacciones SET subcategoria_id = v_regalos_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_compras_id
    AND (comentario ILIKE '%REGALO%' OR comentario ILIKE '%GIFT%');

  -- Hogar y Ferretería
  UPDATE transacciones SET subcategoria_id = v_hogar_ferreteria_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_compras_id
    AND (comentario ILIKE '%HOME DEPOT%' OR comentario ILIKE '%FERRETERIA%' OR comentario ILIKE '%MOSQUITER%'
         OR comentario ILIKE '%REJILLA%');

  -- Los que queden van a Amazon/Online como default
  UPDATE transacciones SET subcategoria_id = v_amazon_id
  WHERE user_id = v_user_id AND subcategoria_id = v_old_compras_id;

  -- =====================================================
  -- SUSCRIPCIONES: Reclasificar
  -- =====================================================
  
  -- Software y Tech
  UPDATE transacciones SET subcategoria_id = v_software_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_suscripciones_id
    AND (comentario ILIKE '%LOVABLE%' OR comentario ILIKE '%SUPABASE%' OR comentario ILIKE '%GITHUB%'
         OR comentario ILIKE '%OPENAI%' OR comentario ILIKE '%CHATGPT%' OR comentario ILIKE '%OPUS%'
         OR comentario ILIKE '%GOOGLE NEST%');

  -- Streaming
  UPDATE transacciones SET subcategoria_id = v_streaming_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_suscripciones_id
    AND (comentario ILIKE '%SPOTIFY%' OR comentario ILIKE '%NETFLIX%' OR comentario ILIKE '%DISNEY%'
         OR comentario ILIKE '%HBO%' OR comentario ILIKE '%PRIME VIDEO%' OR comentario ILIKE '%APPLE.COM/BILL%'
         OR comentario ILIKE '%APPLE  COM/BILL%' OR comentario ILIKE '%MSBILL%');

  -- Servicios Hogar
  UPDATE transacciones SET subcategoria_id = v_servicios_hogar_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_suscripciones_id
    AND (comentario ILIKE '%ROTOPLAS%');

  -- Cuotas Bancarias
  UPDATE transacciones SET subcategoria_id = v_cuotas_bancarias_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_suscripciones_id
    AND (comentario ILIKE '%CUOTA ANUAL%' OR comentario ILIKE '%IVA APLICABLE%');

  -- Los que queden van a Software
  UPDATE transacciones SET subcategoria_id = v_software_id
  WHERE user_id = v_user_id AND subcategoria_id = v_old_suscripciones_id;

  -- =====================================================
  -- HOGAR: Reclasificar "Servicios (luz, agua, gas, mantenimiento)"
  -- =====================================================
  
  -- Electricidad
  UPDATE transacciones SET subcategoria_id = v_electricidad_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_servicios_id
    AND (comentario ILIKE '%CFE%' OR comentario ILIKE '%COMISION FEDERAL DE ELE%');

  -- Gas
  UPDATE transacciones SET subcategoria_id = v_gas_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_servicios_id
    AND (comentario ILIKE '%NATURGY%' OR comentario ILIKE '%GAS NATURAL%');

  -- Agua
  UPDATE transacciones SET subcategoria_id = v_agua_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_servicios_id
    AND (comentario ILIKE '%AGUA%');

  -- Predial
  UPDATE transacciones SET subcategoria_id = v_predial_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_servicios_id
    AND (comentario ILIKE '%PREDIAL%');

  -- Mantenimiento Edificio
  UPDATE transacciones SET subcategoria_id = v_mantenimiento_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_servicios_id
    AND (comentario ILIKE '%MANTENIMIENTO%' OR comentario ILIKE '%SG53%' OR comentario ILIKE '%SCGUA%');

  -- Administración
  UPDATE transacciones SET subcategoria_id = v_administracion_id
  WHERE user_id = v_user_id 
    AND subcategoria_id = v_old_servicios_id
    AND (comentario ILIKE '%ADMIN%' OR comentario ILIKE '%FIANZA%');

  -- Los que queden van a Servicios Hogar
  UPDATE transacciones SET subcategoria_id = v_servicios_hogar_id
  WHERE user_id = v_user_id AND subcategoria_id = v_old_servicios_id;

  -- =====================================================
  -- PASO 3: Eliminar categorías antiguas sin transacciones
  -- =====================================================
  DELETE FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Casetas / Parking / Gas / Servicios';
  DELETE FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Restaurantes' AND categoria = 'Ocio y tiempo libre';
  DELETE FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Compras';
  DELETE FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Supermercado, Oxxo';
  DELETE FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Suscripciones';
  DELETE FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Servicios (luz, agua, gas, mantenimiento)';
  DELETE FROM categorias WHERE user_id = v_user_id AND subcategoria = 'Movilidad';

END $$;
