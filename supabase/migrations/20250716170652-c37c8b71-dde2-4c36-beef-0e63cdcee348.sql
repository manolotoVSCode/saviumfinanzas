-- Crear tabla de categorías
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subcategoria TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Ingreso', 'Gastos', 'Aportación', 'Retiro')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de cuentas
CREATE TABLE public.cuentas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia')),
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
  divisa TEXT NOT NULL CHECK (divisa IN ('MXN', 'USD', 'EUR')) DEFAULT 'MXN',
  valor_mercado DECIMAL(15,2),
  rendimiento_mensual DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de transacciones
CREATE TABLE public.transacciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cuenta_id UUID NOT NULL REFERENCES public.cuentas(id) ON DELETE CASCADE,
  subcategoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  comentario TEXT NOT NULL,
  ingreso DECIMAL(15,2) NOT NULL DEFAULT 0,
  gasto DECIMAL(15,2) NOT NULL DEFAULT 0,
  divisa TEXT NOT NULL CHECK (divisa IN ('MXN', 'USD', 'EUR')) DEFAULT 'MXN',
  csv_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;

-- Políticas para categorías
CREATE POLICY "Users can view their own categories" 
ON public.categorias FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categorias FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categorias FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categorias FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para cuentas
CREATE POLICY "Users can view their own accounts" 
ON public.cuentas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts" 
ON public.cuentas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.cuentas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.cuentas FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para transacciones
CREATE POLICY "Users can view their own transactions" 
ON public.transacciones FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.transacciones FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transacciones FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transacciones FOR DELETE 
USING (auth.uid() = user_id);

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para timestamps automáticos
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cuentas_updated_at
  BEFORE UPDATE ON public.cuentas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transacciones_updated_at
  BEFORE UPDATE ON public.transacciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar performance
CREATE INDEX idx_categorias_user_id ON public.categorias(user_id);
CREATE INDEX idx_cuentas_user_id ON public.cuentas(user_id);
CREATE INDEX idx_transacciones_user_id ON public.transacciones(user_id);
CREATE INDEX idx_transacciones_cuenta_id ON public.transacciones(cuenta_id);
CREATE INDEX idx_transacciones_fecha ON public.transacciones(fecha);
CREATE INDEX idx_transacciones_subcategoria_id ON public.transacciones(subcategoria_id);