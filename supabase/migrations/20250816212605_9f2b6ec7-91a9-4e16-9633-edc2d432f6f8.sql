-- 1) Add canon_key to subscription_services and backfill a stable key
ALTER TABLE public.subscription_services
  ADD COLUMN IF NOT EXISTS canon_key text;

-- 2) Backfill canon_key for existing rows using a deterministic normalization
-- vendor: first original_comment if present else service_name; letters only, lowercased (max 20 chars)
-- day: day of ultimo_pago_fecha
-- amount: rounded ultimo_pago_monto
UPDATE public.subscription_services
SET canon_key = (
  regexp_replace(lower(coalesce(original_comments[1], service_name)), '[^a-z]', '', 'g')
)::text || '|' ||
(to_char(ultimo_pago_fecha, 'DD')) || '|' ||
(round(ultimo_pago_monto))::text
WHERE canon_key IS NULL;

-- 3) Ensure uniqueness per user and canon_key (only when canon_key is not null)
CREATE UNIQUE INDEX IF NOT EXISTS subscription_services_user_canon_key_unique
  ON public.subscription_services (user_id, canon_key)
  WHERE canon_key IS NOT NULL;