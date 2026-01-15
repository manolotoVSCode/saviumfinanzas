-- =============================================
-- SISTEMA CONTABLE CHP - MIGRACIÓN COMPLETA
-- =============================================

-- 1. CATÁLOGO DE CUENTAS SAT
CREATE TABLE public.sat_cuentas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('Activo', 'Pasivo', 'Capital', 'Ingreso', 'Gasto', 'Costo')),
  naturaleza text NOT NULL CHECK (naturaleza IN ('Deudora', 'Acreedora')),
  nivel integer NOT NULL DEFAULT 1,
  cuenta_padre text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insertar catálogo SAT básico para CHP
INSERT INTO public.sat_cuentas (codigo, nombre, tipo, naturaleza, nivel) VALUES
  -- Activos
  ('115', 'Inventarios', 'Activo', 'Deudora', 1),
  ('115.01', 'Inventario de Refacciones', 'Activo', 'Deudora', 2),
  -- Ingresos
  ('401', 'Ingresos', 'Ingreso', 'Acreedora', 1),
  ('401.01', 'Ingresos por ventas y servicios', 'Ingreso', 'Acreedora', 2),
  -- Costos
  ('501', 'Costo de Ventas', 'Costo', 'Deudora', 1),
  ('501.01', 'Costo de ventas - Refacciones', 'Costo', 'Deudora', 2),
  -- Gastos
  ('601', 'Gastos de Operación', 'Gasto', 'Deudora', 1),
  ('601.01', 'Sueldos y salarios', 'Gasto', 'Deudora', 2),
  ('601.03', 'Arrendamiento de inmuebles', 'Gasto', 'Deudora', 2),
  ('601.10', 'Combustibles y lubricantes', 'Gasto', 'Deudora', 2),
  ('601.12', 'Seguros y fianzas', 'Gasto', 'Deudora', 2),
  ('601.32', 'Cuotas y suscripciones', 'Gasto', 'Deudora', 2),
  ('601.50', 'Viáticos y gastos de viaje', 'Gasto', 'Deudora', 2),
  ('601.52', 'Fletes y acarreos', 'Gasto', 'Deudora', 2),
  ('601.81', 'Otros gastos generales', 'Gasto', 'Deudora', 2),
  ('601.83', 'Gastos de mantenimiento', 'Gasto', 'Deudora', 2);

-- 2. TABLA DE PROYECTOS
CREATE TABLE public.proyectos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('Motor CHP', 'Mantenimiento', 'Refacciones', 'Servicio Correctivo', 'Otro')),
  estatus text NOT NULL DEFAULT 'cotizado' CHECK (estatus IN ('cotizado', 'aprobado', 'en_proceso', 'completado', 'facturado', 'cancelado')),
  presupuesto numeric DEFAULT 0,
  fecha_inicio date,
  fecha_fin date,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para proyectos
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON public.proyectos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.proyectos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.proyectos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.proyectos FOR DELETE
  USING (auth.uid() = user_id);

-- 3. TABLA DE INVENTARIO
CREATE TABLE public.inventario (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  codigo_parte text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  cantidad numeric NOT NULL DEFAULT 0,
  costo_promedio numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'PZA',
  ubicacion text,
  minimo_stock numeric DEFAULT 0,
  sat_cuenta text NOT NULL DEFAULT '115.01',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, codigo_parte)
);

-- RLS para inventario
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory"
  ON public.inventario FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory"
  ON public.inventario FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON public.inventario FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON public.inventario FOR DELETE
  USING (auth.uid() = user_id);

