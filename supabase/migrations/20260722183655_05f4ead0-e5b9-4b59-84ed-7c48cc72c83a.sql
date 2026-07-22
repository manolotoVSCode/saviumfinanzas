
CREATE TABLE public.payment_skips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  razon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, categoria_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_skips TO authenticated;
GRANT ALL ON public.payment_skips TO service_role;

ALTER TABLE public.payment_skips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own payment skips"
  ON public.payment_skips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_payment_skips_updated_at
  BEFORE UPDATE ON public.payment_skips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
