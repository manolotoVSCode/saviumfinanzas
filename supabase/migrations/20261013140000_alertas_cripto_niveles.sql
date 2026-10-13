-- Alertas cripto por niveles en vez de «cuánto sube / cuánto baja»: el usuario escribe el %
-- que ve en la tarjeta, con su signo. Con SHIB en −89 % puede pedir aviso al recuperarse a −20 %,
-- cosa que sube_pct (> 0) no permitía. La tabla estaba vacía al cambiarla.

alter table public.alertas_cripto drop constraint if exists alertas_cripto_check;
alter table public.alertas_cripto drop column if exists sube_pct, drop column if exists baja_pct;

alter table public.alertas_cripto
  -- avisar cuando el % sobre lo pagado sea ≥ nivel_arriba
  add column nivel_arriba numeric check (nivel_arriba > -100),
  -- avisar cuando el % sobre lo pagado sea ≤ nivel_abajo
  add column nivel_abajo numeric check (nivel_abajo > -100),
  add constraint alertas_cripto_algun_nivel check (nivel_arriba is not null or nivel_abajo is not null),
  add constraint alertas_cripto_niveles_ordenados check (nivel_arriba is null or nivel_abajo is null or nivel_abajo < nivel_arriba);
