# Consolidación de datos: limpieza, caché única, suscripciones, alertas e importación — diseño

Fecha: 2026-09-21. Estado: revisada por `code-reviewer` (29 hallazgos) y `explorer` (11 verificaciones), todos incorporados. Pendiente de aprobación del usuario.

## Objetivo

Un solo proyecto, en cinco fases ordenadas de menor a mayor riesgo, que cierra lo pendiente tras la versión móvil (7.2):

| Fase | Qué | Cambio visible |
|---|---|---|
| 0 | Borrar código muerto de `useIsMobile`, la tabla `financial_health_history`; helpers de fecha | Ninguno |
| 1 | Migrar los 9 hooks `useState+useEffect` a TanStack Query | Ninguno salvo lo declarado; muchas menos peticiones |
| 2 | Detección de suscripciones como lógica pura en `src/lib/finance/`, testeada y tolerante a cambios de plan | Frecuencias y próximos pagos correctos; móvil al día tras importar |
| 3 | Alertas con la regla del corte de datos + aviso en el Resumen móvil | Menos alertas falsas; alertas en el móvil |
| 4 | Importación: parser robusto y categorización explicable (fases 1–2 del plan anterior + cierre) | Importar es más fiable y se ve por qué se sugiere cada categoría |

Cada fase termina en verde (`vitest`, `tsc`, `build`), con entrada en el changelog y push **solo cuando el usuario lo pida** (una versión por fase: 7.3 → 7.7).

## Principios que atan a todas las fases

- **Regla del corte de datos** (`finMesAnterior` en `src/lib/finance/fechas.ts`): las transacciones se importan al cerrar cada mes; el libro está completo solo hasta el fin del mes anterior. Todo "vencido / inactivo / falta el cargo" se juzga contra ese corte; lo que cae en el mes en curso está "pendiente de importar".
- **Lógica pura en `src/lib/finance/` (y `src/lib/import/`), testeada con vitest**; los hooks solo cargan y mutan; los componentes solo pintan.
- **Una caché**: TanStack Query con claves en un único módulo, `staleTime` 5 min por defecto, mutaciones que invalidan. Nada de `useState+useEffect` para datos remotos.
- **Sin cambio de comportamiento visible salvo el declarado** en la sección "Cambios visibles" de cada fase. Escritorio y móvil comparten la misma función para el mismo dato.
- **Convención de fechas (hecho del código, no se cambia en este proyecto):** `Transaction.fecha` se crea con `new Date('YYYY-MM-DD')` (`src/lib/finance/queries.ts:44`), es decir, **medianoche UTC**; `TransactionsManager` lo compensa con `getTimezoneOffset`. Por eso:
  - Para escribir a BD una fecha que viene de `Transaction.fecha`: `fechaTxISO(d)` = `d.toISOString().slice(0, 10)` (es el inverso exacto).
  - Para escribir una fecha **local** (parser de importación, `calculateNextPayment`, hoy): `toFechaISO(d)` = `yyyy-MM-dd` con getters locales.
  - Para leer `YYYY-MM-DD` de BD hacia una fecha local: `parseFechaLocal`.
  - Agrupar `Transaction.fecha` por mes: getters **UTC** (`getUTCFullYear/getUTCMonth`), porque con getters locales un cargo del día 1 cae en el mes anterior. Se aplica donde se toque (alertas, fase 3); el resto del código queda como está.
