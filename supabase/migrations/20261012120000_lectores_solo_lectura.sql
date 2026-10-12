-- Acceso de solo lectura: un «lector» ve en la app iOS los datos de un titular.
-- Solo añade políticas SELECT. Las de INSERT/UPDATE/DELETE no cambian: siguen siendo «auth.uid() = user_id»,
-- así que un lector nunca puede escribir en los datos del titular, aunque la app fallara.
-- Los accesos solo se dan o quitan desde el editor SQL (no hay políticas de escritura en lectores).

create table if not exists public.lectores (
  propietario_id uuid not null references auth.users (id) on delete cascade,
  lector_id      uuid not null references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (propietario_id, lector_id),
  check (propietario_id <> lector_id)
);

alter table public.lectores enable row level security;
revoke all on public.lectores from anon;

-- Cada uno ve los accesos en los que participa (la app pregunta «¿soy lector de alguien?»).
create policy "Ver mis accesos de lectura" on public.lectores
  for select to authenticated
  using ((select auth.uid()) = lector_id or (select auth.uid()) = propietario_id);

-- Lectura para lectores en las tablas que usa la app. Las vistas saldos_cuentas y
-- patrimonio_por_divisa son security_invoker, así que heredan estas políticas.
create policy "Lectores: solo lectura" on public.cuentas for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = cuentas.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.transacciones for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = transacciones.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.categorias for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = categorias.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.transaction_pendings for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = transaction_pendings.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.subscription_services for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = subscription_services.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.inversiones for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = inversiones.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.investment_valuations for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = investment_valuations.user_id and l.lector_id = (select auth.uid())));
