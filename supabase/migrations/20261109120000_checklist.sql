-- Checklist: tareas propias del titular (p. ej. "actualizar la transacción X"), con fecha
-- opcional y, si se quiere, ligadas a una transacción. Si pasa la fecha sin completarse,
-- la web la muestra en Alertas (src/lib/finance/checklist.ts).
-- Personal: sin política para lectores.
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto TEXT NOT NULL CHECK (length(btrim(texto)) > 0),
  fecha DATE,
  transaccion_id UUID REFERENCES public.transacciones(id) ON DELETE SET NULL,
  completada BOOLEAN NOT NULL DEFAULT false,
  completada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_items_user ON public.checklist_items(user_id);
CREATE INDEX idx_checklist_items_transaccion ON public.checklist_items(transaccion_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT ALL ON public.checklist_items TO service_role;

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own checklist"
  ON public.checklist_items FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
