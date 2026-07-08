
CREATE TYPE public.pending_tipo AS ENUM ('reembolso_gasto', 'ingreso_esperado');
CREATE TYPE public.pending_estado AS ENUM ('pendiente', 'cobrado_parcial', 'cobrado', 'cancelado');

CREATE TABLE public.transaction_pendings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaccion_id UUID REFERENCES public.transacciones(id) ON DELETE SET NULL,
  transaccion_cobro_id UUID REFERENCES public.transacciones(id) ON DELETE SET NULL,
  tipo public.pending_tipo NOT NULL,
  monto_esperado NUMERIC NOT NULL,
  monto_cobrado NUMERIC NOT NULL DEFAULT 0,
  divisa TEXT NOT NULL DEFAULT 'MXN',
  fecha_esperada DATE,
  fecha_cobro DATE,
  estado public.pending_estado NOT NULL DEFAULT 'pendiente',
  concepto TEXT NOT NULL,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_pendings_user ON public.transaction_pendings(user_id);
CREATE INDEX idx_transaction_pendings_estado ON public.transaction_pendings(user_id, estado);
CREATE INDEX idx_transaction_pendings_transaccion ON public.transaction_pendings(transaccion_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_pendings TO authenticated;
GRANT ALL ON public.transaction_pendings TO service_role;

ALTER TABLE public.transaction_pendings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pendings"
  ON public.transaction_pendings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pendings"
  ON public.transaction_pendings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pendings"
  ON public.transaction_pendings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pendings"
  ON public.transaction_pendings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_transaction_pendings_updated_at
  BEFORE UPDATE ON public.transaction_pendings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
