-- La lectora debe ver exactamente las mismas cifras que el titular, en la web y en la app.
-- Faltaba SELECT para lectores en las tablas que alimentan Inversiones (cripto, tipos, pagos)
-- y las alertas (umbrales cripto y descartes del titular: así no ve alertas que él ya descartó).
-- Solo lectura: las escrituras siguen bloqueadas por 20261014120000_lectores_sin_escritura.sql.

create policy "Lectores: solo lectura" on public.criptomonedas for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = criptomonedas.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.investment_types for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = investment_types.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.investment_payouts for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = investment_payouts.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.alertas_cripto for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = alertas_cripto.user_id and l.lector_id = (select auth.uid())));

create policy "Lectores: solo lectura" on public.alert_dismissals for select to authenticated
  using (exists (select 1 from public.lectores l where l.propietario_id = alert_dismissals.user_id and l.lector_id = (select auth.uid())));
