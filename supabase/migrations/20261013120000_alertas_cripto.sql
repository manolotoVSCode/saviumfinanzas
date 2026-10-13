-- Alerta por criptomoneda (web 8.8 y app iOS): avisar cuando la posición de un símbolo
-- (todas sus compras juntas) sube o baja un % respecto al precio de compra.
-- La alerta la calcula cada cliente (src/lib/finance/alerts.ts y SaviumCore/AlertasCripto.swift);
-- su descarte va a alert_dismissals como las demás.

create table if not exists public.alertas_cripto (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  simbolo    text not null,
  sube_pct   numeric check (sube_pct > 0),
  baja_pct   numeric check (baja_pct > 0 and baja_pct < 100),
  created_at timestamptz not null default now(),
  unique (user_id, simbolo),
  check (sube_pct is not null or baja_pct is not null)
);

alter table public.alertas_cripto enable row level security;
revoke all on public.alertas_cripto from anon;
grant select, insert, update, delete on public.alertas_cripto to authenticated;

create policy "Mis alertas cripto: ver" on public.alertas_cripto for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Mis alertas cripto: alta" on public.alertas_cripto for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Mis alertas cripto: cambio" on public.alertas_cripto for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Mis alertas cripto: baja" on public.alertas_cripto for delete to authenticated
  using ((select auth.uid()) = user_id);
