-- Comentarios de «Ayúdanos a mejorar» sin leer en las apps de Savium, para el aviso del menú de la web.
-- Solo el administrador (igual que los paneles). Savium Rewards no tiene buzón.
create function public.apps_comentarios_sin_leer() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is distinct from '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'::uuid then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'share', (select count(*) from public.share_comentarios where not leido),
    'piggy', (select count(*) from public.piggy_comentarios where not leido));
end $$;

revoke all on function public.apps_comentarios_sin_leer() from public, anon, authenticated;
grant execute on function public.apps_comentarios_sin_leer() to authenticated;
