-- Create subscription services table to store detected subscriptions
CREATE TABLE public.subscription_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  tipo_servicio TEXT NOT NULL,
  ultimo_pago_monto NUMERIC NOT NULL,
  ultimo_pago_fecha DATE NOT NULL,
  frecuencia TEXT NOT NULL CHECK (frecuencia IN ('Mensual', 'Anual', 'Irregular')),
  proximo_pago DATE NOT NULL,
  numero_pagos INTEGER NOT NULL DEFAULT 1,
  original_comments TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- Enable RLS
ALTER TABLE public.subscription_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscription services" 
ON public.subscription_services 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription services" 
ON public.subscription_services 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription services" 
ON public.subscription_services 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription services" 
ON public.subscription_services 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscription_services_updated_at
BEFORE UPDATE ON public.subscription_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();