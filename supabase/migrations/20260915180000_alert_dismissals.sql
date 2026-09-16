-- Descartes de alertas (página Alertas). Una fila por ocurrencia descartada;
-- la clave la genera el cliente (src/lib/finance/alerts.ts) y es estable.
CREATE TABLE public.alert_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, alert_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_dismissals TO authenticated;
GRANT ALL ON public.alert_dismissals TO service_role;

ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own alert dismissals"
  ON public.alert_dismissals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
