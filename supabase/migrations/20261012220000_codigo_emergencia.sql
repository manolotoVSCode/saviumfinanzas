-- Código de coacción: escrito en la pantalla de acceso de la app iOS en lugar de la contraseña, la abre en modo
-- señuelo y manda la alerta. Solo se guarda el hash (sha256 de 'savium-coaccion:<user_id>:<código>'); la app lo
-- descarga y lo comprueba en el iPhone. Se configura desde el editor SQL, nunca desde la app (no deja rastro).

create table if not exists public.codigos_emergencia (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  hash        text not null check (hash ~ '^[0-9a-f]{64}$'),
  actualizado timestamptz not null default now()
);

alter table public.codigos_emergencia enable row level security;
revoke all on public.codigos_emergencia from anon;

-- Cada uno solo lee el suyo. Sin políticas de escritura: se pone o cambia desde el editor SQL.
create policy "Mi código de emergencia: ver" on public.codigos_emergencia for select to authenticated
  using ((select auth.uid()) = user_id);
