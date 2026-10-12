-- Alerta de emergencia, segunda parte: repetir la notificación cada minuto (hasta 10) mientras el lector
-- no la vea, y que la app del lector pueda leer la alerta (pantalla con mapa y «Llamar») y marcarla vista.
-- El titular sigue sin poder leer nada de esta tabla.

alter table public.alertas_emergencia
  add column if not exists nombre            text,
  add column if not exists mensaje           text,
  add column if not exists telefono          text,
  add column if not exists vista_en          timestamptz,
  add column if not exists repeticiones      int not null default 0,
  add column if not exists ultima_repeticion timestamptz;

-- Lector: solo estas columnas, solo alertas de su titular de las últimas 24 h, y solo puede marcar «vista».
grant select (id, creada, nombre, mensaje, telefono, latitud, longitud, precision_m, vista_en)
  on public.alertas_emergencia to authenticated;
grant update (vista_en) on public.alertas_emergencia to authenticated;

create policy "Lectores: ver alertas recientes" on public.alertas_emergencia for select to authenticated
  using (creada > now() - interval '24 hours'
         and exists (select 1 from public.lectores l
                     where l.propietario_id = alertas_emergencia.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: marcar alerta vista" on public.alertas_emergencia for update to authenticated
  using (creada > now() - interval '24 hours'
         and exists (select 1 from public.lectores l
                     where l.propietario_id = alertas_emergencia.user_id and l.lector_id = (select auth.uid())))
  with check (exists (select 1 from public.lectores l
                      where l.propietario_id = alertas_emergencia.user_id and l.lector_id = (select auth.uid())));

-- Reserva las alertas a las que toca repetir (no vistas, menos de 10 repeticiones, de los últimos 15 min,
-- y la anterior hace más de 50 s). Atómico: aunque se llame dos veces a la vez, cada repetición sale una vez.
create or replace function public.reservar_repeticiones_alerta()
returns table (id uuid, user_id uuid, nombre text, mensaje text, creada timestamptz,
               latitud double precision, longitud double precision, repeticiones int)
language sql security definer set search_path = '' as $$
  update public.alertas_emergencia a
     set repeticiones = a.repeticiones + 1, ultima_repeticion = now()
   where a.vista_en is null
     and a.repeticiones < 10
     and a.creada > now() - interval '15 minutes'
     and coalesce(a.ultima_repeticion, a.creada) < now() - interval '50 seconds'
  returning a.id, a.user_id, a.nombre, a.mensaje, a.creada, a.latitud, a.longitud, a.repeticiones;
$$;
revoke execute on function public.reservar_repeticiones_alerta() from public, anon, authenticated;

-- Cada minuto, solo si hay alguna alerta pendiente de repetir, llama a la Edge Function alerta-repetir.
select cron.schedule('alerta-repetir', '* * * * *', $$
  select net.http_post(
    url := 'https://alexhdutnvlxwhziudnr.supabase.co/functions/v1/alerta-repetir',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  where exists (select 1 from public.alertas_emergencia
                where vista_en is null and repeticiones < 10 and creada > now() - interval '15 minutes');
$$);
