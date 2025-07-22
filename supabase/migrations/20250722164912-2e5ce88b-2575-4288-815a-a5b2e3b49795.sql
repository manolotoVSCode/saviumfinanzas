-- Crear tabla de inversiones
CREATE TABLE public.inversiones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Interés fijo', 'Fondo variable', 'Criptomoneda')),
  monto_invertido NUMERIC NOT NULL DEFAULT 0,
  rendimiento_bruto NUMERIC DEFAULT NULL, -- Solo para Interés fijo
  rendimiento_neto NUMERIC DEFAULT NULL, -- Solo para Interés fijo  
  valor_actual NUMERIC NOT NULL DEFAULT 0,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('Reinversión', 'Pago mensual', 'Pago trimestral')),
  moneda TEXT NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD', 'EUR')),
  fecha_inicio DATE NOT NULL,
  ultimo_pago DATE DEFAULT NULL, -- Solo para modalidades de pago
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.inversiones ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Users can view their own investments" 
ON public.inversiones 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments" 
ON public.inversiones 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" 
ON public.inversiones 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments" 
ON public.inversiones 
FOR DELETE 
USING (auth.uid() = user_id);

-- Crear trigger para updated_at
CREATE TRIGGER update_inversiones_updated_at
BEFORE UPDATE ON public.inversiones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();