- Commits en español por tema; `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Los SQL de migración se escriben en `supabase/migrations/` y **el usuario los ejecuta** en el SQL Editor; el código que dependa de ellos se despliega después de confirmarlo.

---

## Fase 0 — Limpieza y helpers

### `useIsMobile` muerto
`Responsive` (`src/components/Responsive.tsx:21-31`) garantiza que estas páginas solo se renderizan con `isMobile === false`:
- `src/components/Dashboard.tsx`: quitar import (l.14) y hook (l.172); en l.824-936 dejar solo la rama `!isMobile` (Card "Ingresos vs Gastos") y borrar la Card compacta del `else` (l.917-935); quitar el guard `{!isMobile && <>…</>}` de l.938-1009 dejando su contenido.
- `src/pages/Transacciones.tsx`: quitar import (l.7) y hook (l.71); la clase de l.89 queda fija en `'flex items-center justify-end gap-2'`.
- `src/components/TransactionsManager.tsx`: quitar import (l.2) y hook (l.45); quitar los cinco guards `!isMobile &&` (l.1289, 1309, 1361, 1385, 1471) dejando su contenido.
Verificación: `grep -rn "useIsMobile" src` solo devuelve `use-mobile.tsx`, `Responsive.tsx` y `ui/sidebar.tsx`; Dashboard y Transacciones de escritorio se ven igual.

### `financial_health_history`
- Migración `supabase/migrations/20260921120000_drop_financial_health_history.sql`: `DROP TABLE IF EXISTS public.financial_health_history;` (trigger, policies e índice caen con ella; `update_updated_at_column()` es compartida y se conserva). Ninguna otra migración ni código la referencia.
- Borrar el bloque `financial_health_history` de `src/integrations/supabase/types.ts` (l.239). Quitar la frase de `docs/index.md:38`.
- El usuario ejecuta la migración antes del commit de tipos.

### Helpers de fecha (`src/lib/finance/fechas.ts`, con tests)
`toFechaISO(d: Date): string` (local) y `fechaTxISO(d: Date): string` (UTC, para `Transaction.fecha`). `alerts.ts` sustituye su `isoDay` privado por `toFechaISO`.

---

## Fase 1 — Caché única (TanStack Query)

### Claves
Nuevo módulo `src/lib/finance/queryKeys.ts` con `STALE_TIME = 5 * 60 * 1000` y `financeQueryKeys(userId)` movido desde `useFinanceDataSupabase.ts` (que lo re-exporta). Claves nuevas, `['finance', userId, '<x>'] as const`: `perfil`, `pendientes`, `inversiones`, `tiposInversion`, `reglas`, `criptomonedas`, `criptoPrecios`, `paymentSkips`, `alertDismissals`. Tipos de cambio: `['exchange-rates']` (no dependen del usuario).

### Hook por hook (misma forma de `return`; los consumidores no cambian)
| Hook | Query | Mutaciones → invalidan | Notas |
|---|---|---|---|
| `useAppConfig` (18 consumidores) | `perfil`: `profiles.select('*').eq('user_id').single()`, **compartida con `useUserProfile`** | — | `configLoaded = !isPending` (hoy `loaded` es true aunque el fetch falle; un perfil ausente no debe dejar el móvil en loader infinito); `currency = data?.divisa_preferida ?? 'MXN'` |
| `useUserProfile` | misma `perfil` | `ProfileEditor` (hoy update directo + `refetch`, l.85-96, incluye `divisa_preferida`) pasa a `useMutation` que invalida `perfil` → `useAppConfig` refleja el cambio | |
| `usePendings` | `pendientes` | 4 mutaciones invalidan `pendientes`; devuelven `{ error }` y muestran los mismos toasts; `reload` = `refetch` (lo usa el importador) | |
| `useInvestments` | `inversiones`: `inversiones` + `investment_valuations` + `investment_payouts` en una `queryFn` | 6 mutaciones invalidan `inversiones`; devuelven `boolean` | **`saldo_cuenta` deja de consultar `cuentas`/`transacciones`**: se toma de `useFinanceDataSupabase().accounts` (ya trae `saldoActual`) en un `useMemo`. Elimina 2 consultas y evita saldos desactualizados 5 min tras importar |
| `useInvestmentTypes` | `tiposInversion` | 3 mutaciones invalidan | |
| `useClassificationRules` | `reglas` | 3 mutaciones invalidan; `findMatchingRule` envuelve la función pura de la fase 4 | |
| `useCriptomonedas` | `criptomonedas` + dependiente `criptoPrecios` (`enabled: symbols.length > 0`, `staleTime` 5 min, `retry: 1`); lista enriquecida en `useMemo` | 3 mutaciones invalidan `criptomonedas` | |
| `usePaymentSkips` | `paymentSkips` | `addSkip`/`removeSkip` invalidan (se abandona la actualización local; `MonthlyPaymentsControl` no usa el valor devuelto); `findSkip` intacto | |
| `useExchangeRates` | `['exchange-rates']`, `staleTime` y `refetchInterval` 5 min, `retry: false` (la `queryFn` devuelve `DEFAULT_RATES` en fallo); `rates = data ?? DEFAULT_RATES`; `convertCurrency` en `useCallback([rates])`; `refreshRates` = `refetch` | — | Desaparecen `cachedRates`, `fetchPromise`, `cacheTimestamp` y el `setInterval` por instancia. Ningún consumidor usa `rates` ni `refreshRates` directamente |
| `useAlerts` | `alertDismissals` pasa a `financeQueryKeys`; la query de suscripciones **se unifica en la fase 2** (no antes: `useSubscriptionServices` tiene `staleTime: 0` hasta entonces) | `dismiss`/`restore` como `useMutation` con la misma actualización optimista | |

Todas con `enabled: !!user`. `signOut` ya hace `queryClient.clear()`.

### Cambios visibles declarados
- `CriptomonedasManager` muestra spinner durante la primera carga (hoy `loading` pasa a `false` antes de que lleguen los datos).

### Verificación
- Red del Browser pane tras login: `profiles` una vez, `transaction_pendings` una vez, `inversiones` una vez al entrar a Inversiones; navegar entre páginas no repite peticiones.
- Crear/editar/borrar un pendiente, una inversión, una regla, un tipo, una cripto y un skip: la lista se actualiza sola y el toast es el de siempre. Cambiar `divisa_preferida` en Configuración se refleja en el Dashboard sin recargar.
- `vitest` verde; sin tests de hooks (la lógica sigue pura).

---

## Fase 2 — Detección de suscripciones en `src/lib/finance/`

### Estado actual (hechos verificados)
Toda la detección vive en `SubscriptionsManager.tsx` (962 líneas): patrones, `resolveServiceName`, frecuencia por **media** de gaps, `calculateNextPayment`, y 4 consultas a Supabase **por suscripción** más 3 globales en cada `processSubscriptions`. Una vez guardada una fila, su frecuencia **no se vuelve a detectar nunca** (l.574-575). Un cargo de cambio de plan (Anthropic: 30/7 y 8/8) da un gap de 9 días → `Irregular`. `previousPaymentAmount` solo existe en memoria (alimenta los iconos de tendencia, l.891-893). En BD conviven `UNIQUE (user_id, service_name)` (migración 20250816182914) y un índice único **parcial** `(user_id, canon_key) WHERE canon_key IS NOT NULL` (20250816212628); PostgREST no puede inferir el parcial, así que **un `upsert` por `canon_key` fallaría**.

### Módulos nuevos
- `src/lib/finance/subscriptionPatterns.ts`: `SUBSCRIPTION_PATTERNS` **tal cual** (las 7 entradas `microsoft` se quedan: el matching exige *todas* las keywords, fundirlas rompería Microsoft) y `matchTransactionToPattern` (±15%; se corrige el comentario que decía ±10%).
- `src/lib/finance/subscriptions.ts` (puro, testeado):
  ```ts
  export type SubscriptionFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Irregular'; // única definición; subscriptionsSummary.ts la importa
  export const resolveServiceName = (comentario, monto, aliases): { serviceName; tipoServicio; canonKey }
  export const detectFrequency = (fechas: Date[]): { frecuencia: SubscriptionFrequency; ciclos: Date[][] }
  export const calculateNextPayment = (ultimoPago: Date, frecuencia): Date
  export const previousPaymentAmount = (originalComments: string[], transactions): number | null   // último cargo del ciclo anterior; misma lógica que subscriptionIncreaseAlerts
  export interface DetectedSubscription { canonKey; serviceName; tipoServicio; ultimoPago: { monto; fecha: Date }; frecuencia; proximoPago: Date; numeroPagos; originalComments: string[] }
  export const detectSubscriptions = (transactions, categories, aliases, now?): DetectedSubscription[]
  export const mergeWithStored = (detected, stored: SubscriptionService[]): { updates: SubscriptionUpdate[]; inserts: SubscriptionInsert[]; orphanIds: string[] }
  ```
- `detectFrequency`: **mediana** de gaps (no media). **Colapso de ciclo**: un cargo a ≤ 15 días del anterior es del mismo ciclo (cambio de plan, cargo doble): su gap no cuenta para la mediana, pero el cargo sí cuenta en `numeroPagos` y `originalComments`. `ultimoPago` = el cargo más reciente. Rangos sobre la mediana: Mensual 20–45, Bimestral 46–75, Trimestral 76–120, Semestral 150–220, Anual 300–400; si no, `Irregular`. **`Semanal` no se detecta** (el colapso lo haría imposible); queda como opción manual, que es lo que admite el CHECK.
- `calculateNextPayment`: como hoy, más `Semanal` (+7 días) y `Trimestral` (+3 meses); `Irregular` = +1 mes.
- `proximoPago` = **siempre** `calculateNextPayment(ultimoPago, frecuencia efectiva)`; se abandona "conservar el guardado si es mayor que el último pago" (era un parche para no pisar ediciones manuales; eso ahora lo resuelve `frecuencia_manual`).
- Fechas: `ultimoPago.fecha` viene de `Transaction.fecha` (UTC) → se escribe con `fechaTxISO`; `proximoPago` es local (derivado con `setMonth` sobre una copia) → con `toFechaISO`. Test: cargo `'2026-08-08'` → `ultimo_pago_fecha '2026-08-08'` y `proximo_pago '2026-09-08'` en UTC-6.
- `mergeWithStored`: preserva `service_name`, `active`, `aliases`; preserva `frecuencia` solo si `frecuencia_manual`; recalcula `proximoPago`; devuelve huérfanas (filas sin `canon_key` detectado). **Unicidad de nombre**: si un `insert` chocaría con un `service_name` existente del usuario, el nombre nuevo lleva sufijo ` (2)`, ` (3)`… (test). Los `updates` nunca cambian el nombre.

### Migración `20260921130000_subscription_frecuencia_manual.sql`
```sql
ALTER TABLE public.subscription_services ADD COLUMN frecuencia_manual boolean NOT NULL DEFAULT false;
-- Conservador: lo que ya estaba guardado con una frecuencia concreta se respeta; solo las 'Irregular' se vuelven a detectar.
UPDATE public.subscription_services SET frecuencia_manual = (frecuencia <> 'Irregular');
```
`saveEditedFrequency` la pone a `true`. Sin ella no hay forma de distinguir "la editó el usuario" de "la detectamos una vez". Tipos a mano en `types.ts`. No se crea ningún índice nuevo.

### Persistencia: `useSubscriptionSync`
Hook con una `useMutation` `sync(transactions?, categories?)`: lee **todas** las filas del usuario (1 select), llama a `mergeWithStored`, ejecuta `update().eq('id')` por fila modificada e `insert` por fila nueva (N escrituras, **sin upsert** por el índice parcial), `delete().in('id', orphanIds)`, e invalida `financeQueryKeys.subscriptions`. Un 23505 en una fila se registra (toast "Nombre duplicado: X") y no aborta el resto. De ~4×N+3 consultas a N+2.

Disparadores:
- (a) al montar `SubscriptionsManager`, **una vez por identidad del array `transactions`** de la caché (ref), no en cada montaje;
- (b) **tras una importación correcta**: el importador hace `await invalidate(transacciones)` y luego `sync()` con `queryClient.getQueryData(financeQueryKeys.transacciones)` (no con la prop vieja del closure). Así el móvil, que solo lee la tabla, está al día sin abrir el escritorio.

### `useSubscriptionServices`
Pasa a devolver **todas** las filas (hoy filtra `active = true`); cada consumidor filtra: `cxp.ts:59` y `alerts.ts:84` ya lo hacen; `SuscripcionesMovil`, `PorPagarMovil` y `computeSubscriptionsSummary` filtran `active`. `SubscriptionsManager` necesita las inactivas para su toggle `showInactive`. Con las mutaciones invalidando, `staleTime` vuelve a 5 min. `useAlerts` pasa a usar este hook (se elimina la query `subscriptions-for-alerts`).

### `SubscriptionsManager.tsx`
Pasa a: `useSubscriptionServices` (datos) + `useSubscriptionSync` (detección) + `previousPaymentAmount(...)` en cliente para los iconos de tendencia + sus ediciones (`toggleActive`, `saveEditedName`, `saveEditedFrequency` → `frecuencia_manual = true`, `performMerge`) como `useMutation` que invalidan `subscriptions`. `FREQUENCY_OPTIONS` añade Trimestral y Semanal. Objetivo: < 500 líneas.

### Tests (`subscriptions.test.ts`)
Frecuencia: mensual limpio; mensual con cargo de cambio de plan a 9 días (→ `Mensual`; `ultimoPago` = el más reciente; `numeroPagos` cuenta ambos; `previousPaymentAmount` = el del ciclo anterior); bimestral; trimestral; anual; un solo pago → `Irregular`. `resolveServiceName`: alias del usuario gana a patrón; patrón con `expectedAmount` ±15%; Microsoft con `msbill` coincide; fallback `custom-…` sin acentos. `mergeWithStored`: preserva nombre/activo/alias; preserva frecuencia solo con `frecuencia_manual`; recalcula `proximoPago`; detecta huérfanas; sufijo por nombre duplicado. `calculateNextPayment` por frecuencia, fin de mes incluido (31 ene + 1 mes). Fechas UTC/local como arriba.

### Cambios visibles declarados
- Anthropic (y cualquier `Irregular` mal detectada) pasa a su frecuencia real en el primer sync; las editadas a mano no cambian.
- `proximo_pago` se recalcula siempre desde el último pago real (puede moverse un día respecto al guardado por el antiguo `toISOString`).

### Verificación
Con datos reales: Anthropic → Mensual, próximo pago 8 sept ("Este mes" en móvil); Spotify como el usuario lo dejó; ningún nombre ni estado activo cambia; tras importar un archivo, Suscripciones del móvil refleja el cambio; el gestor de escritorio sigue mostrando inactivas con el toggle y los iconos de tendencia.

---

## Fase 3 — Alertas con corte de datos y aviso en el móvil

### Lógica (`src/lib/finance/alerts.ts`)
- `categorySpikeAlerts`: evalúa el **último mes cerrado** (`finMesAnterior(now)`) contra los 12 meses anteriores a ese; agrupa `Transaction.fecha` por mes con getters **UTC**. Clave, `detail` y `href` usan ese mes. (La clave `categoria_disparada:<categoria>:<yyyy-mm>` es la misma que se habría generado en su momento → los descartes no resucitan.)
- `annualPaymentAlerts`: "vence en N días" sigue desde hoy (≤ `annualDaysAhead` = 15). "Venció hace N días" solo si el vencimiento es **≤ corte** y dista ≤ `annualDaysOverdue` (30) **del corte**; un vencimiento pasado dentro del mes en curso no alerta (pendiente de importar). `groupAnnualPayments` ya adelanta `nextPayment` un año cuando el pago existe, así que "sin pago registrado" es consecuencia, no condición.
- `subscriptionIncreaseAlerts`: compara el último cargo del último ciclo con el último cargo del ciclo anterior (`agruparCiclos`, cargos a ≤ 15 días = mismo ciclo), coherente con el icono de tendencia de suscripciones; así dos cargos del plan nuevo no enmascaran la subida (la de Anthropic sigue siendo una alerta legítima). Recibe `SubscriptionService[]` de `useSubscriptionServices` y filtra `active`.
- Tests con `now = 20 sep 2026` (corte 31 ago): gasto disparado en agosto → alerta en septiembre; gasto de septiembre no se evalúa; anual vencido el 5 sep → sin alerta; vencido el 5 ago → alerta; vencido el 20 jul (42 días antes del corte) → sin alerta; cargo del 1 sep 00:00 UTC cuenta en septiembre, no en agosto.

### Móvil
`ResumenMovil` muestra, arriba del patrimonio, una tarjeta "Alertas (N)" con las activas (no descartadas): icono por tipo, título, `detail` en 14px, importe con su divisa. Sin descartar (solo lectura); si N = 0 no aparece. Usa `useAlerts` (ya TanStack; comparte caché; **declarado:** `useAlerts` monta su propio `useFinanceDataSupabase`, cuyo `useMemo` recalcula `dashboardMetrics` una segunda vez en el móvil — milisegundos, aceptado). **Declarado:** los pagos anuales marcados inactivos viven en `localStorage` (`inactive_annual_payments`) del escritorio; en el teléfono no existen, así que esos podrían aparecer como alerta. Moverlo a BD queda fuera de alcance.

### Escritorio
`Alertas.tsx` y el changelog explican el mes de referencia ("gasto del último mes cerrado").

---

## Fase 4 — Importación (fases 1–2 del plan anterior + cierre)

Plan anterior: `/Users/manoloto/.claude/plans/dime-si-podemos-mejorar-tidy-forest.md` (186 líneas; se copia a `docs/superpowers/plans/2026-09-21-importacion-plan-anterior.md` como referencia). Se ejecuta **recortado**: parser robusto, categorización explicable con "crear regla desde el preview", resumen y toast de cierre. Fuera: preview editable por fila, asignación en bloque, drag & drop, duplicados.

### 4.1 Parser (`src/lib/import/bankStatementParser.ts`, puro, testeado)
- `parseBankStatement(bytes, filename): Promise<ParseResult>` (asíncrono: Excel carga `xlsx` bajo demanda). `ParseResult = { movements: RawMovement[]; skipped: SkippedRow[]; meta: { delimiter; encoding; ambiguousDate } }`; `RawMovement = { sourceRow; fecha: Date (local); descripcion; montoOriginal (con el signo del archivo); cargoAbono?; tarjetahabiente? }`; `SkippedRow = { sourceRow; reason: 'sin_fecha' | 'monto_cero' | 'monto_invalido'; cells }`.
- Mueve tal cual `parseAmount` (l.165), `parseDate` (l.199), `detectDateAmbiguity` (l.246), `stripPreamble` (l.260), `detectFormat` (l.276), `excelSerialToDate` (l.563). Borra `parseCSVLine` (l.138, muerto: el CSV va por Papa) y `getCategoriesForRow` (l.987) y el `safeCol(3)` de ING (l.673-674).
- CSV: Papa **sin `delimiter`** (autodetecta `,`/`;`); codificación por BOM/bytes inválidos (UTF-8 → Latin-1). Excel: la columna `Importe` detectada por cabecera gana a la heurística "último numérico".
- Segunda función pura `toParsedRows(movements, tipoCuenta, categorizer)`: signo → `gasto/ingreso` según tipo de cuenta (hoy l.502-512 y 684-689) + sugerencia de categoría.
- Fechas: `parseDate` devuelve fechas locales; `addTransactionsBatch` escribe con `toFechaISO` (hoy `toISOString()` en el hook, l.412, que con locales en UTC-6 da el mismo resultado; se unifica). La vinculación de pendientes (l.928) usa `toFechaISO`.
- `addTransactionsBatch` **relanza el error** (hoy lo traga, l.433-440, y el diálogo se cierra igual); sigue invalidando `transacciones` (los saldos se derivan en memoria).

### 4.2 Categorización (`src/lib/import/importCategorizer.ts`, puro, testeado)
- `findMatchingRuleDetailed(rules, description, amount?, accountId?) → { category_id, name, keyword } | null` se **mueve** a `src/lib/classificationRules.ts` (hoy la búsqueda vive en el hook, l.79-99); `keyword` = la primera de `splitClassificationKeywords` que coincide. `useClassificationRules.findMatchingRule` envuelve.
- Orden: historial exacto (más frecuente, desempate más reciente) → **regla** → historial parcial estricto (primeras 3 palabras, solo con ≥ 2 palabras y ≥ 8 caracteres). Se **elimina** el `includes` bidireccional. `CategorySuggestion { categoriaId; source: 'historial'|'regla'|'historial_parcial'; detail; confidence: 'alta'|'media' }`.
- Tests: más frecuente gana a última; "uber eats madrid" no coincide con historial "uber"; regla gana a parcial; exacto gana a regla.

### 4.3 UI
`BankStatementImporter.tsx` se parte en `src/components/import/`: orquestador (≈ 350 líneas; conserva la vinculación de pendientes, ahora con `usePendings().reload` = `refetch`), `ImportPreviewTable` (icono de fuente + tooltip por fila; filtro "Dudosas (N)"), `CreateRuleFromRowDialog` (prellenado; "coincide con N filas"; al guardar aplica a las filas no manuales), `ImportSummaryBar` (totales, descartadas con motivo, botón Importar). Al terminar: toast "N transacciones importadas en {cuenta}", `await invalidate(transacciones)` y `useSubscriptionSync.sync()` con la caché nueva (fase 2). Se borran los `console.log`.

### Cambios visibles declarados
- Orden de categorización: hoy es exacto → parcial → regla; pasa a exacto → **regla** → parcial estricto. Una fila que hoy se categoriza por parcial laxo puede quedar sin sugerencia o con la de una regla. Es el objetivo.
- Fuente de la sugerencia visible; filas descartadas visibles; el diálogo no se cierra si falla el insert.

### Verificación
Fixtures en `$TMPDIR`: CSV `;` con `1.234,56`; CSV Latin-1; XLSX con `Importe` y `Saldo`; fila sin fecha → descartada visible; descripción idéntica a historial → "Historial · 12 movimientos"; solo regla → "Regla · Netflix"; crear regla desde fila → aparece en `/reglas-clasificacion` y las filas quedan con fuente Regla; insert fallido → toast y preview abierto; éxito → toast y Suscripciones móvil actualizado. Red: mismo fixture importado antes y después de la fase da las mismas filas salvo las diferencias de orden de categorización declaradas.

---

## Fuera de alcance
Últimas transacciones en móvil; preview editable / bulk / drag & drop; duplicados en importación; Sign in with Apple; cambiar la convención UTC de `Transaction.fecha` en toda la app; mover `inactive_annual_payments` a BD.

## Riesgos y decisiones
1. `frecuencia_manual` requiere migración: hasta que el usuario la ejecute, la fase 2 no se despliega. El `UPDATE` conservador respeta lo editado; las `Irregular` se vuelven a detectar (Anthropic incluida).
2. No se crea ningún índice nuevo: el parcial existente se respeta y no se usa `upsert`.
3. La fase 4 toca el archivo más grande del proyecto (1.480 líneas); se hace en commits pequeños con el fixture "antes/después" como red.
4. Fase 1 cambia cuándo se refresca `saldo_cuenta` en Inversiones: ahora sigue a la caché de cuentas/transacciones (más fresco que hoy, no menos).
