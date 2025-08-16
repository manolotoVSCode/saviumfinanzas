-- 1) Add canon_key to subscription_services (without unique constraint first)
ALTER TABLE public.subscription_services
  ADD COLUMN IF NOT EXISTS canon_key text;

-- 2) Backfill canon_key for existing rows using a deterministic normalization
UPDATE public.subscription_services
SET canon_key = (
  regexp_replace(lower(coalesce(original_comments[1], service_name)), '[^a-z]', '', 'g')
)::text || '|' ||
(to_char(ultimo_pago_fecha, 'DD')) || '|' ||
(round(ultimo_pago_monto))::text
WHERE canon_key IS NULL;

-- 3) Clean up duplicates by keeping the most recent one per user_id + canon_key
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    canon_key,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, canon_key 
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM public.subscription_services
  WHERE canon_key IS NOT NULL
)
DELETE FROM public.subscription_services
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 4) Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS subscription_services_user_canon_key_unique
  ON public.subscription_services (user_id, canon_key)
  WHERE canon_key IS NOT NULL;