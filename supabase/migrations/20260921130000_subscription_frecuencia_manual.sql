-- Distingue la frecuencia editada por el usuario de la detectada automáticamente,
-- para poder volver a detectar sin pisar ediciones manuales.
ALTER TABLE public.subscription_services
  ADD COLUMN IF NOT EXISTS frecuencia_manual boolean NOT NULL DEFAULT false;

-- Conservador: lo que ya estaba guardado con una frecuencia concreta se respeta;
-- solo las 'Irregular' (nunca elegidas a propósito) se vuelven a detectar.
UPDATE public.subscription_services
   SET frecuencia_manual = (frecuencia <> 'Irregular');
