-- Provisiones manuales en CxP (web 9.2): pagos que el usuario aparta de antemano.
-- Solo cuentan en «Total CxP» y en el colchón; no son movimientos, así que no tocan
-- ningún saldo. El pago real llega con la importación y la provisión se marca a mano
-- como pagada (igual que los cobros en CxC). Una recurrente, al pagarla, avanza `fecha`
-- al siguiente periodo en vez de cerrarse.

create table if not exists public.provisiones_cxp (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  concepto    text not null,
  monto       numeric not null check (monto > 0),
  divisa      text not null default 'MXN',
  -- próximo pago previsto
  fecha       date not null,
  frecuencia  text not null default 'unica'
              check (frecuencia in ('unica', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual')),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'cancelado')),
  -- último pago marcado
  fecha_pago  date,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_provisiones_cxp_user on public.provisiones_cxp (user_id);

alter table public.provisiones_cxp enable row level security;
revoke all on public.provisiones_cxp from anon;
grant select, insert, update, delete on public.provisiones_cxp to authenticated;

create policy "Mis provisiones: ver" on public.provisiones_cxp for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Mis provisiones: alta" on public.provisiones_cxp for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Mis provisiones: cambio" on public.provisiones_cxp for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Mis provisiones: baja" on public.provisiones_cxp for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger update_provisiones_cxp_updated_at
  before update on public.provisiones_cxp
  for each row execute function public.update_updated_at_column();
