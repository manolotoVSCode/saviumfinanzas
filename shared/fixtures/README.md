# Fixtures compartidos web ↔ app iOS

Casos de entrada y resultado esperado de las reglas que la web (TypeScript) y la
app iOS (Swift) calculan cada una por su lado. Los leen
`src/lib/finance/fixturesCompartidos.test.ts` (vitest) y los tests de `SaviumCore`.
Si cambias una regla, cambia aquí el caso y los dos lados tienen que seguir pasando.

Convenciones:
- Zona horaria: America/Mexico_City.
- `now`: hora local sin zona (`2026-09-15T12:00:00`).
- Fechas de transacciones: `YYYY-MM-DD`, que la web lee como medianoche UTC (`new Date(iso)`).
  Se evita el día 1 de cada mes por un fallo conocido de la web con esa conversión.
- Otras fechas de entrada (`fecha_esperada`, `proximo_pago`): día local.
- Fechas de salida: día de calendario `YYYY-MM-DD`.
- `tasas`: MXN por unidad. Importes con tolerancia de 1e-6.
