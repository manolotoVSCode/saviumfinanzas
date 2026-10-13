-- Configuración web de la alerta de emergencia (Configuración → Contactos de emergencia):
-- 1) correos extra que reciben el correo de la alerta (además de los lectores, que siempre lo reciben);
-- 2) el usuario puede poner, cambiar o quitar su código de coacción desde la web (el navegador manda solo el hash).

create table if not exists public.contactos_alerta (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nombre     text,
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

alter table public.contactos_alerta enable row level security;
revoke all on public.contactos_alerta from anon;

create policy "Mis contactos de alerta: ver" on public.contactos_alerta for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Mis contactos de alerta: alta" on public.contactos_alerta for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Mis contactos de alerta: cambio" on public.contactos_alerta for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Mis contactos de alerta: baja" on public.contactos_alerta for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Código de coacción: además de leerlo, cada uno puede poner, cambiar o quitar el suyo.
create policy "Mi código de emergencia: alta" on public.codigos_emergencia for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Mi código de emergencia: cambio" on public.codigos_emergencia for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Mi código de emergencia: baja" on public.codigos_emergencia for delete to authenticated
  using ((select auth.uid()) = user_id);
