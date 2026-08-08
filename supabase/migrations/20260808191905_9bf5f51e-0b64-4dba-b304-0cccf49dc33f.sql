
-- 1) Catálogo de tipos de inversión por usuario
CREATE TABLE public.investment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  comportamiento text NOT NULL DEFAULT 'valuacion_manual',
  permite_reinversion boolean NOT NULL DEFAULT false,
  requiere_vencimiento boolean NOT NULL DEFAULT false,
  color text,
  orden integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nombre)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_types TO authenticated;
GRANT ALL ON public.investment_types TO service_role;
ALTER TABLE public.investment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own investment types"
  ON public.investment_types FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_investment_types_updated_at
  BEFORE UPDATE ON public.investment_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Ampliar inversiones
ALTER TABLE public.inversiones
  ADD COLUMN IF NOT EXISTS tipo_id uuid REFERENCES public.investment_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modalidad_pago text,
  ADD COLUMN IF NOT EXISTS tasa_anual numeric,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS cuenta_id uuid REFERENCES public.cuentas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS beneficio_estimado numeric,
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT true;

-- 3) Valuaciones periódicas (RL360 y similares)
CREATE TABLE public.investment_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inversion_id uuid NOT NULL REFERENCES public.inversiones(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  aportacion numeric NOT NULL DEFAULT 0,
  retiro numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inversion_id, fecha)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_valuations TO authenticated;
GRANT ALL ON public.investment_valuations TO service_role;
ALTER TABLE public.investment_valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own investment valuations"
  ON public.investment_valuations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_investment_valuations_updated_at
  BEFORE UPDATE ON public.investment_valuations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Cobros / rendimientos pagados
CREATE TABLE public.investment_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inversion_id uuid NOT NULL REFERENCES public.inversiones(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  divisa text NOT NULL DEFAULT 'MXN',
  reinvertido boolean NOT NULL DEFAULT false,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_payouts TO authenticated;
GRANT ALL ON public.investment_payouts TO service_role;
ALTER TABLE public.investment_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own investment payouts"
  ON public.investment_payouts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_investment_payouts_updated_at
  BEFORE UPDATE ON public.investment_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_inv_val_inv ON public.investment_valuations(inversion_id, fecha DESC);
CREATE INDEX idx_inv_pay_inv ON public.investment_payouts(inversion_id, fecha DESC);
CREATE INDEX idx_inversiones_tipo ON public.inversiones(tipo_id);

-- 5) Tipos por defecto
CREATE OR REPLACE FUNCTION public.create_default_investment_types(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.investment_types (user_id, nombre, comportamiento, permite_reinversion, requiere_vencimiento, orden)
  VALUES
    (target_user_id, 'Valor de mercado (actualización manual)', 'valuacion_manual', false, false, 1),
    (target_user_id, 'Interés fijo · Reinversión', 'interes_fijo', true, false, 2),
    (target_user_id, 'Interés fijo · Cobro mensual', 'interes_fijo', false, false, 3),
    (target_user_id, 'Participación / Fideicomiso a plazo', 'reparto_variable', false, true, 4),
    (target_user_id, 'Bien raíz', 'valuacion_manual', false, false, 5),
    (target_user_id, 'Criptomoneda', 'valuacion_manual', false, false, 6)
  ON CONFLICT (user_id, nombre) DO NOTHING;
END;
$function$;

-- Sembrar para usuarios existentes
DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT user_id FROM public.profiles LOOP
    PERFORM public.create_default_investment_types(u.user_id);
  END LOOP;
END $$;
