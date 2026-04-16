
-- 1. Create helper function for default classification rules
CREATE OR REPLACE FUNCTION public.create_default_classification_rules(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO classification_rules (user_id, name, keyword, match_type, category_id, priority, active)
  SELECT target_user_id, r.rule_name, r.keywords, 'contains', cat.id, 0, true
  FROM (VALUES
    -- ALIMENTACIÓN
    ('Supermercados', 'WALMART,WAL-MART,BODEGA AURRERA,CHEDRAUI,SORIANA,LA COMER,CITY MARKET,FRESKO,SUMESA,SUPERAMA,HEB,MEGA,COMERCIAL MEXICANA,COSTCO,SAMS CLUB,LIDER,ALSUPER,S-MART,MERCADONA,LIDL,ALDI,CARREFOUR,ALCAMPO,HIPERCOR,EROSKI,CONSUM,DIA,AHORRAMAS,BM SUPERMERCADOS,SUPERSOL,CAPRABO,BON PREU,SPAR,COVIRAN,SIMPLY,VIVAL,FROIZ,GADIS,SUPECO,FAMILY CASH,MASYMAS,SUPERMERCADO,SUPERMARKET,GROCERY', 'Alimentación', 'Supermercados'),
    ('Tiendas de Conveniencia', 'OXXO,7-ELEVEN,7 ELEVEN,SEVEN ELEVEN,EXTRA,CIRCLE K,KIOSKO,TIENDAS 3B,OPENCOR,SPAR EXPRESS,ALSARA,VALVI,CONVENIENCIA,MINIMARKET,CONVENIENCE', 'Alimentación', 'Tiendas de Conveniencia'),
    ('Delivery', 'RAPPI,UBER EATS,UBEREATS,DIDI FOOD,DIDIFOOD,SIN DELANTAL,JUSTO,GLOVO,DELIVEROO,JUST EAT,JUSTEAT,DELIVERY,FOOD DELIVERY,A DOMICILIO', 'Alimentación', 'Delivery'),
    ('Restaurantes y Bares', 'MCDONALDS,BURGER KING,DOMINOS,SUBWAY,KFC,STARBUCKS,VIPS,SANBORNS,CHILIS,APPLEBEES,PANDA EXPRESS,POLLO FELIZ,LOS PORTALES,TOKS,WINGS,BEER FACTORY,ALSEA,TELEPIZZA,FOSTER,TGI FRIDAYS,CERVECERIA,SIDRERIA,TAPERIA,100 MONTADITOS,RESTAURANTE,RESTAURANT,BAR,CAFETERIA,CAFE,BISTRO,GRILL,PIZZA,SUSHI,TAQUERIA,CANTINA,FONDA,COCINA,BRASSERIE,PUB,TABERNA,MESON,TASCA,HAMBURGUESERIA,PARRILLA,MARISCOS,CEVICHERIA,BARBECUE,BBQ', 'Alimentación', 'Restaurantes'),

    -- TRANSPORTE
    ('Gasolina', 'PEMEX,G500,HIDROSINA,OXXO GAS,PETRO 7,SUNOCO,TOTAL GAS,REPSOL,CEPSA,GALP,CAMPSA,Q8,PETRONOR,GASOLINERA,GASOLINA,COMBUSTIBLE,DIESEL,ESTACION DE SERVICIO,GAS STATION,BP,SHELL,ESSO,MOBIL', 'Transporte', 'Gasolina'),
    ('Casetas y Peajes', 'CAPUFE,VIAPASS,IAVE,TELEVIA,TAG PASE,ABERTIS,IBERPISTAS,AUDASA,ACESA,AVASA,AUCALSA,AUMAR,VIA T,PEAJE,CASETA,TOLL,AUTOPISTA,VIADUCTO,HIGHWAY', 'Transporte', 'Casetas y Peajes'),
    ('Estacionamiento', 'CANON VERDE,VALET PARKING,EMPARK,SABA,INDIGO,SEIPASA,PARKIA,EYSA,GOLIVE,ORA,PARKING,ESTACIONAMIENTO,PARQUIMETRO,APARCAMIENTO,GARAJE', 'Transporte', 'Estacionamiento'),
    ('Movilidad', 'DIDI,INDRIVER,METRO CDMX,METROBUS,TROLEBUS,TREN LIGERO,ECOBICI,CABIFY MX,BEAT,RENFE,CERCANIAS,METRO,EMT,TMB,ALSA,AVANZA,FREE NOW,FREENOW,BLABLACAR,BIZI,SEVICI,NEXTBIKE,EMT MADRID,UBER,CABIFY,TAXI,AUTOBUS,BUS,TREN,TRANVIA,MOVILIDAD,RIDE,LYFT', 'Transporte', 'Movilidad'),
    ('Seguro de Vehículo', 'QUALITAS,HDI SEGUROS,GNP AUTO,ANA SEGUROS,PRIMERO SEGUROS,MAPFRE AUTO,ZURICH AUTO,CHUBB AUTO,TOKIO MARINE,MUTUA MADRILEÑA,LINEA DIRECTA,FIATC,REALE SEGUROS,PELAYO,LIBERTY SEGUROS,GENERALI AUTO,SEGURO AUTO,SEGURO VEHICULO,SEGURO AUTOMOVIL,AXA,MAPFRE,ZURICH,ALLIANZ,SEGURO COCHE,PRIMA SEGURO,POLIZA AUTO', 'Transporte', 'Seguro de Vehículo'),

    -- HOGAR
    ('Electricidad', 'CFE,COMISION FEDERAL DE ELECTRICIDAD,COMISION FEDERAL ELEC,IBERDROLA,ENDESA,NATURGY,EDP,TOTALENERGIES,HOLALUZ,OCTOPUS ENERGY,REPSOL ELECTRICIDAD,PLENITUDE,ELECTRICIDAD,LUZ,ENERGIA ELECTRICA,ELECTRIC,SUMINISTRO ELECTRICO', 'Hogar', 'Electricidad'),
    ('Gas', 'ZETA GAS,TOMZA,GAS BIENESTAR,BIOGAS,GAS NATURAL MEXICO,COMIMSA,GAS LP,NATURGY GAS,REPSOL GAS,ENDESA GAS,CEPSA GAS,EDP GAS,GAS NATURAL,SUMINISTRO GAS,FACTURA GAS', 'Hogar', 'Gas'),
    ('Agua', 'SACMEX,CONAGUA,SAPA,JAPAC,SIAPA,CEA,SAPAM,AGUAKAN,CAASD,CANAL DE ISABEL II,AGBAR,AIGUES DE BARCELONA,EMASA,EMASAGRA,HIDROGEA,AQUALIA,SEDA BARCELONA,AGUAS DE VALENCIA,FCC AQUALIA,AGUA POTABLE,SUMINISTRO AGUA,AGUA Y SANEAMIENTO,SERVICIO AGUA', 'Hogar', 'Agua'),
    ('Predial / IBI', 'PREDIAL,TESORERIA,TESOFE,CAJA MUNICIPAL,ADMINISTRACION TRIBUTARIA,GOBIERNO MUNICIPAL,IBI,SUMA GESTION TRIBUTARIA,ATIB,HACIENDA LOCAL,CATASTRO,CONTRIBUCION URBANA,IMPUESTO PREDIAL,CONTRIBUCION INMOBILIARIA', 'Hogar', 'Predial / IBI'),
    ('Administración Edificio', 'CONDOMINIO,CUOTA MANTENIMIENTO,ADMINISTRACION CONDOMINAL,CUOTA CONDOMINIAL,COMUNIDAD DE PROPIETARIOS,CUOTA COMUNIDAD,DERRAMA,ADMINISTRADOR FINCAS,ITE,MANTENIMIENTO,ADMINISTRACION EDIFICIO,CUOTA EDIFICIO,HOA,GASTOS COMUNES', 'Hogar', 'Administración'),
    ('Internet y Telefonía', 'IZZI,TELMEX,TOTALPLAY,MEGACABLE,TELECABLE,AXTEL,SKY,DISH,MOVISTAR HOGAR,VODAFONE HOGAR,ORANGE HOGAR,MASMOVIL,LOWI,PEPEPHONE,INTERNET,TELEFONO,CABLE,FIBRA,BANDA ANCHA,LINEA FIJA,SERVICIO INTERNET,BROADBAND', 'Hogar', 'Internet / Teléfono'),

    -- SALUD
    ('Farmacias', 'FARMACIAS DEL AHORRO,FARMACIAS GUADALAJARA,BENAVIDES,SIMILARES,FARMACON,FARMAPRONTO,GI FARMACIAS,DR SIMI,FARMACIA,PHARMACY,DROGUERIA,BOTICA,MEDICAMENTOS,PARAFARMACIA', 'Salud', 'Farmacia / Consultas'),
    ('Consultas Médicas', 'LABORATORIO CHOPO,LABORATORIO DIAGNOSTICO,STAR MEDICA,MEDICA SUR,HOSPITAL ANGELES,HOSPITAL ESPAÑOL,CLINICA LOMAS,QUIRONSALUD,HM HOSPITALES,HOSPITAL JUANEDA,IMQ,VITHAS,CLINICA,HOSPITAL,CONSULTA MEDICA,DOCTOR,MEDICO,LABORATORIO,ANALISIS,RADIOLOGIA,DIAGNOSTICO,DENTAL,DENTISTA,ODONTOLOGIA,OPTICA,OPTOMETRISTA,FISIOTERAPIA', 'Salud', 'Farmacia / Consultas'),
    ('Seguros Médicos', 'GNP SALUD,BUPA MEXICO,METLIFE SALUD,SEGUROS MONTERREY,HMS,INBURSA SALUD,AXA SALUD,MAPFRE SALUD,SANITAS,ADESLAS,DKV,ASISA,CIGNA,SEGURCAIXA ADESLAS,CASER SALUD,SEGURO MEDICO,SEGURO SALUD,PRIMA SALUD,POLIZA SALUD,GASTOS MEDICOS,HEALTH INSURANCE', 'Salud', 'Seguros'),

    -- COMPRAS PERSONALES
    ('Ropa y Accesorios', 'LIVERPOOL,PALACIO DE HIERRO,SUBURBIA,COPPEL ROPA,ANDREA,PRICE SHOES,FLEXI,BATA,MANGO,CORTEFIEL,SPRINGFIELD,EL CORTE INGLES,PRIMARK,STRADIVARIUS,OYSHO,MASSIMO DUTTI,LEFTIES,ZARA,H&M,BERSHKA,PULL&BEAR,FOREVER 21,UNIQLO,GAP,LEVIS,ADIDAS,NIKE,PUMA,REEBOK,NEW BALANCE,VANS,CONVERSE,SKECHERS,TOMMY HILFIGER,CALVIN KLEIN,GUESS', 'Compras personales', 'Ropa y Accesorios'),
    ('Electrónicos y Tecnología', 'BESTBUY,BEST BUY,RADIOSHACK,MIXUP,PCH,CYBERPUERTA,KOMPUTER,FNAC,MEDIAMARKT,WORTEN,PCCOMPONENTES,PHONE HOUSE,APPLE,APPLE STORE,SAMSUNG,HUAWEI,LENOVO,HP,DELL,XIAOMI,SONY,LG,ELECTRONICA', 'Compras personales', 'Electrónicos y Tecnología'),
    ('Bebé y Niños', 'BABIES R US,BABY CREYSI,PABLITOS,COPPEL BEBES,CHICCO MX,MI PEQUEÑO MUNDO,PRENATAL,ZIPPY,KIABI KIDS,TUC TUC,CHICCO,MOTHERCARE,BABYS,BABY,JUGUETES,TOYS R US,IMAGINARIUM', 'Compras personales', 'Bebé y Niños'),
    ('Hogar y Decoración', 'CRATE BARREL,HOME DEPOT,SODIMAC,CASAS IDEAS,EASY HOME,BANAK,TASK,LEROY MERLIN,BRICOMART,AKI,CONFORAMA,BRICO DEPOT,VERDECORA,IKEA,MAISONS DU MONDE,ZARA HOME,DECORACION,MUEBLES,FERRETERIA', 'Compras personales', 'Hogar y Decoración'),
    ('Suscripciones', 'NETFLIX,SPOTIFY,AMAZON PRIME,DISNEY PLUS,DISNEY+,HBO MAX,APPLE ONE,APPLE TV,APPLE ICLOUD,GOOGLE ONE,GOOGLE STORAGE,MICROSOFT 365,OFFICE 365,ADOBE,ADOBE CREATIVE,SLACK,ZOOM,DROPBOX,CHATGPT,OPENAI,CLAUDE,ANTHROPIC,NOTION,FIGMA,GITHUB,YOUTUBE PREMIUM,TWITCH,ONEDRIVE,CANVA,LOOM,GRAMMARLY,DUOLINGO,LINGOKIDS', 'Compras personales', 'Suscripciones'),
    ('Amazon', 'AMAZON,AMZN,AMZ', 'Compras personales', 'Amazon'),
    ('PayPal y Pagos', 'MERCADOPAGO,MERCADO PAGO,CLIP,CONEKTA,OPENPAY,KUESKI PAY,BIZUM,STRIPE,SUMUP,PAYPAL', 'Compras personales', 'PayPal y Pagos'),

    -- HIGIENE PERSONAL
    ('Belleza e Higiene', 'ULTA,BODY SHOP,LIVERPOOL BELLEZA,PALACIO BELLEZA,DOUGLAS,DRUNI,PRIMOR,BODYBELL,IF PERFUMERIES,EQUIVALENZA,SEPHORA,LOREAL,NATURE REPUBLIC,THE BODY SHOP,LUSH,MAC COSMETICS,CLINIQUE,PELUQUERIA,BARBERIA,SALON,ESTETICA,SPA', 'Higiene personal', 'Belleza e Higiene'),

    -- EDUCACIÓN
    ('Cursos y Universidad', 'UNAM,IPN,TECNOLOGICO DE MONTERREY,TEC,IBEROAMERICANA,ANAHUAC,UVM,UAM,PLATZI,UNED,DOMESTIKA,LECTIVA,UDEMY,COURSERA,EDX,LINKEDIN LEARNING,SKILLSHARE,MASTERCLASS,KHAN ACADEMY,COLEGIO,ESCUELA,UNIVERSIDAD,COLEGIATURA,INSCRIPCION,MATRICULA,EDUCACION,CURSO,DIPLOMADO,POSGRADO', 'Educación', 'Colegiaturas / Cursos'),

    -- OCIO Y TIEMPO LIBRE
    ('Deporte y Fitness', 'SPORT CITY,VIDA FIT,OLIMPICA,MULTISPORT,VOIT,BASIC FIT,ANYTIME FITNESS,SPORT ZONE,GO FIT,METROPOLITAN,ATHLETIC CLUB,GYM,GIMNASIO,SMARTFIT,SMART FIT,DECATHLON,INTERSPORT,CROSSFIT,YOGA,PILATES,FITNESS,PADEL,TENIS,NATACION,RUNNING,MARATHON', 'Ocio y tiempo libre', 'Deporte'),
    ('Entretenimiento y Cultura', 'CINEPOLIS,CINEMEX,PALACIO DE LOS DEPORTES,TICKETMASTER,SUPERBOLETOS,BOLETIA,CINESA,YELMO CINES,ODEON,ENTRADAS COM,FEVER,CINE,CINEMA,TEATRO,CONCERT,CONCIERTO,MUSEO,EXPOSICION,EVENTO', 'Ocio y tiempo libre', 'Entretenimiento y Cultura'),
    ('Actividades Hijos', 'KIDZANIA,MUSEO PAPALOTE,SIX FLAGS,PARQUE WARNER,PORTAVENTURA,ISLANTILLA,GUARDERIA,JARDIN DE NIÑOS,KINDER,ACTIVIDADES INFANTILES,CLASES NIÑOS,EXTRAESCOLAR', 'Ocio y tiempo libre', 'Actividades Hijos'),

    -- SERVICIOS
    ('Envíos y Paquetería', 'ESTAFETA,REDPACK,AMPM,CORREOS DE MEXICO,PAQUETE EXPRESS,SENDEX,99MIN,CORREOS,SEUR,MRW,GLS,NACEX,ZELERIS,ENVIALIA,ASM,FEDEX,DHL,UPS,TNT,PAQUETERIA,ENVIO,MENSAJERIA,COURIER,SHIPMENT,SHIPPING', 'Servicios', 'Envíos y Paquetería'),

    -- IMPUESTOS
    ('Impuestos', 'SAT,SERVICIO DE ADMINISTRACION TRIBUTARIA,HACIENDA,ISR,IVA,IMSS,INFONAVIT,ISSSTE,AEAT,AGENCIA TRIBUTARIA,SUMA,ATIB,IRPF,MODELO 303,MODELO 130,IMPUESTO,TRIBUTO,CONTRIBUCION,DECLARACION FISCAL,RECAUDACION', 'Impuestos', 'Impuestos'),

    -- INVERSIONES
    ('Bolsa y Fondos', 'GBM,BURSANET,KUSPIT,BIVA,BMV,CETESDIRECTO,CETES,FIBRA,AFORE,CONSAR,RENTA 4,SELFBANK,OPENBANK INVERSIONES,INDEXA CAPITAL,FINANBEST,MYINVESTOR,DEGIRO,ETORO,TRADING212,INTERACTIVE BROKERS,BROKER,FONDO DE INVERSION,ETF,BOLSA,ACCIONES', 'Inversiones', 'Bolsa y Fondos'),
    ('Afores y Pensiones', 'AFORE,XXI BANORTE,SURA AFORE,COPPEL AFORE,PENSIONISSSTE,PENSIONES IMSS,PLAN DE PENSIONES,EPSV,FONDO DE PENSIONES,MUTUALIDAD,APORTACION VOLUNTARIA,PENSION,JUBILACION,RETIRO,PLAN RETIRO', 'Inversiones', 'Afores y Pensiones'),

    -- TRANSFERENCIAS INTERNAS
    ('Abono Tarjeta de Crédito', 'PAGO TC,PAGO TARJETA,ABONO TARJETA,LIQUIDACION TC,BBVA TC,BANAMEX TC,SANTANDER TC,HSBC TC,INBURSA TC,AMERICAN EXPRESS,AMEX,LIQUIDACION TARJETA,AMORTIZACION TC,CAIXABANK TC,SABADELL TC,BANKINTER TC,ABONO CREDITO,CREDIT CARD PAYMENT,AMEX PAYMENT', 'Transferencias internas', 'Abono tarjeta de crédito'),
    ('Traspaso Cuenta Propia', 'TRANSFERENCIA PROPIA,TRASPASO ENTRE CUENTAS,ENTRE CUENTAS,OWN TRANSFER,INTERNAL TRANSFER', 'Transferencias internas', 'A otra cuenta propia'),

    -- OTROS GASTOS
    ('Préstamos Personales', 'KUESKI,KONFIO,CREDICLUB,AFIRME PERSONAL,PRESTA CLUB,CREDITO FAMILIAR,COPPEL CREDITO,COFIDIS,CETELEM,CARREFOUR PRESTAMO,WIZINK,YOUNITED,PRESTAMO,CREDITO PERSONAL,CREDITO CONSUMO,FINANCIAMIENTO,CUOTA PRESTAMO,LOAN PAYMENT', 'Otros Gastos', 'Préstamos Personales')
  ) AS r(rule_name, keywords, cat_name, subcat_name)
  JOIN categorias cat ON cat.user_id = target_user_id AND cat.categoria = r.cat_name AND cat.subcategoria = r.subcat_name;
END;
$$;

-- 2. Update trigger function to add new categories and call rules helper
CREATE OR REPLACE FUNCTION public.create_sample_data_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'SIN ASIGNAR', 'SIN ASIGNAR', NULL, false);

  INSERT INTO public.profiles (user_id, nombre, apellidos, edad, divisa_preferida)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''), 
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'edad' IS NOT NULL THEN 
        (NEW.raw_user_meta_data->>'edad')::INTEGER 
      ELSE NULL 
    END,
    COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- =============================================
  -- PERMANENT DEFAULT CATEGORIES (is_sample = false)
  -- These stay even after clearing sample data
  -- =============================================

  -- Gastos universales
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'Alimentación', 'Supermercados', 'Gastos', false),
    (NEW.id, 'Alimentación', 'Restaurantes', 'Gastos', false),
    (NEW.id, 'Alimentación', 'Delivery', 'Gastos', false),
    (NEW.id, 'Alimentación', 'Tiendas de Conveniencia', 'Gastos', false),
    (NEW.id, 'Hogar', 'Alquiler / Hipoteca', 'Gastos', false),
    (NEW.id, 'Hogar', 'Electricidad', 'Gastos', false),
    (NEW.id, 'Hogar', 'Agua', 'Gastos', false),
    (NEW.id, 'Hogar', 'Gas', 'Gastos', false),
    (NEW.id, 'Hogar', 'Internet / Teléfono', 'Gastos', false),
    (NEW.id, 'Hogar', 'Administración', 'Gastos', false),
    (NEW.id, 'Hogar', 'Predial / IBI', 'Gastos', false),
    (NEW.id, 'Transporte', 'Gasolina', 'Gastos', false),
    (NEW.id, 'Transporte', 'Casetas y Peajes', 'Gastos', false),
    (NEW.id, 'Transporte', 'Estacionamiento', 'Gastos', false),
    (NEW.id, 'Transporte', 'Movilidad', 'Gastos', false),
    (NEW.id, 'Transporte', 'Seguro de Vehículo', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Suscripciones', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Ropa y Accesorios', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Amazon', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Electrónicos y Tecnología', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Bebé y Niños', 'Gastos', false),
    (NEW.id, 'Compras personales', 'Hogar y Decoración', 'Gastos', false),
    (NEW.id, 'Compras personales', 'PayPal y Pagos', 'Gastos', false),
    (NEW.id, 'Salud', 'Farmacia / Consultas', 'Gastos', false),
    (NEW.id, 'Salud', 'Seguros', 'Gastos', false),
    (NEW.id, 'Higiene personal', 'Belleza e Higiene', 'Gastos', false),
    (NEW.id, 'Educación', 'Colegiaturas / Cursos', 'Gastos', false),
    (NEW.id, 'Ocio y tiempo libre', 'Viajes', 'Gastos', false),
    (NEW.id, 'Ocio y tiempo libre', 'Deporte', 'Gastos', false),
    (NEW.id, 'Ocio y tiempo libre', 'Entretenimiento y Cultura', 'Gastos', false),
    (NEW.id, 'Ocio y tiempo libre', 'Actividades Hijos', 'Gastos', false),
    (NEW.id, 'Servicios', 'Envíos y Paquetería', 'Gastos', false),
    (NEW.id, 'Impuestos', 'Impuestos', 'Gastos', false),
    (NEW.id, 'Otros Gastos', 'Préstamos Personales', 'Gastos', false);

  -- Ingresos
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'Nómina', 'Salario', 'Ingreso', false),
    (NEW.id, 'Ingresos adicionales', 'Otros ingresos', 'Ingreso', false);

  -- Aportación / Retiro (transferencias internas)
  INSERT INTO public.categorias (user_id, categoria, subcategoria, tipo, is_sample) VALUES
    (NEW.id, 'Transferencias internas', 'Pago tarjeta de crédito', 'Retiro', false),
    (NEW.id, 'Transferencias internas', 'Abono tarjeta de crédito', 'Aportación', false),
    (NEW.id, 'Transferencias internas', 'A otra cuenta propia', 'Aportación', false),
    (NEW.id, 'Inversiones', 'Aportación ahorro', 'Aportación', false),
    (NEW.id, 'Inversiones', 'Bolsa y Fondos', 'Aportación', false),
    (NEW.id, 'Inversiones', 'Afores y Pensiones', 'Aportación', false);

  -- =============================================
  -- DEFAULT CLASSIFICATION RULES (permanent, user can modify)
  -- =============================================
  PERFORM public.create_default_classification_rules(NEW.id);

  -- =============================================
  -- SAMPLE ACCOUNTS (is_sample = true, cleared with sample data)
  -- =============================================
  INSERT INTO public.cuentas (user_id, nombre, tipo, saldo_inicial, divisa, is_sample) VALUES
    (NEW.id, 'Cuenta Principal', 'Banco', 10000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Efectivo', 'Efectivo', 2000, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true),
    (NEW.id, 'Tarjeta de Crédito', 'Tarjeta de Crédito', 0, COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), true);

  -- =============================================
  -- SAMPLE TRANSACTIONS (cleared with sample data)
  -- =============================================
  WITH sample_accounts AS (
    SELECT id, nombre FROM public.cuentas WHERE user_id = NEW.id AND is_sample = true
  ),
  sample_categories AS (
    SELECT id, categoria, subcategoria FROM public.categorias WHERE user_id = NEW.id
  )
  INSERT INTO public.transacciones (user_id, cuenta_id, subcategoria_id, fecha, ingreso, gasto, comentario, divisa, csv_id)
  SELECT 
    NEW.id, sa.id, sc.id, fecha, ingreso, gasto, comentario,
    COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN'), 'SAMPLE_DATA'
  FROM (
    VALUES 
      ('Cuenta Principal', 'Nómina', 'Salario', CURRENT_DATE - INTERVAL '25 days', 32000, 0, 'Salario mensual'),
      ('Cuenta Principal', 'Alimentación', 'Supermercados', CURRENT_DATE - INTERVAL '24 days', 0, 4500, 'Compras supermercado'),
      ('Cuenta Principal', 'Transporte', 'Gasolina', CURRENT_DATE - INTERVAL '23 days', 0, 2800, 'Gasolina'),
      ('Efectivo', 'Ingresos adicionales', 'Otros ingresos', CURRENT_DATE - INTERVAL '21 days', 5000, 0, 'Ingreso adicional'),
      ('Tarjeta de Crédito', 'Alimentación', 'Restaurantes', CURRENT_DATE - INTERVAL '20 days', 0, 1200, 'Cena restaurante'),
      ('Efectivo', 'Salud', 'Farmacia / Consultas', CURRENT_DATE - INTERVAL '14 days', 0, 800, 'Farmacia'),
      ('Cuenta Principal', 'Alimentación', 'Supermercados', CURRENT_DATE - INTERVAL '10 days', 0, 3200, 'Supermercado semanal'),
      ('Tarjeta de Crédito', 'Compras personales', 'Suscripciones', CURRENT_DATE - INTERVAL '8 days', 0, 350, 'Netflix + Spotify'),
      ('Cuenta Principal', 'Hogar', 'Electricidad', CURRENT_DATE - INTERVAL '6 days', 0, 950, 'Recibo de luz'),
      ('Tarjeta de Crédito', 'Alimentación', 'Delivery', CURRENT_DATE - INTERVAL '4 days', 0, 450, 'Uber Eats'),
      ('Cuenta Principal', 'Transporte', 'Movilidad', CURRENT_DATE - INTERVAL '2 days', 0, 280, 'Uber'),
      ('Cuenta Principal', 'Ocio y tiempo libre', 'Deporte', CURRENT_DATE - INTERVAL '1 day', 0, 600, 'Mensualidad gym')
  ) AS sample_data(cuenta_nombre, categoria_nombre, subcategoria_nombre, fecha, ingreso, gasto, comentario)
  JOIN sample_accounts sa ON sa.nombre = sample_data.cuenta_nombre
  JOIN sample_categories sc ON sc.categoria = sample_data.categoria_nombre AND sc.subcategoria = sample_data.subcategoria_nombre;

  RETURN NEW;
END;
$function$;