-- 4. MOVIMIENTOS DE INVENTARIO
CREATE TABLE public.movimientos_inventario (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  inventario_id uuid NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  factura_id uuid REFERENCES public.facturas(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad numeric NOT NULL,
  costo_unitario numeric NOT NULL DEFAULT 0,
  costo_total numeric NOT NULL DEFAULT 0,
  cuenta_cargo text,
  cuenta_abono text,
  referencia text,
  notas text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para movimientos
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory movements"
  ON public.movimientos_inventario FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory movements"
  ON public.movimientos_inventario FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory movements"
  ON public.movimientos_inventario FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory movements"
  ON public.movimientos_inventario FOR DELETE
  USING (auth.uid() = user_id);

-- 5. AGREGAR proyecto_id A TRANSACCIONES
ALTER TABLE public.transacciones 
ADD COLUMN IF NOT EXISTS proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL;

-- 6. AGREGAR proyecto_id A FACTURAS
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL;

-- 7. AGREGAR sat_codigo A CATEGORÍAS
ALTER TABLE public.categorias 
ADD COLUMN IF NOT EXISTS sat_codigo text,
ADD COLUMN IF NOT EXISTS es_costo_directo boolean NOT NULL DEFAULT false;

-- 8. FUNCIÓN PARA ACTUALIZAR INVENTARIO AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.actualizar_inventario_en_movimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'entrada' THEN
      UPDATE public.inventario 
      SET cantidad = cantidad + NEW.cantidad,
          costo_promedio = CASE 
            WHEN cantidad + NEW.cantidad > 0 
            THEN ((cantidad * costo_promedio) + (NEW.cantidad * NEW.costo_unitario)) / (cantidad + NEW.cantidad)
            ELSE NEW.costo_unitario
          END,
          updated_at = now()
      WHERE id = NEW.inventario_id;
    ELSIF NEW.tipo = 'salida' THEN
      UPDATE public.inventario 
      SET cantidad = cantidad - NEW.cantidad,
          updated_at = now()
      WHERE id = NEW.inventario_id;
    ELSIF NEW.tipo = 'ajuste' THEN
      UPDATE public.inventario 
      SET cantidad = cantidad + NEW.cantidad,
          updated_at = now()
      WHERE id = NEW.inventario_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.tipo = 'entrada' THEN
      UPDATE public.inventario 
      SET cantidad = cantidad - OLD.cantidad,
          updated_at = now()
      WHERE id = OLD.inventario_id;
    ELSIF OLD.tipo = 'salida' THEN
      UPDATE public.inventario 
      SET cantidad = cantidad + OLD.cantidad,
          updated_at = now()
      WHERE id = OLD.inventario_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_actualizar_inventario
AFTER INSERT OR DELETE ON public.movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION public.actualizar_inventario_en_movimiento();

-- 9. VISTA DE RENTABILIDAD POR PROYECTO
CREATE OR REPLACE VIEW public.rentabilidad_proyectos AS
SELECT 
  p.id,
  p.user_id,
  p.codigo,
  p.nombre,
  p.tipo,
  p.estatus,
  c.nombre as cliente_nombre,
  p.fecha_inicio,
  p.fecha_fin,
  COALESCE(ingresos.total, 0) as ingresos_total,
  COALESCE(gastos.total, 0) as gastos_directos,
  COALESCE(inventario.total, 0) as costo_inventario,
  COALESCE(ingresos.total, 0) - COALESCE(gastos.total, 0) - COALESCE(inventario.total, 0) as utilidad_bruta,
  CASE 
    WHEN COALESCE(ingresos.total, 0) > 0 
    THEN ROUND(((COALESCE(ingresos.total, 0) - COALESCE(gastos.total, 0) - COALESCE(inventario.total, 0)) / COALESCE(ingresos.total, 0) * 100)::numeric, 2)
    ELSE 0 
  END as margen_porcentaje
FROM public.proyectos p
LEFT JOIN public.clientes c ON p.cliente_id = c.id
LEFT JOIN (
  SELECT proyecto_id, SUM(total) as total
  FROM public.facturas
  WHERE tipo = 'emitida' AND estatus != 'cancelada'
  GROUP BY proyecto_id
) ingresos ON p.id = ingresos.proyecto_id
LEFT JOIN (
  SELECT proyecto_id, SUM(gasto) as total
  FROM public.transacciones
  WHERE proyecto_id IS NOT NULL
  GROUP BY proyecto_id
) gastos ON p.id = gastos.proyecto_id
LEFT JOIN (
  SELECT proyecto_id, SUM(costo_total) as total
  FROM public.movimientos_inventario
  WHERE tipo = 'salida' AND proyecto_id IS NOT NULL
  GROUP BY proyecto_id
) inventario ON p.id = inventario.proyecto_id;

-- 10. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_transacciones_proyecto ON public.transacciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_facturas_proyecto ON public.facturas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_proyecto ON public.movimientos_inventario(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_cliente ON public.proyectos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_estatus ON public.proyectos(estatus);