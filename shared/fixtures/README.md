# Fixtures compartidos web ↔ app iOS

Casos de entrada y resultado esperado de las reglas que la web (TypeScript) y la
app iOS (Swift) calculan cada una por su lado. Los leen
`src/lib/finance/fixturesCompartidos.test.ts` (vitest) y los tests de `SaviumCore`.
Si cambias una regla, cambia aquí el caso y los dos lados tienen que seguir pasando.

Convenciones:
- Zona horaria: America/Mexico_City.
- `now`: hora local sin zona (`2026-09-15T12:00:00`).
- Todas las fechas de entrada `YYYY-MM-DD` (transacciones, `fecha_esperada`, `proximo_pago`) son
  días locales: medianoche local (`parseFechaLocal` en la web, `Fechas.diaLocal` en Swift).
- Fechas de salida: día local `YYYY-MM-DD` (`toFechaISO` / `Fechas.isoLocal`).
- `tasas`: MXN por unidad. Importes con tolerancia de 1e-6.
