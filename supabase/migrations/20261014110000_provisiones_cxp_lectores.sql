-- La App (1.4) muestra las provisiones de CxP: el lector las ve como el resto de tablas
-- (solo SELECT; crear, pagar y borrar siguen siendo solo del titular).
create policy "Lectores: solo lectura" on public.provisiones_cxp for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = provisiones_cxp.user_id and l.lector_id = (select auth.uid())));
