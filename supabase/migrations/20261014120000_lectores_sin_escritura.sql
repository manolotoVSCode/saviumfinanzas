-- Un lector no puede escribir nada, ni siquiera a su nombre.
-- Las políticas permisivas «auth.uid() = user_id» dejaban que la lectora creara filas propias
-- (p. ej. una transacción suya apuntando a una cuenta del titular desde la web, 2026-10-14).
-- Una política RESTRICTIVE se suma con AND a las permisivas: si eres lector, INSERT/UPDATE/DELETE fallan.
-- Excepciones: lo que la app del lector necesita escribir.
--   dispositivos        → registrar su iPhone para las notificaciones de alerta
--   alertas_emergencia  → marcar la alerta como vista (para las repeticiones)
--   profiles            → su propio perfil (no toca datos del titular)
-- Las tablas nuevas con user_id deben añadir esta misma política.

create or replace function public.es_lector()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.lectores where lector_id = (select auth.uid()));
$$;

revoke all on function public.es_lector() from public, anon;
grant execute on function public.es_lector() to authenticated;

do $$
declare
  t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'user_id' and x.table_type = 'BASE TABLE'
      and c.table_name not in ('dispositivos', 'alertas_emergencia', 'profiles')
  loop
    execute format('drop policy if exists "Lectores: sin altas" on public.%I', t);
    execute format('drop policy if exists "Lectores: sin cambios" on public.%I', t);
    execute format('drop policy if exists "Lectores: sin bajas" on public.%I', t);
    execute format('create policy "Lectores: sin altas" on public.%I as restrictive for insert to authenticated with check (not public.es_lector())', t);
    execute format('create policy "Lectores: sin cambios" on public.%I as restrictive for update to authenticated using (not public.es_lector()) with check (not public.es_lector())', t);
    execute format('create policy "Lectores: sin bajas" on public.%I as restrictive for delete to authenticated using (not public.es_lector())', t);
  end loop;
end $$;
