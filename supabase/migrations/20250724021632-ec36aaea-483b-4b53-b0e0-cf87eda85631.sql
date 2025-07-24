-- Crear tabla para criptomonedas
CREATE TABLE public.criptomonedas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Información de la criptomoneda
  simbolo TEXT NOT NULL, -- 'BTC', 'ETH', 'SHIB'
  nombre TEXT NOT NULL, -- 'Bitcoin', 'Ethereum', 'Shiba Inu'
  
  -- Información de la compra
  cantidad NUMERIC NOT NULL DEFAULT 0,
  precio_compra_usd NUMERIC NOT NULL DEFAULT 0, -- precio al que se compró en USD
  fecha_compra DATE NOT NULL,
  
  -- Metadatos
  notas TEXT,
  
  CONSTRAINT criptomonedas_cantidad_check CHECK (cantidad >= 0),
  CONSTRAINT criptomonedas_precio_compra_check CHECK (precio_compra_usd >= 0)
);

-- Enable Row Level Security
ALTER TABLE public.criptomonedas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own cryptos" 
ON public.criptomonedas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cryptos" 
ON public.criptomonedas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cryptos" 
ON public.criptomonedas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cryptos" 
ON public.criptomonedas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_criptomonedas_updated_at
BEFORE UPDATE ON public.criptomonedas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();