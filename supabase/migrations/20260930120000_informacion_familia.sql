-- Información para la familia ("Para mi familia"): un documento JSONB por usuario.
-- updated_at lo mantiene el trigger (DEFAULT solo actúa al insertar) y sirve de
-- control de concurrencia: el cliente actualiza con .eq('updated_at', leído).
CREATE TABLE public.informacion_familia (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
  revisado_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.informacion_familia TO authenticated;
GRANT ALL ON public.informacion_familia TO service_role;

ALTER TABLE public.informacion_familia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own family info"
  ON public.informacion_familia FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_informacion_familia_updated_at
  BEFORE UPDATE ON public.informacion_familia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
