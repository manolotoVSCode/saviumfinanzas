-- Alerta de emergencia: tokens de notificación por usuario y registro de alertas enviadas.

-- Token APNs de cada iPhone. Cada usuario gestiona solo los suyos.
create table if not exists public.dispositivos (
  token        text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  entorno      text not null check (entorno in ('desarrollo', 'produccion')),
  actualizado  timestamptz not null default now()
);
create index if not exists dispositivos_user_id on public.dispositivos (user_id);

alter table public.dispositivos enable row level security;
revoke all on public.dispositivos from anon;

create policy "Mis dispositivos: ver" on public.dispositivos for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Mis dispositivos: alta" on public.dispositivos for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Mis dispositivos: cambio" on public.dispositivos for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Mis dispositivos: baja" on public.dispositivos for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Registro de alertas. Sin políticas: la app no puede leerlo ni escribirlo; solo la Edge Function
-- (service role). Así no hay historial que encontrar en el iPhone del titular.
create table if not exists public.alertas_emergencia (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  id_cliente     text not null,
  creada         timestamptz not null default now(),
  latitud        double precision,
  longitud       double precision,
  precision_m    double precision,
  notificaciones int not null default 0,
  correo         text,
  unique (user_id, id_cliente)
);

alter table public.alertas_emergencia enable row level security;
revoke all on public.alertas_emergencia from anon, authenticated;
