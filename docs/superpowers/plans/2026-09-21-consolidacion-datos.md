<!-- PARTE 1/4 -->

# Plan de implementación: consolidación de datos (limpieza, caché única, suscripciones, alertas, importación)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Contexto

Tras la versión móvil (7.2) quedan cinco frentes abiertos que la spec `docs/superpowers/specs/2026-09-21-consolidacion-datos-design.md` ordena de menor a mayor riesgo: código muerto y una tabla huérfana; nueve hooks que todavía cargan con `useState+useEffect` (peticiones repetidas, listas que no se refrescan); la detección de suscripciones enterrada en un componente de 962 líneas con 4 consultas por suscripción y frecuencias mal detectadas (Anthropic → `Irregular`); alertas que ignoran que el mes en curso aún no está importado; y un importador de 1.480 líneas con parser frágil y categorización opaca. Este plan implementa la spec fase por fase. Cada fase es una versión (7.3 → 7.7) y termina en verde.

**Goal:** Al terminar, todos los datos remotos pasan por TanStack Query con claves en un único módulo; la detección de suscripciones es una función pura testeada que tolera cambios de plan y se sincroniza sola tras importar; las alertas juzgan "vencido / disparado" contra el corte de datos (`finMesAnterior`) y se ven en el Resumen móvil; y el importador parsea CSV `;`/Latin-1/Excel de forma robusta, muestra por qué sugiere cada categoría y permite crear reglas desde el preview. Sin cambios visibles salvo los declarados en la spec.

**Architecture:** La lógica nueva vive como funciones puras en `src/lib/finance/` (`fechas`, `subscriptionPatterns`, `subscriptions`, `alerts`, `queryKeys`) y `src/lib/import/` (`bankStatementParser`, `importCategorizer`, `toParsedRows`), con tests vitest. Los hooks (`src/hooks/*`) solo envuelven `useQuery`/`useMutation` y devuelven exactamente la misma forma que hoy para que los consumidores no cambien. Los componentes solo pintan: `SubscriptionsManager` se reescribe sobre `useSubscriptionServices` + `useSubscriptionSync`; `BankStatementImporter` se parte en `src/components/import/*`.

**Tech Stack:** React 18, Vite, TypeScript (strict: false), Tailwind + shadcn/ui, TanStack Query 5.56, Supabase JS, papaparse 5, xlsx 0.20 (carga bajo demanda), vitest 2 (solo `src/**/*.test.ts`, sin testing-library), sonner + `use-toast`, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-21-consolidacion-datos-design.md` (fuente de verdad; 29 hallazgos ya incorporados). Plan anterior de importación, solo como referencia: `docs/superpowers/plans/2026-09-21-importacion-plan-anterior.md`.

## Global Constraints

- Rama de trabajo: `git checkout -b consolidacion-datos` antes de la Task 0.1.
- Comandos de verificación: `npx vitest run <archivo>` por tarea, `npx vitest run` completo, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`.
- Mensajes de commit en español, sin prefijos, una línea de asunto, línea en blanco y el pie `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Ejemplo:
  ```
  git commit -m "Asunto del commit" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
  ```
- Verificación manual: Browser pane con `preview_start` `name: "savium-dev"` (puerto 8080). Rutas con hash: `http://localhost:8080/#/dashboard`. Móvil: `resize_window` a 390×844; escritorio: `preset: "desktop"`. Red: `read_network_requests` con `urlPattern` (p. ej. `profiles`).
- Las migraciones SQL **ya existen** en `supabase/migrations/20260921120000_drop_financial_health_history.sql` y `20260921130000_subscription_frecuencia_manual.sql`. No se reescriben. **El usuario las ejecuta** en el SQL Editor; el plan indica en qué tarea hay que esperar su confirmación.
- Regla del corte de datos: todo "vencido / inactivo / falta el cargo" se juzga contra `finMesAnterior(now)`.
- Convención de fechas (no se cambia): `Transaction.fecha` es medianoche UTC. Para escribirla a BD → `fechaTxISO`; fecha local → `toFechaISO`; leer `YYYY-MM-DD` → `parseFechaLocal`; agrupar `Transaction.fecha` por mes → getters UTC.
- Los hooks devuelven **la misma forma** que hoy. Antes de tocar un hook, leer sus consumidores (listados en cada tarea).
- Push solo cuando el usuario lo pida.

## Decisiones tomadas al planificar (no están en la spec)

1. **Mutaciones de hooks simples** (`usePendings`, `useInvestments`, `useInvestmentTypes`, `useClassificationRules`, `useCriptomonedas`, `usePaymentSkips`): siguen siendo funciones `async` planas que hacen la escritura y luego `queryClient.invalidateQueries` — conservan sus valores de retorno (`{ error }`, `boolean`, `PostgrestError | undefined`, `data`). `useMutation` solo donde la spec lo pide: `ProfileEditor`, `useAlerts`, `useSubscriptionSync` y las ediciones de `SubscriptionsManager`.
2. `useAppConfig` se implementa **componiendo** `useUserProfile()` (una sola `useQuery` con clave `perfil`): `currency = profile?.divisa_preferida ?? 'MXN'`, `configLoaded = !!user && !loading`. `useUserProfile` usa `retry: 1` para que un perfil ausente no deje el loader 7 s.
3. La clave de precios cripto lleva la lista de símbolos como último elemento (`[...QK.criptoPrecios, 'BTC,ETH']`) para que añadir una cripto vuelva a pedir precios; sigue siendo prefijo de `criptoPrecios`.
4b. Cambios visibles añadidos al planificar (fase 4): `parseAmount('129,00 EUR')` pasa a dar 129 (hoy 12900) porque el código de divisa se quita antes que los espacios; `detectFormat` respeta la columna de descripción indicada por la cabecera (hoy la pisa el "texto más largo"). (Fase 2): el texto del gestor de suscripciones pasa de "últimos 12 meses" a "últimos 24 meses" (es lo que analiza); `previousPaymentAmount` (icono de tendencia) se calcula sobre todas las transacciones cuyo comentario esté en `original_comments`, igual que `subscriptionIncreaseAlerts` (hoy usaba solo el grupo detectado); aceptado por coherencia con las alertas. (Fase 1): `useInvestments` monta `useFinanceDataSupabase` para leer `accounts.saldoActual`; eso ejecuta una vez más `computeDashboardMetrics` en Inversiones (milisegundos), aceptado a cambio de eliminar dos consultas y tener saldos siempre frescos.
4. `useSubscriptionSync.sync()` sin argumentos lee transacciones y categorías **de la caché** (`queryClient.getQueryData`) en el momento de ejecutarse, no del closure: tras `await invalidate(transacciones)` siempre ve los datos nuevos. La guarda "una vez por identidad del array" es una variable **a nivel de módulo** (`ultimoSincronizado`) que sobrevive a los montajes de `SubscriptionsManager` y se limpia si la mutación falla.
5. `calculateNextPayment` recibe siempre una fecha **local**. `detectSubscriptions` y `mergeWithStored` convierten `Transaction.fecha` (UTC) con `parseFechaLocal(fechaTxISO(d))` antes de llamarla; así `cargo '2026-08-08' → proximo_pago '2026-09-08'` en cualquier zona horaria. Fin de mes: se conserva el desbordamiento de JS de hoy (`31 ene + 1 mes = 3 mar`), documentado por test.
6. `mergeWithStored` solo devuelve `updates` para filas que **cambian de verdad** (compara los siete campos escritos): un sync sin datos nuevos hace 0 escrituras.
7. `SubscriptionsManager` ordena la lista por `ultimo_pago_fecha` descendente (hoy el orden es el de inserción del `Map` de detección, que con las transacciones ordenadas por fecha desc equivale a "cargo más reciente primero"). Las fechas de BD se leen con `parseFechaLocal` (hoy `new Date(iso)` mostraba el mes/día UTC, que en México podía ser el anterior).
8. `alerts.ts` conserva su propio tipo de entrada `SubscriptionForAlerts`, pero con los **nombres de columna** de BD (`service_name`, `original_comments`) para que `SubscriptionService[]` de `useSubscriptionServices` sea asignable sin mapeo (spec fase 2/3: "recibe `SubscriptionService[]`").
9. `PorPagarMovil` no cambia: pasa `subscriptions` a `computeCxP`, que ya filtra `active` (`cxp.ts:59`).
10. Parser: CSV y Excel comparten `parseRows(rows, hint)` (con la muestra "cabecera + filas con fecha e importe" que hoy solo usa Excel para `detectFormat`); la heurística "primer numérico de derecha a izquierda" corre **solo** si no se detectó columna de importe (`amountCol === -1`). `parseAmount` se mueve tal cual (devuelve 0 si no es numérico); `monto_invalido` vs `monto_cero` se decide por si la celda contiene dígitos.
11. `ParsedRow` y `toParsedRows` viven en `src/lib/import/toParsedRows.ts`; `buildHistoryIndex` recibe el id de "Sin Asignar" para **no aprender** de transacciones sin asignar (hoy un historial "Sin Asignar" bloqueaba la regla; ahora la regla gana). Declarado como parte del cambio de orden de categorización.
12. El toast de error de `addTransactionsBatch` se elimina del hook (relanza) y lo muestra el importador, su único llamador, para no duplicar toasts.
13. Versiones: 7.3 (fase 0), 7.4 (fase 1), 7.5 (fase 2), 7.6 (fase 3), 7.7 (fase 4). `APP_VERSION` sale de `changelog[0].version` en `src/components/Changelog.tsx`.

---

## Fase 0 — Limpieza y helpers (versión 7.3)

### Task 0.1: Helpers `toFechaISO` / `fechaTxISO` con tests + `alerts.ts` usa `toFechaISO`

**Files**
- Modify: `src/lib/finance/fechas.ts`
- Modify: `src/lib/finance/fechas.test.ts`
- Modify: `src/lib/finance/alerts.ts` (línea `const isoDay = …` y su único uso en `annualPaymentAlerts`)

**Interfaces**
- Produces:
  ```ts
  export const toFechaISO = (d: Date): string   // 'YYYY-MM-DD' con getters locales
  export const fechaTxISO = (d: Date): string   // d.toISOString().slice(0, 10); inverso de new Date('YYYY-MM-DD')
  ```

- [ ] Crear rama: `git checkout -b consolidacion-datos`.
- [ ] El plan ya está en el repo (`docs/superpowers/plans/2026-09-21-consolidacion-datos.md`, commit 630c537); si se corrige durante la ejecución, commit "Ajustar el plan de consolidación".
- [ ] En `src/lib/finance/fechas.test.ts`, sustituir la línea de import por:

```ts
import { diasHasta, fechaTxISO, finMesAnterior, parseFechaLocal, toFechaISO } from './fechas';
```

  y añadir al final del archivo:

```ts
describe('toFechaISO', () => {
  it('formatea una fecha local como YYYY-MM-DD con getters locales', () => {
    expect(toFechaISO(new Date(2026, 7, 8))).toBe('2026-08-08');
    expect(toFechaISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
  it('es el inverso de parseFechaLocal', () => {
    expect(toFechaISO(parseFechaLocal('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('fechaTxISO', () => {
  it('es el inverso exacto de new Date("YYYY-MM-DD") (Transaction.fecha, medianoche UTC)', () => {
    expect(fechaTxISO(new Date('2026-08-08'))).toBe('2026-08-08');
    expect(fechaTxISO(new Date('2026-01-01'))).toBe('2026-01-01');
  });
});
```

- [ ] `npx vitest run src/lib/finance/fechas.test.ts` → falla (`toFechaISO` no existe).
- [ ] Añadir al final de `src/lib/finance/fechas.ts`:

```ts
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date local → 'YYYY-MM-DD' con getters locales (parser de importación, próximos pagos, "hoy"). */
export const toFechaISO = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Transaction.fecha se crea con new Date('YYYY-MM-DD') (medianoche UTC, queries.ts:44);
 * este es su inverso exacto para escribirla de vuelta a BD. No usar con fechas locales.
 */
export const fechaTxISO = (d: Date): string => d.toISOString().slice(0, 10);
```

- [ ] `npx vitest run src/lib/finance/fechas.test.ts` → verde.
- [ ] En `src/lib/finance/alerts.ts`: añadir tras `import { groupAnnualPayments, isAnnualCategory } from './annualPayments';` la línea `import { toFechaISO } from './fechas';`; borrar la línea `const isoDay = (d: Date) => \`${d.getFullYear()}-…\`;`; en `annualPaymentAlerts` sustituir `key: \`pago_anual:${g.id}:${isoDay(due)}\`` por `key: \`pago_anual:${g.id}:${toFechaISO(due)}\``.
- [ ] `npx vitest run src/lib/finance/alerts.test.ts` → verde (misma clave).
- [ ] Commit: `git add src/lib/finance/fechas.ts src/lib/finance/fechas.test.ts src/lib/finance/alerts.ts && git commit -m "Helpers toFechaISO y fechaTxISO con tests; alertas los usan" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 0.2: Borrar `useIsMobile` muerto en Dashboard, Transacciones y TransactionsManager

**Files**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/pages/Transacciones.tsx`
- Modify: `src/components/TransactionsManager.tsx`
- Test: ninguno (JSX; verificación manual)

**Interfaces**
- Ninguna nueva. `Responsive` (`src/components/Responsive.tsx`) garantiza que estas páginas solo se renderizan con `isMobile === false`.

- [ ] `src/pages/Transacciones.tsx`: borrar `import { useIsMobile } from '@/hooks/use-mobile';` y `const isMobile = useIsMobile();`. Sustituir la línea

```tsx
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-2 items-start' : 'justify-end gap-2'}`}>
```
  por
```tsx
        <div className="flex items-center justify-end gap-2">
```

- [ ] `src/components/Dashboard.tsx`: borrar `import { useIsMobile } from '@/hooks/use-mobile';` y `const isMobile = useIsMobile();`. Luego tres sustituciones localizadas por contenido:
  1. El bloque
  ```tsx
        {/* 1. GRÁFICA DE INGRESOS VS GASTOS - ÚLTIMOS 12 MESES CON MEDIAS */}
        {!isMobile ? (
          <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
  ```
  pasa a
  ```tsx
        {/* 1. GRÁFICA DE INGRESOS VS GASTOS - ÚLTIMOS 12 MESES CON MEDIAS */}
        <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
  ```
  2. Borrar íntegro el `else` de ese ternario: desde la línea `      ) : (` que sigue al `</Card>` de esa Card hasta `      )}` inclusive (contiene `<Card className="border-primary/20">` con `Media últimos 12 meses · {selectedCurrency}` y las dos columnas Ingreso/Gasto). Tras el borrado debe quedar `</Card>` seguido de una línea en blanco y el comentario `{/* DONUT CHART + SAVINGS RATE */}`.
  3. Borrar la línea `      {!isMobile && <>` (justo antes de `{/* DONUT CHART + SAVINGS RATE */}`) y la línea `      </>}` (justo antes de `{/* 4. ACTIVOS */}`), dejando su contenido.

- [ ] `src/components/TransactionsManager.tsx`: borrar `import { useIsMobile } from '@/hooks/use-mobile';` y `const isMobile = useIsMobile();`. Cinco guards, en orden de aparición dentro del `<div className="grid grid-cols-1 md:grid-cols-2 …">` de filtros:
  1. `{!isMobile && (<div>` + `<Label htmlFor="filter-cuenta">Cuenta</Label>` → `<div>` + la Label; el cierre `</div>)}` que precede a la línea en blanco antes de `{!isMobile && (() => {` → `</div>`.
  2. `{!isMobile && (() => {` (bloque Tarjetahabiente) → `{(() => {`; su cierre `})()}` no cambia.
  3. `{!isMobile && (<div>` + `<Label htmlFor="filter-mes">Mes</Label>` → `<div>` + la Label; su cierre es la línea `            </div>)}{!isMobile && (` → `            </div>` (esto abre también el guard 4).
  4. Guard Categoría: tras el cambio anterior queda `<div>` + `<Label htmlFor="filter-categoria">Categoría</Label>`; su cierre `            </div>)}` (justo antes de `{!isMobile && (<>`) → `            </div>`.
  5. `            {!isMobile && (<>` (antes de `<Label htmlFor="filter-tipo">Tipo</Label>`) → borrar la línea; `            </>)}` (antes de `          </div>` que cierra el grid) → borrar la línea.

- [ ] `grep -rn "useIsMobile" src` → solo `src/hooks/use-mobile.tsx`, `src/components/Responsive.tsx` y `src/components/ui/sidebar.tsx`.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio): `#/dashboard` muestra la Card "Ingresos vs Gastos - Últimos 12 Meses", la dona y el resto igual que antes; `#/transacciones` muestra los tres botones alineados a la derecha y los filtros Cuenta, Tarjetahabiente, Buscar, Mes, Categoría, Tipo, Reembolsos.
- [ ] Commit: `git add src/components/Dashboard.tsx src/pages/Transacciones.tsx src/components/TransactionsManager.tsx && git commit -m "Quitar useIsMobile muerto de las páginas de escritorio" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 0.3: Borrar tipos de `financial_health_history` y la frase de `docs/index.md`

**Files**
- Modify: `src/integrations/supabase/types.ts` (bloque `financial_health_history: { … }` con `Row`/`Insert`/`Update`/`Relationships: []` y su llave de cierre `}`)
- Modify: `docs/index.md` (línea "Net Worth History")

**Interfaces**
- Ninguna. `grep -rn "financial_health_history" src supabase/migrations` solo devuelve `types.ts` y la migración de borrado.

- [ ] **Esperar confirmación del usuario** de que ejecutó `supabase/migrations/20260921120000_drop_financial_health_history.sql` en el SQL Editor. No continuar sin ella.
- [ ] En `src/integrations/supabase/types.ts` borrar el bloque completo que empieza en `      financial_health_history: {` y termina en la línea `      }` que sigue a `        Relationships: []` de ese bloque (los tres sub-bloques `Row`, `Insert`, `Update` contienen `ahorro_score`, `liquidez_score`, `rendimiento_inversiones_score`…). El bloque siguiente (`inversiones:` o el que corresponda) queda intacto.
- [ ] En `docs/index.md`, en la línea que empieza por `- **Net Worth History**`, borrar la frase final ` Table financial_health_history is unused.` (dejando el punto tras "user request").
- [ ] `grep -rn "financial_health_history" src docs/index.md` → sin resultados (la spec, el plan y el changelog sí la mencionan; es esperado). `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Commit: `git add src/integrations/supabase/types.ts docs/index.md && git commit -m "Borrar los tipos de la tabla financial_health_history" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 0.4: Changelog 7.3 + build + verificación manual

**Files**
- Modify: `src/components/Changelog.tsx` (array `changelog`, primera entrada)

- [ ] Insertar al principio del array `changelog` (antes de `{ version: '7.2', …`):

```tsx
  {
    version: '7.3',
    date: 'Septiembre 2026',
    changes: [
      { icon: <Sparkles className="h-4 w-4" />, text: 'Limpieza interna: se retira código de la antigua detección móvil en las páginas de escritorio y la tabla financial_health_history, que nada usaba', type: 'improvement' },
      { icon: <Shield className="h-4 w-4" />, text: 'Helpers de fecha (local y UTC) con tests para escribir fechas a la base de datos sin desfases', type: 'improvement' },
    ],
  },
```

- [ ] `npx vitest run` → verde. `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npm run build` → sin errores.
- [ ] Verificación manual: `#/dashboard` (escritorio) y `#/transacciones` se ven igual que en 7.2; el pie del sidebar dice `v7.3`; en 390×844 `#/dashboard` sigue mostrando el Resumen móvil.
- [ ] Commit: `git add src/components/Changelog.tsx && git commit -m "Changelog 7.3" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

## Fase 1 — Caché única con TanStack Query (versión 7.4)

### Task 1.1: `queryKeys.ts` y re-export desde `useFinanceDataSupabase`

**Files**
- Create: `src/lib/finance/queryKeys.ts`
- Modify: `src/hooks/useFinanceDataSupabase.ts` (líneas 17-26: `financeQueryKeys` y `STALE_TIME`)

**Interfaces**
- Produces:
  ```ts
  export const financeQueryKeys: (userId: string | undefined) => {
    cuentas; categorias; transacciones; subscriptions; perfil; pendientes; inversiones; tiposInversion;
    reglas; criptomonedas; criptoPrecios; paymentSkips; alertDismissals   // cada una: readonly ['finance', string | undefined, '<x>']
  }
  export const EXCHANGE_RATES_KEY: readonly ['exchange-rates']
  export const STALE_TIME: number   // 5 * 60 * 1000
  ```
- `useFinanceDataSupabase.ts` sigue exportando `financeQueryKeys` (lo importa `useSubscriptionServices.ts`).

- [ ] Crear `src/lib/finance/queryKeys.ts`:

```ts
/**
 * Claves de caché de TanStack Query. Prefijadas por usuario para que un cambio
 * de sesión no reutilice datos ajenos (signOut hace queryClient.clear()).
 */
export const financeQueryKeys = (userId: string | undefined) => ({
  cuentas: ['finance', userId, 'cuentas'] as const,
  categorias: ['finance', userId, 'categorias'] as const,
  transacciones: ['finance', userId, 'transacciones'] as const,
  subscriptions: ['finance', userId, 'subscriptions'] as const,
  perfil: ['finance', userId, 'perfil'] as const,
  pendientes: ['finance', userId, 'pendientes'] as const,
  inversiones: ['finance', userId, 'inversiones'] as const,
  tiposInversion: ['finance', userId, 'tiposInversion'] as const,
  reglas: ['finance', userId, 'reglas'] as const,
  criptomonedas: ['finance', userId, 'criptomonedas'] as const,
  criptoPrecios: ['finance', userId, 'criptoPrecios'] as const,
  paymentSkips: ['finance', userId, 'paymentSkips'] as const,
  alertDismissals: ['finance', userId, 'alertDismissals'] as const,
});

/** Tipos de cambio: no dependen del usuario. */
export const EXCHANGE_RATES_KEY = ['exchange-rates'] as const;

// Los datos solo cambian desde esta app, así que se consideran frescos un buen rato;
// al volver a la pestaña pasado ese tiempo se refrescan solos.
export const STALE_TIME = 5 * 60 * 1000;
```

- [ ] En `src/hooks/useFinanceDataSupabase.ts` sustituir el bloque

```ts
/** Claves de caché, prefijadas por usuario para que un cambio de sesión no reutilice datos ajenos. */
export const financeQueryKeys = (userId: string | undefined) => ({
  cuentas: ['finance', userId, 'cuentas'] as const,
  categorias: ['finance', userId, 'categorias'] as const,
  transacciones: ['finance', userId, 'transacciones'] as const,
  subscriptions: ['finance', userId, 'subscriptions'] as const,
});

// Los datos solo cambian desde esta app, así que se consideran frescos un buen rato;
// al volver a la pestaña pasado ese tiempo se refrescan solos.
const STALE_TIME = 5 * 60 * 1000;
```
  por
```ts
// Re-export: los hooks que ya importaban las claves desde aquí siguen funcionando.
export { financeQueryKeys };
```
  y añadir `import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';` **arriba, junto a los demás imports** (no en mitad del archivo).

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npx vitest run` → verde.
- [ ] Commit: `git add src/lib/finance/queryKeys.ts src/hooks/useFinanceDataSupabase.ts && git commit -m "Claves de caché en un único módulo queryKeys" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 1.2: `useUserProfile` + `useAppConfig` comparten la query `perfil`; `ProfileEditor` con `useMutation`

**Files**
- Modify: `src/hooks/useUserProfile.ts` (reescritura completa)
- Modify: `src/hooks/useAppConfig.ts` (reescritura completa)
- Modify: `src/components/ProfileEditor.tsx` (imports, hook, `onSubmit`)
- Test: ninguno (hooks; verificación manual)

**Interfaces**
- Consumes: `useAuth().user`, tabla `profiles`.
- Produces (misma forma que hoy):
  ```ts
  useUserProfile(): { profile: UserProfile | null; loading: boolean; refetch: () => Promise<unknown> }
  export const fetchProfile = (userId: string) => Promise<UserProfile>
  useAppConfig(): { config: { currency: CurrencyCode }; configLoaded: boolean; formatCurrency; formatNumber; formatPercent }
  ```
- Consumidores de `useUserProfile`: `Layout.tsx` (`profile`), `ProfileEditor.tsx`. De `useAppConfig`: 18 archivos; usan `config.currency`, `configLoaded` (`MobileCurrencyContext`), `formatCurrency`, `formatNumber`, `formatPercent`.

- [ ] Sustituir el contenido completo de `src/hooks/useUserProfile.ts` por:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export interface UserProfile {
  id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  edad?: number;
  divisa_preferida: string;
  created_at: string;
  updated_at: string;
}

export const fetchProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data as UserProfile;
};

/**
 * Perfil del usuario (tabla profiles). Una sola query `perfil` compartida con
 * useAppConfig; ProfileEditor la invalida al guardar, así la divisa preferida
 * se refleja en toda la app sin recargar.
 */
export const useUserProfile = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: financeQueryKeys(user?.id).perfil,
    queryFn: () => fetchProfile(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: 1,
  });

  return {
    profile: query.data ?? null,
    /** true solo durante la primera carga con sesión (sin sesión, false como antes). */
    loading: !!user && query.isPending,
    refetch: query.refetch,
  };
};
```

- [ ] Sustituir el contenido completo de `src/hooks/useAppConfig.ts` por:

```ts
import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

export type CurrencyCode = 'MXN' | 'USD' | 'EUR';

interface AppConfig {
  currency: CurrencyCode;
}

/**
 * Formatea un número con separador de miles (coma) y decimales (punto)
 * Siempre muestra 2 decimales: 1,234.56
 */
export const formatNumber = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Formatea un porcentaje con el formato estándar
 * Ejemplo: 12.34%
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${formatNumber(value, decimals)}%`;
};

/**
 * Divisa preferida y formateadores. Lee la misma query `perfil` que useUserProfile:
 * una sola petición a profiles por sesión aunque lo monten 18 componentes.
 */
export const useAppConfig = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile();

  const currency = (profile?.divisa_preferida as CurrencyCode | undefined) ?? 'MXN';
  const config: AppConfig = useMemo(() => ({ currency }), [currency]);

  // true cuando la query terminó (con fila o con error: un perfil ausente no
  // debe dejar el móvil en loader infinito); false sin sesión.
  const configLoaded = !!user && !loading;

  const formatCurrency = useCallback(
    (amount: number): string => formatNumber(amount, 2),
    []
  );

  return useMemo(() => ({
    config,
    configLoaded,
    formatCurrency,
    formatNumber,
    formatPercent,
  }), [config, configLoaded, formatCurrency]);
};
```

- [ ] En `src/components/ProfileEditor.tsx`:
  1. Sustituir `import React, { useState } from 'react';` por `import React, { useState } from 'react';\nimport { useMutation, useQueryClient } from '@tanstack/react-query';` y añadir tras `import { useAuth } from '@/contexts/AuthContext';` la línea `import { financeQueryKeys } from '@/lib/finance/queryKeys';`.
  2. Sustituir `const { profile, loading, refetch } = useUserProfile();` por `const { profile, loading } = useUserProfile();` y borrar `const [updating, setUpdating] = useState(false);`.
  3. Sustituir la función `onSubmit` completa (desde `const onSubmit = async (data: ProfileFormData) => {` hasta su `};` que precede a `const onPasswordSubmit`) por:

```ts
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          nombre: data.nombre,
          apellidos: data.apellidos,
          divisa_preferida: data.divisa_preferida,
        })
        .eq('user_id', profile!.user_id);
      if (error) throw error;
    },
    // Invalida `perfil`: useAppConfig (dashboard, informes…) ve la nueva divisa sin recargar.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys(user?.id).perfil }),
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    },
  });
  const updating = updateProfile.isPending;

  const onSubmit = (data: ProfileFormData) => {
    if (!profile) return;
    updateProfile.mutate(data);
  };
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio): login → Red: **una** petición a `profiles` (`read_network_requests` con `urlPattern: "profiles"`); navegar Dashboard → Inversiones → Informes no añade peticiones a `profiles`. En `#/configuracion` cambiar Divisa Preferida a USD y guardar: Red muestra `PATCH …/profiles` y luego `GET …/profiles`; ir a `#/dashboard`: los totales aparecen en USD sin recargar. Volver a MXN. Móvil 390×844: `#/dashboard` carga sin loader infinito.
- [ ] Commit: `git add src/hooks/useUserProfile.ts src/hooks/useAppConfig.ts src/components/ProfileEditor.tsx && git commit -m "Perfil en TanStack Query compartido por useAppConfig y useUserProfile" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 1.3: `usePendings` en TanStack Query

**Files**
- Modify: `src/hooks/usePendings.ts` (reescritura completa)
- Test: ninguno (hook; verificación manual)

**Interfaces**
- Produces (misma forma):
  ```ts
  usePendings(): { pendings: Pending[]; loading: boolean; reload: () => Promise<void>;
    addPending(p: NewPending): Promise<{ error: Error | PostgrestError | null }>;
    updatePending(id, updates: Partial<Pending>): Promise<{ error }>;
    deletePending(id): Promise<{ error }>;
    markAsPaid(opts: { pending: Pending; fechaCobro: Date; montoCobrado: number }): Promise<{ error }>;
    overdueCount: number; activeCount: number; totalPendientePorCobrar: number }
  ```
- Consumidores: `BankStatementImporter.tsx` (`pendings`, `reload`), `Layout.tsx` (`activeCount`, `overdueCount`), `TransactionsManager.tsx` (`pendings`, `addPending`), `MobileLayout.tsx` (`overdueCount`), `PendingsWidget.tsx` (`activeCount`, `overdueCount`, `totalPendientePorCobrar`, `loading`), `Pendientes.tsx` (todo), `PorCobrarMovil.tsx` (`pendings`, `loading`).

- [ ] Sustituir el contenido completo de `src/hooks/usePendings.ts` por:

```ts
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export type PendingTipo = 'reembolso_gasto' | 'ingreso_esperado';
export type PendingEstado = 'pendiente' | 'cobrado_parcial' | 'cobrado' | 'cancelado';

export interface Pending {
  id: string;
  user_id: string;
  transaccion_id: string | null;
  transaccion_cobro_id: string | null;
  tipo: PendingTipo;
  monto_esperado: number;
  monto_cobrado: number;
  divisa: string;
  fecha_esperada: string | null;
  fecha_cobro: string | null;
  estado: PendingEstado;
  concepto: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type NewPending = Omit<Pending, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'monto_cobrado' | 'transaccion_cobro_id' | 'fecha_cobro' | 'estado'> & {
  monto_cobrado?: number;
  estado?: PendingEstado;
};

const EMPTY: Pending[] = [];

const fetchPendings = async (userId: string): Promise<Pending[]> => {
  const { data, error } = await supabase
    .from('transaction_pendings')
    .select('*')
    .eq('user_id', userId)
    .order('fecha_esperada', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Pending[];
};

/**
 * Pendientes de cobro (tabla transaction_pendings) en la caché compartida:
 * una petición por sesión; cada mutación invalida `pendientes`.
 */
export const usePendings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.pendientes,
    queryFn: () => fetchPendings(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const pendings = query.data ?? EMPTY;

  useEffect(() => {
    if (!query.error) return;
    console.error(query.error);
    toast({ title: 'Error', description: 'No se pudieron cargar los pendientes', variant: 'destructive' });
  }, [query.error]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.pendientes });

  const addPending = async (p: NewPending) => {
    if (!user) return { error: new Error('No auth') };
    const { error } = await supabase.from('transaction_pendings').insert([{
      user_id: user.id,
      transaccion_id: p.transaccion_id,
      tipo: p.tipo,
      monto_esperado: p.monto_esperado,
      monto_cobrado: p.monto_cobrado ?? 0,
      divisa: p.divisa,
      fecha_esperada: p.fecha_esperada,
      concepto: p.concepto,
      notas: p.notas,
      estado: p.estado ?? 'pendiente',
    }]);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await invalidate();
    return { error: null };
  };

  const updatePending = async (id: string, updates: Partial<Pending>) => {
    const { error } = await supabase
      .from('transaction_pendings')
      .update(updates)
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await invalidate();
    return { error: null };
  };

  const deletePending = async (id: string) => {
    const { error } = await supabase.from('transaction_pendings').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await invalidate();
    return { error: null };
  };

  /**
   * Marca un pendiente como cobrado SIN crear una transacción.
   * La transacción real llegará al importar el estado de cuenta y podrá vincularse.
   */
  const markAsPaid = async (opts: {
    pending: Pending;
    fechaCobro: Date;
    montoCobrado: number;
  }) => {
    if (!user) return { error: new Error('No auth') };
    const { pending, fechaCobro, montoCobrado } = opts;

    const totalCobrado = (pending.monto_cobrado ?? 0) + montoCobrado;
    const nuevoEstado: PendingEstado = totalCobrado >= pending.monto_esperado ? 'cobrado' : 'cobrado_parcial';

    const { error: updError } = await supabase
      .from('transaction_pendings')
      .update({
        monto_cobrado: totalCobrado,
        fecha_cobro: fechaCobro.toISOString().split('T')[0],
        estado: nuevoEstado,
      })
      .eq('id', pending.id);

    if (updError) {
      toast({ title: 'Error', description: updError.message, variant: 'destructive' });
      return { error: updError };
    }
    await invalidate();
    return { error: null };
  };

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pendings.filter(p =>
      (p.estado === 'pendiente' || p.estado === 'cobrado_parcial') &&
      p.fecha_esperada &&
      new Date(p.fecha_esperada) < today
    ).length;
  }, [pendings]);

  const activeCount = useMemo(
    () => pendings.filter(p => p.estado === 'pendiente' || p.estado === 'cobrado_parcial').length,
    [pendings]
  );

  const totalPendientePorCobrar = useMemo(
    () => pendings
      .filter(p => p.estado === 'pendiente' || p.estado === 'cobrado_parcial')
      .reduce((sum, p) => sum + (p.monto_esperado - (p.monto_cobrado ?? 0)), 0),
    [pendings]
  );

  return {
    pendings,
    loading: !!user && query.isPending,
    /** Vuelve a pedir la lista (lo usa el importador tras vincular pendientes). */
    reload: async () => { await query.refetch(); },
    addPending,
    updatePending,
    deletePending,
    markAsPaid,
    overdueCount,
    activeCount,
    totalPendientePorCobrar,
  };
};
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio): tras login, Red: **una** petición a `transaction_pendings` aunque Layout, PendingsWidget y Pendientes lo monten; navegar entre páginas no repite. En `#/pendientes` crear un pendiente (aparece en la lista sin recargar; contador del sidebar sube), editarlo, marcarlo cobrado y borrarlo: mismos toasts de siempre y la lista/contadores se actualizan solos.
- [ ] Commit: `git add src/hooks/usePendings.ts && git commit -m "usePendings en TanStack Query" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 1.4: `useInvestments` (saldo_cuenta desde la caché de cuentas) + `useInvestmentTypes`

**Files**
- Modify: `src/hooks/useInvestments.ts` (reescritura completa)
- Modify: `src/hooks/useInvestmentTypes.ts` (reescritura completa)
- Test: ninguno (hooks; verificación manual)

**Interfaces**
- Consumes: `useFinanceDataSupabase().accounts` (ya trae `saldoActual = saldoInicial + Σ monto`, `calculations.ts`).
- Produces (misma forma):
  ```ts
  useInvestments(): { investments: Investment[]; valuations: InvestmentValuation[]; payouts: InvestmentPayout[]; loading: boolean;
    saveInvestment(values: Partial<Investment>, id?: string): Promise<boolean>; deleteInvestment(id): Promise<boolean>;
    addValuation(inversionId, values): Promise<boolean>; deleteValuation(id): Promise<boolean>;
    addPayout(inversionId, values): Promise<boolean>; deletePayout(id): Promise<boolean>; refresh: () => Promise<void> }
  useInvestmentTypes(): { types: InvestmentType[]; loading: boolean; createType(values): Promise<boolean>; updateType(id, values): Promise<boolean>; deleteType(id): Promise<boolean>; refreshTypes: () => Promise<void> }
  ```
- Consumidores: `Inversiones.tsx`, `InversionesMovil.tsx`, `InvestmentTypesManager.tsx` (`const ok = editing ? await updateType(...) : await createType(form)`).

- [ ] Sustituir el contenido completo de `src/hooks/useInvestments.ts` por:

```ts
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { Investment, InvestmentPayout, InvestmentValuation } from '@/types/investments';

interface InvestmentsData {
  investments: Investment[];
  valuations: InvestmentValuation[];
  payouts: InvestmentPayout[];
}

const EMPTY_INVESTMENTS: Investment[] = [];
const EMPTY_VALUATIONS: InvestmentValuation[] = [];
const EMPTY_PAYOUTS: InvestmentPayout[] = [];

/** Las tres tablas en una sola queryFn: se invalidan juntas (clave `inversiones`). */
const fetchInvestments = async (userId: string): Promise<InvestmentsData> => {
  const [inv, val, pay] = await Promise.all([
    supabase.from('inversiones').select('*').eq('user_id', userId).order('nombre'),
    supabase.from('investment_valuations').select('*').eq('user_id', userId).order('fecha', { ascending: true }),
    supabase.from('investment_payouts').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
  ]);
  if (inv.error) throw inv.error;
  if (val.error) throw val.error;
  if (pay.error) throw pay.error;
  return {
    investments: (inv.data || []) as unknown as Investment[],
    valuations: (val.data || []) as unknown as InvestmentValuation[],
    payouts: (pay.data || []) as unknown as InvestmentPayout[],
  };
};

export const useInvestments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // saldo_cuenta sale de la caché de cuentas (saldoActual), no de consultas propias:
  // se refresca sola al importar y ahorra dos peticiones.
  const { accounts, loading: accountsLoading } = useFinanceDataSupabase();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.inversiones,
    queryFn: () => fetchInvestments(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });

  useEffect(() => {
    if (!query.error) return;
    console.error('Error loading investments:', query.error);
    toast({ title: 'Error', description: 'No se pudieron cargar las inversiones', variant: 'destructive' });
  }, [query.error, toast]);

  const valuations = query.data?.valuations ?? EMPTY_VALUATIONS;
  const payouts = query.data?.payouts ?? EMPTY_PAYOUTS;

  const investments = useMemo(() => {
    const raw = query.data?.investments ?? EMPTY_INVESTMENTS;
    const saldoPorCuenta = new Map(accounts.map((a) => [a.id, a.saldoActual]));
    return raw.map((i) => {
      const lastVal = valuations
        .filter((v) => v.inversion_id === i.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-1)[0];
      const saldoCuenta = i.cuenta_id ? saldoPorCuenta.get(i.cuenta_id) : undefined;
      const valor =
        lastVal?.valor ??
        (saldoCuenta !== undefined ? saldoCuenta : i.valor_actual || i.monto_invertido || 0);
      return { ...i, saldo_cuenta: saldoCuenta ?? null, valor_actual: valor } as Investment;
    });
  }, [query.data, accounts, valuations]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.inversiones });

  const saveInvestment = async (values: Partial<Investment>, id?: string) => {
    if (!user) return false;
    const payload = {
      user_id: user.id,
      nombre: values.nombre || '',
      tipo: values.tipo || 'Otros',
      tipo_id: values.tipo_id ?? null,
      monto_invertido: values.monto_invertido ?? 0,
      valor_actual: values.valor_actual ?? values.monto_invertido ?? 0,
      tasa_anual: values.tasa_anual ?? null,
      rendimiento_bruto: values.rendimiento_bruto ?? null,
      rendimiento_neto: values.rendimiento_neto ?? null,
      modalidad: values.modalidad_pago || values.modalidad || 'Reinversión',
      modalidad_pago: values.modalidad_pago ?? null,
      moneda: values.moneda || 'MXN',
      fecha_inicio: values.fecha_inicio || new Date().toISOString().slice(0, 10),
      fecha_vencimiento: values.fecha_vencimiento ?? null,
      cuenta_id: values.cuenta_id ?? null,
      beneficio_estimado: values.beneficio_estimado ?? null,
      notas: values.notas ?? null,
      activa: values.activa ?? true,
    };

    const { error } = id
      ? await supabase.from('inversiones').update(payload).eq('id', id)
      : await supabase.from('inversiones').insert(payload);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const deleteInvestment = async (id: string) => {
    const { error } = await supabase.from('inversiones').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const addValuation = async (
    inversionId: string,
    values: { fecha: string; valor: number; aportacion?: number; retiro?: number; notas?: string },
  ) => {
    if (!user) return false;
    const { error } = await supabase.from('investment_valuations').upsert(
      {
        user_id: user.id,
        inversion_id: inversionId,
        fecha: values.fecha,
        valor: values.valor,
        aportacion: values.aportacion ?? 0,
        retiro: values.retiro ?? 0,
        notas: values.notas ?? null,
      },
      { onConflict: 'inversion_id,fecha' },
    );
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await supabase.from('inversiones').update({ valor_actual: values.valor }).eq('id', inversionId);
    await invalidate();
    return true;
  };

  const deleteValuation = async (id: string) => {
    const { error } = await supabase.from('investment_valuations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const addPayout = async (
    inversionId: string,
    values: { fecha: string; monto: number; divisa: string; reinvertido?: boolean; notas?: string },
  ) => {
    if (!user) return false;
    const { error } = await supabase.from('investment_payouts').insert({
      user_id: user.id,
      inversion_id: inversionId,
      fecha: values.fecha,
      monto: values.monto,
      divisa: values.divisa,
      reinvertido: values.reinvertido ?? false,
      notas: values.notas ?? null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await supabase.from('inversiones').update({ ultimo_pago: values.fecha }).eq('id', inversionId);
    await invalidate();
    return true;
  };

  const deletePayout = async (id: string) => {
    const { error } = await supabase.from('investment_payouts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  return {
    investments,
    valuations,
    payouts,
    loading: (!!user && query.isPending) || accountsLoading,
    saveInvestment,
    deleteInvestment,
    addValuation,
    deleteValuation,
    addPayout,
    deletePayout,
    refresh: invalidate,
  };
};
```

- [ ] Sustituir el contenido completo de `src/hooks/useInvestmentTypes.ts` por:

```ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { InvestmentType } from '@/types/investments';

const EMPTY: InvestmentType[] = [];

const fetchTypes = async (userId: string): Promise<InvestmentType[]> => {
  const { data, error } = await supabase
    .from('investment_types')
    .select('*')
    .eq('user_id', userId)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as InvestmentType[];
};

export const useInvestmentTypes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.tiposInversion,
    queryFn: () => fetchTypes(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const types = query.data ?? EMPTY;

  useEffect(() => {
    if (!query.error) return;
    console.error('Error loading investment types:', query.error);
    toast({ title: 'Error', description: 'No se pudieron cargar los tipos de inversión', variant: 'destructive' });
  }, [query.error, toast]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.tiposInversion });

  const createType = async (values: Partial<InvestmentType>) => {
    if (!user) return false;
    const { error } = await supabase.from('investment_types').insert({
      user_id: user.id,
      nombre: values.nombre || '',
      comportamiento: values.comportamiento || 'valuacion_manual',
      permite_reinversion: values.permite_reinversion ?? false,
      requiere_vencimiento: values.requiere_vencimiento ?? false,
      orden: values.orden ?? types.length + 1,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const updateType = async (id: string, values: Partial<InvestmentType>) => {
    const { error } = await supabase.from('investment_types').update(values).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const deleteType = async (id: string) => {
    const { error } = await supabase.from('investment_types').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  return { types, loading: !!user && query.isPending, createType, updateType, deleteType, refreshTypes: invalidate };
};
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio, `#/inversiones`): Red muestra `inversiones`, `investment_valuations`, `investment_payouts` e `investment_types` **una vez** y **ninguna** petición nueva a `cuentas` ni `transacciones` (ya estaban en caché). Las inversiones con cuenta vinculada muestran el mismo "Saldo cuenta" que en 7.3. Crear una inversión, añadir una valuación, un pago, borrarlos, crear/editar/borrar un tipo: la lista se actualiza sola y los toasts son los mismos. Salir a Dashboard y volver: sin nuevas peticiones. Móvil 390×844 `#/inversiones`: mismos importes.
- [ ] Commit: `git add src/hooks/useInvestments.ts src/hooks/useInvestmentTypes.ts && git commit -m "Inversiones y tipos en TanStack Query; saldo de cuenta desde la caché" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

<!-- FIN PARTE 1/4 -->

<!-- PARTE 2/4 -->

### Task 1.5: `useClassificationRules` + `usePaymentSkips`

**Files**
- Modify: `src/hooks/useClassificationRules.ts` (reescritura completa; `findMatchingRule` se mantiene igual hasta la fase 4)
- Modify: `src/hooks/usePaymentSkips.ts` (reescritura completa)
- Test: ninguno (hooks; verificación manual)

**Interfaces**
- Produces (misma forma):
  ```ts
  useClassificationRules(): { rules: ClassificationRule[]; loading: boolean;
    addRule(rule): Promise<PostgrestError | null | undefined>; updateRule(id, updates): Promise<…>; deleteRule(id): Promise<…>;
    findMatchingRule(description, amount?, accountId?): string | null; refreshRules: () => Promise<void> }
  usePaymentSkips(): { skips: PaymentSkip[]; loading: boolean; addSkip(categoria_id, year, month, razon?): Promise<void>;
    removeSkip(categoria_id, year, month): Promise<void>; findSkip(categoria_id, year, month): PaymentSkip | undefined; reload: () => Promise<void> }
  ```
- Consumidores: `ReglasClasificacion.tsx` (`rules, loading, addRule, updateRule, deleteRule`), `BankStatementImporter.tsx` (`findMatchingRule`), `MonthlyPaymentsControl.tsx` (`skips, addSkip, removeSkip, findSkip`; no usa el valor devuelto por `addSkip`).

- [ ] Sustituir el contenido completo de `src/hooks/useClassificationRules.ts` por:

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClassificationMatchType, matchesClassificationRule } from '@/lib/classificationRules';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export interface ClassificationRule {
  id: string;
  user_id: string;
  name: string | null;
  keyword: string;
  match_type: ClassificationMatchType;
  category_id: string;
  cuenta_id: string | null;
  priority: number;
  active: boolean;
  amount_min: number | null;
  amount_max: number | null;
  created_at: string;
  updated_at: string;
}

const EMPTY: ClassificationRule[] = [];

const fetchRules = async (userId: string): Promise<ClassificationRule[]> => {
  const { data, error } = await supabase
    .from('classification_rules' as any)
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false });
  if (error) {
    console.error('[ClassificationRules] Error:', error);
    throw error;
  }
  return (data ?? []) as any as ClassificationRule[];
};

export function useClassificationRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.reglas,
    queryFn: () => fetchRules(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const rules = query.data ?? EMPTY;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.reglas });

  const addRule = async (rule: Omit<ClassificationRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .insert({ ...rule, user_id: user.id } as any);
    if (!error) await invalidate();
    return error;
  };

  const updateRule = async (id: string, updates: Partial<ClassificationRule>) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .update(updates as any)
      .eq('id', id);
    if (!error) await invalidate();
    return error;
  };

  const deleteRule = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .delete()
      .eq('id', id);
    if (!error) await invalidate();
    return error;
  };

  const findMatchingRule = (description: string, amount?: number, accountId?: string): string | null => {
    // Rules are already sorted by priority desc
    for (const rule of rules) {
      if (!rule.active) continue;

      if (!matchesClassificationRule(description, rule.keyword, rule.match_type)) continue;

      // Account filter — if rule specifies an account, it must match
      if (rule.cuenta_id !== null && accountId !== undefined && rule.cuenta_id !== accountId) continue;
      if (rule.cuenta_id !== null && accountId === undefined) continue;

      // Amount filters are AND conditions — both keyword AND amount must match
      if (rule.amount_min !== null && amount !== undefined && amount < rule.amount_min) continue;
      if (rule.amount_max !== null && amount !== undefined && amount > rule.amount_max) continue;
      // If rule has amount filters but no amount provided, skip this rule
      if ((rule.amount_min !== null || rule.amount_max !== null) && amount === undefined) continue;

      return rule.category_id;
    }
    return null;
  };

  return { rules, loading: !!user && query.isPending, addRule, updateRule, deleteRule, findMatchingRule, refreshRules: invalidate };
}
```

- [ ] Sustituir el contenido completo de `src/hooks/usePaymentSkips.ts` por:

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export interface PaymentSkip {
  id: string;
  categoria_id: string;
  year: number;
  month: number; // 1-12
  razon: string | null;
}

const EMPTY: PaymentSkip[] = [];

const fetchSkips = async (userId: string): Promise<PaymentSkip[]> => {
  const { data, error } = await (supabase as any)
    .from('payment_skips')
    .select('id, categoria_id, year, month, razon')
    .eq('user_id', userId);
  if (error) throw error;
  return (data as PaymentSkip[]) || [];
};

export const usePaymentSkips = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.paymentSkips,
    queryFn: () => fetchSkips(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const skips = query.data ?? EMPTY;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.paymentSkips });

  const addSkip = async (categoria_id: string, year: number, month: number, razon?: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('payment_skips')
      .upsert(
        { user_id: user.id, categoria_id, year, month, razon: razon || null },
        { onConflict: 'user_id,categoria_id,year,month' }
      );
    if (!error) await invalidate();
  };

  const removeSkip = async (categoria_id: string, year: number, month: number) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('payment_skips')
      .delete()
      .eq('user_id', user.id)
      .eq('categoria_id', categoria_id)
      .eq('year', year)
      .eq('month', month);
    if (!error) await invalidate();
  };

  const findSkip = (categoria_id: string, year: number, month: number) =>
    skips.find(s => s.categoria_id === categoria_id && s.year === year && s.month === month);

  return { skips, loading: !!user && query.isPending, addSkip, removeSkip, findSkip, reload: invalidate };
};
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio): `#/reglas-clasificacion`: Red muestra `classification_rules` una vez; crear, editar (toggle activo) y borrar una regla actualiza la lista sola. `#/dashboard` → control de pagos mensuales: "omitir" un mes crea el skip y la fila cambia sin recargar; quitar la omisión la revierte; Red muestra `payment_skips` una vez al cargar y una vez tras cada cambio.
- [ ] Commit: `git add src/hooks/useClassificationRules.ts src/hooks/usePaymentSkips.ts && git commit -m "Reglas de clasificación y omisiones de pago en TanStack Query" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 1.6: `useCriptomonedas` (query dependiente de precios) + `useExchangeRates`

**Files**
- Modify: `src/hooks/useCriptomonedas.ts` (reescritura completa)
- Modify: `src/hooks/useExchangeRates.ts` (reescritura completa)
- Test: ninguno (hooks; verificación manual)

**Interfaces**
- Produces (misma forma):
  ```ts
  useCriptomonedas(): { criptomonedas: CryptoWithPrice[]; loading: boolean; precios: CryptoPrices;
    addCriptomoneda(cripto): Promise<Criptomoneda | undefined>; updateCriptomoneda(id, updates): Promise<void>; deleteCriptomoneda(id): Promise<void>; refetch: () => Promise<void> }
  useExchangeRates(): { rates: ExchangeRates; loading: boolean; error: string | null;
    convertCurrency(amount, from: 'MXN'|'USD'|'EUR', to: 'MXN'|'USD'|'EUR'): number; refreshRates: () => Promise<void> }
  ```
- Consumidores de `useCriptomonedas`: `CriptomonedasManager.tsx` (`criptomonedas, loading, add/update/delete`), `Inversiones.tsx` (`criptomonedas`). De `useExchangeRates`: 11 archivos, todos solo `convertCurrency`.
- Cambio visible declarado: `CriptomonedasManager` muestra spinner durante la primera carga.

- [ ] Sustituir el contenido completo de `src/hooks/useCriptomonedas.ts` por:

```ts
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useToast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { Criptomoneda, CryptoPrices, CryptoWithPrice } from '@/types/crypto';

const EMPTY_CRIPTOS: Criptomoneda[] = [];
const EMPTY_PRECIOS: CryptoPrices = {};

const fetchCriptomonedas = async (): Promise<Criptomoneda[]> => {
  const { data, error } = await supabase
    .from('criptomonedas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Criptomoneda[];
};

const fetchPrecios = async (symbols: string[]): Promise<CryptoPrices> => {
  const { data, error } = await supabase.functions.invoke('crypto-prices', { body: { symbols } });
  if (error) throw error;
  return (data ?? {}) as CryptoPrices;
};

/**
 * Criptomonedas del usuario más sus precios actuales. La query de precios
 * depende de la lista (símbolos en la clave): añadir una cripto vuelve a pedirlos.
 */
export const useCriptomonedas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { convertCurrency } = useExchangeRates();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const criptosQuery = useQuery({
    queryKey: QK.criptomonedas,
    queryFn: fetchCriptomonedas,
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const criptos = criptosQuery.data ?? EMPTY_CRIPTOS;

  const simbolos = useMemo(() => [...new Set(criptos.map(c => c.simbolo))].sort(), [criptos]);

  const preciosQuery = useQuery({
    queryKey: [...QK.criptoPrecios, simbolos.join(',')],
    queryFn: () => fetchPrecios(simbolos),
    staleTime: STALE_TIME,
    retry: 1,
    enabled: !!user && simbolos.length > 0,
  });
  const precios = preciosQuery.data ?? EMPTY_PRECIOS;

  useEffect(() => {
    if (!criptosQuery.error) return;
    console.error('Error fetching criptomonedas:', criptosQuery.error);
    toast({ title: "Error", description: "No se pudieron cargar las criptomonedas", variant: "destructive" });
  }, [criptosQuery.error, toast]);

  useEffect(() => {
    if (!preciosQuery.error) return;
    console.error('Error fetching crypto prices:', preciosQuery.error);
    toast({ title: "Advertencia", description: "No se pudieron obtener los precios actuales", variant: "destructive" });
  }, [preciosQuery.error, toast]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.criptomonedas });

  const addCriptomoneda = async (cripto: Omit<Criptomoneda, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('criptomonedas')
        .insert([{ ...cripto, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      await invalidate();
      return data as Criptomoneda;
    } catch (error) {
      console.error('Error adding criptomoneda:', error);
      toast({ title: "Error", description: "No se pudo agregar la criptomoneda", variant: "destructive" });
      throw error;
    }
  };

  const updateCriptomoneda = async (id: string, updates: Partial<Criptomoneda>) => {
    try {
      const { error } = await supabase.from('criptomonedas').update(updates).eq('id', id);
      if (error) throw error;
      await invalidate();
    } catch (error) {
      console.error('Error updating criptomoneda:', error);
      toast({ title: "Error", description: "No se pudo actualizar la criptomoneda", variant: "destructive" });
      throw error;
    }
  };

  const deleteCriptomoneda = async (id: string) => {
    try {
      const { error } = await supabase.from('criptomonedas').delete().eq('id', id);
      if (error) throw error;
      await invalidate();
    } catch (error) {
      console.error('Error deleting criptomoneda:', error);
      toast({ title: "Error", description: "No se pudo eliminar la criptomoneda", variant: "destructive" });
      throw error;
    }
  };

  // Lista enriquecida con precios actuales y valores en USD
  const criptomonedas: CryptoWithPrice[] = useMemo(() => criptos.map(cripto => {
    const precioActual = precios[cripto.simbolo]?.price;

    // Convertir precio de compra a USD si está en EUR
    const precioCompraUSD = cripto.divisa_compra === 'EUR'
      ? convertCurrency(cripto.precio_compra, 'EUR', 'USD')
      : cripto.precio_compra;

    const valorCompraUSD = cripto.cantidad * precioCompraUSD;
    const valorActual = precioActual ? cripto.cantidad * precioActual : undefined;
    const gananciaPerdida = valorActual ? valorActual - valorCompraUSD : undefined;
    const gananciaPerdidaPorcentaje = gananciaPerdida && valorCompraUSD > 0
      ? (gananciaPerdida / valorCompraUSD) * 100
      : undefined;

    return {
      ...cripto,
      precio_actual_usd: precioActual,
      precio_compra_usd: precioCompraUSD,
      valor_compra_usd: valorCompraUSD,
      valor_actual_usd: valorActual,
      ganancia_perdida_usd: gananciaPerdida,
      ganancia_perdida_porcentaje: gananciaPerdidaPorcentaje,
    };
  }), [criptos, precios, convertCurrency]);

  return {
    criptomonedas,
    loading: !!user && criptosQuery.isPending,
    precios,
    addCriptomoneda,
    updateCriptomoneda,
    deleteCriptomoneda,
    refetch: invalidate,
  };
};
```

- [ ] Sustituir el contenido completo de `src/hooks/useExchangeRates.ts` por:

```ts
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EXCHANGE_RATES_KEY, STALE_TIME } from '@/lib/finance/queryKeys';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  MXN: number;
}

const DEFAULT_RATES: ExchangeRates = { USD: 20, EUR: 22, MXN: 1 };

/** Devuelve DEFAULT_RATES si la API falla: la app nunca se queda sin tasas. */
async function fetchRatesFromAPI(): Promise<ExchangeRates> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/MXN');
    if (!response.ok) throw new Error('Error al obtener las tasas de cambio');
    const data = await response.json();
    return {
      MXN: 1,
      USD: 1 / data.rates.USD,
      EUR: 1 / data.rates.EUR,
    };
  } catch {
    return DEFAULT_RATES;
  }

}

/**
 * Tasas MXN↔USD/EUR en la caché de TanStack Query (clave sin usuario): una sola
 * petición para toda la app, fresca 5 min y refrescada cada 5 min mientras haya
 * algún componente montado. Sustituye al singleton cachedRates/fetchPromise.
 */
export const useExchangeRates = () => {
  const query = useQuery({
    queryKey: EXCHANGE_RATES_KEY,
    queryFn: fetchRatesFromAPI,
    staleTime: STALE_TIME,
    // Sin refetchInterval: cada observador (11 archivos + useFinanceDataSupabase) crearía su propio
    // intervalo. staleTime + refetchOnWindowFocus (por defecto) ya refresca al volver a la pestaña.
    retry: false,
  });
  const rates = query.data ?? DEFAULT_RATES;

  const convertCurrency = useCallback(
    (amount: number, fromCurrency: 'MXN' | 'USD' | 'EUR', toCurrency: 'MXN' | 'USD' | 'EUR'): number => {
      if (fromCurrency === toCurrency) return amount;
      const amountInMXN = fromCurrency !== 'MXN' ? amount * rates[fromCurrency] : amount;
      return toCurrency === 'MXN' ? amountInMXN : amountInMXN / rates[toCurrency];
    },
    [rates]
  );

  const refreshRates = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  return {
    rates,
    loading: query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Error desconocido') : null,
    convertCurrency,
    refreshRates,
  };
};
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio): tras login, Red: **una** petición a `api.exchangerate-api.com` aunque haya 5 componentes con `useExchangeRates`. `#/inversiones` → pestaña Criptomonedas: aparece el spinner y luego la lista con precios; Red: `criptomonedas` una vez y `crypto-prices` una vez. Añadir una cripto con símbolo nuevo: la lista se actualiza y Red muestra una nueva llamada a `crypto-prices` con el símbolo; editar y borrar: lista al día, mismos toasts.
- [ ] Commit: `git add src/hooks/useCriptomonedas.ts src/hooks/useExchangeRates.ts && git commit -m "Criptomonedas, precios y tipos de cambio en TanStack Query" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 1.7: `useAlerts` con `alertDismissals` en `financeQueryKeys` y `useMutation`

**Files**
- Modify: `src/hooks/useAlerts.ts` (reescritura completa; la query de suscripciones se unifica en la Task 2.6)
- Test: ninguno (hook; verificación manual)

**Interfaces**
- Produces (misma forma): `useAlerts(): { alerts: Alert[]; dismissedAlerts: Alert[]; count: number; loading: boolean; dismiss: (a: Alert) => void; restore: (a: Alert) => void }`.
- Consumidores: `Layout.tsx` (`count`), `Alertas.tsx` (`alerts, dismissedAlerts, loading, dismiss, restore` — `onAction: (a: Alert) => void`).

- [ ] Sustituir el contenido completo de `src/hooks/useAlerts.ts` por:

```ts
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceDataSupabase } from './useFinanceDataSupabase';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { Alert, computeAlerts, SubscriptionForAlerts } from '@/lib/finance/alerts';

// Temporal hasta la fase 2: useSubscriptionServices aún filtra active y tiene staleTime 0.
const fetchSubscriptions = async (): Promise<SubscriptionForAlerts[]> => {
  const { data, error } = await supabase
    .from('subscription_services')
    .select('id, service_name, active, original_comments');
  if (error) throw error;
  return (data ?? []).map(s => ({
    id: s.id,
    serviceName: s.service_name,
    active: s.active,
    originalComments: s.original_comments ?? [],
  }));
};

const fetchDismissals = async (): Promise<string[]> => {
  const { data, error } = await supabase.from('alert_dismissals').select('alert_key');
  if (error) throw error;
  return (data ?? []).map(d => d.alert_key);
};

/** Misma clave que usa AnnualPaymentsTracker para los pagos marcados inactivos. */
const readInactiveAnnual = (): Set<string> => {
  try {
    const saved = localStorage.getItem('inactive_annual_payments');
    return new Set(saved ? (JSON.parse(saved) as string[]) : []);
  } catch {
    return new Set();
  }
};

/**
 * Alertas calculadas en cliente (pagos anuales próximos, suscripciones que
 * suben, categorías disparadas) menos las descartadas por el usuario.
 */
export const useAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);
  const { categories, transactions, loading: financeLoading } = useFinanceDataSupabase();
  const [inactiveAnnual] = useState(readInactiveAnnual);

  const subscriptionsQuery = useQuery({
    queryKey: ['finance', user?.id, 'subscriptions-for-alerts'],
    queryFn: fetchSubscriptions,
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const dismissalsQuery = useQuery({
    queryKey: QK.alertDismissals,
    queryFn: fetchDismissals,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: 1,
  });

  const allAlerts = useMemo(
    () => computeAlerts({ categories, transactions, subscriptions: subscriptionsQuery.data ?? [], inactiveAnnualIds: inactiveAnnual }),
    [categories, transactions, subscriptionsQuery.data, inactiveAnnual]
  );

  const dismissed = useMemo(() => new Set(dismissalsQuery.data ?? []), [dismissalsQuery.data]);
  const alerts = useMemo(() => allAlerts.filter(a => !dismissed.has(a.key)), [allAlerts, dismissed]);
  const dismissedAlerts = useMemo(() => allAlerts.filter(a => dismissed.has(a.key)), [allAlerts, dismissed]);

  // Optimista: la alerta desaparece/reaparece al instante y se confirma en segundo plano;
  // si falla, se recarga la lista de descartes.
  const dismissMutation = useMutation({
    mutationFn: async (alert: Alert) => {
      if (!user) return;
      const { error } = await supabase
        .from('alert_dismissals')
        .upsert({ user_id: user.id, alert_key: alert.key }, { onConflict: 'user_id,alert_key' });
      if (error) throw error;
    },
    onMutate: (alert) => {
      queryClient.setQueryData<string[]>(QK.alertDismissals, prev => [...(prev ?? []), alert.key]);
    },
    onError: (error) => {
      console.error('Error dismissing alert:', error);
      queryClient.invalidateQueries({ queryKey: QK.alertDismissals });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (alert: Alert) => {
      if (!user) return;
      const { error } = await supabase
        .from('alert_dismissals')
        .delete()
        .eq('user_id', user.id)
        .eq('alert_key', alert.key);
      if (error) throw error;
    },
    onMutate: (alert) => {
      queryClient.setQueryData<string[]>(QK.alertDismissals, prev => (prev ?? []).filter(k => k !== alert.key));
    },
    onError: (error) => {
      console.error('Error restoring alert:', error);
      queryClient.invalidateQueries({ queryKey: QK.alertDismissals });
    },
  });

  return {
    alerts,
    dismissedAlerts,
    count: alerts.length,
    loading: financeLoading || subscriptionsQuery.isPending || dismissalsQuery.isPending,
    dismiss: dismissMutation.mutate,
    restore: restoreMutation.mutate,
  };
};
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio, `#/alertas`): descartar una alerta → desaparece al instante, Red muestra `POST …/alert_dismissals`; "Ver descartadas" → restaurar → vuelve a la lista, Red muestra `DELETE …/alert_dismissals`. El contador del sidebar baja/sube.
- [ ] Commit: `git add src/hooks/useAlerts.ts && git commit -m "Descartes de alertas con claves compartidas y useMutation" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 1.8: Changelog 7.4 + build + verificación manual

**Files**
- Modify: `src/components/Changelog.tsx`

- [ ] Insertar al principio del array `changelog`:

```tsx
  {
    version: '7.4',
    date: 'Septiembre 2026',
    changes: [
      { icon: <Zap className="h-4 w-4" />, text: 'Perfil, pendientes, inversiones, tipos, reglas, criptomonedas, omisiones de pago, tipos de cambio y alertas pasan por la misma caché que cuentas y transacciones: muchas menos peticiones y listas que se actualizan solas al guardar', type: 'improvement' },
      { icon: <Bug className="h-4 w-4" />, text: 'Cambiar la divisa preferida se refleja en toda la app sin recargar', type: 'fix' },
      { icon: <Bug className="h-4 w-4" />, text: 'El saldo de las cuentas vinculadas a inversiones se refresca al importar movimientos', type: 'fix' },
    ],
  },
```

- [ ] `grep -rn "useState<.*\[\]>\|useEffect" src/hooks/*.ts` → solo `use-toast.ts` (estado local de toasts, esperado); ningún hook carga datos remotos con `useState+useEffect` (los `useEffect` restantes solo muestran toasts de error).
- [ ] `npx vitest run` → verde. `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npm run build` → sin errores.
- [ ] Verificación manual completa (spec fase 1): login en escritorio → Red: `profiles` ×1, `transaction_pendings` ×1, `alert_dismissals` ×1, `exchangerate-api` ×1; entrar a Inversiones → `inversiones` ×1; navegar Dashboard → Transacciones → Informes → Inversiones no repite ninguna. Móvil 390×844: las cinco pantallas cargan; `#/dashboard` sin loader infinito.
- [ ] Commit: `git add src/components/Changelog.tsx && git commit -m "Changelog 7.4" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

## Fase 2 — Detección de suscripciones en `src/lib/finance/` (versión 7.5)

> Requiere que el usuario haya ejecutado `20260921130000_subscription_frecuencia_manual.sql` **antes de la Task 2.4** (la primera que escribe `frecuencia_manual`). Las tareas 2.1–2.3 solo tocan tipos y lógica pura.

### Task 2.1: Tipo `frecuencia_manual` en `types.ts` + `subscriptionPatterns.ts` con test

**Files**
- Modify: `src/integrations/supabase/types.ts` (bloque `subscription_services`, sub-bloques `Row`, `Insert`, `Update`)
- Create: `src/lib/finance/subscriptionPatterns.ts`
- Test: `src/lib/finance/subscriptionPatterns.test.ts`

**Interfaces**
- Produces:
  ```ts
  export interface SubscriptionPattern { id; serviceName; tipoServicio; keywords: string[]; excludeKeywords?: string[]; expectedAmount?: number; frecuenciaDefault?: 'Mensual' | 'Anual' | 'Irregular' }
  export const SUBSCRIPTION_PATTERNS: SubscriptionPattern[]
  export const matchTransactionToPattern = (comentario: string, monto: number, pattern: SubscriptionPattern): boolean
  ```

- [ ] En `src/integrations/supabase/types.ts`, bloque `subscription_services`: en `Row` añadir `frecuencia_manual: boolean` tras `frecuencia: string`; en `Insert` añadir `frecuencia_manual?: boolean` tras `frecuencia: string`; en `Update` añadir `frecuencia_manual?: boolean` tras `frecuencia?: string`.
- [ ] Crear `src/lib/finance/subscriptionPatterns.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { matchTransactionToPattern, SUBSCRIPTION_PATTERNS } from './subscriptionPatterns';

const byId = (id: string) => SUBSCRIPTION_PATTERNS.find(p => p.id === id)!;

describe('matchTransactionToPattern', () => {
  it('exige todas las keywords y respeta las exclusiones', () => {
    const amazon = byId('amazon-prime');
    expect(matchTransactionToPattern('AMAZON RETAIL MX', 99, amazon)).toBe(true);
    expect(matchTransactionToPattern('AMAZON MX', 99, amazon)).toBe(false); // falta "retail"
    expect(matchTransactionToPattern('AMAZON RETAIL MARKETPLACE', 99, amazon)).toBe(false);
  });

  it('con expectedAmount acepta ±15%', () => {
    const amazon = byId('amazon-prime');
    expect(matchTransactionToPattern('AMAZON RETAIL', 110, amazon)).toBe(true);   // 99 + 11%
    expect(matchTransactionToPattern('AMAZON RETAIL', 150, amazon)).toBe(false);
  });

  it('Microsoft coincide con cualquiera de sus entradas (msbill, xbox…)', () => {
    const microsoft = SUBSCRIPTION_PATTERNS.filter(p => p.id === 'microsoft');
    expect(microsoft).toHaveLength(7);
    expect(microsoft.some(p => matchTransactionToPattern('MSBILL.INFO', 149, p))).toBe(true);
    expect(microsoft.some(p => matchTransactionToPattern('XBOX GAME PASS', 229, p))).toBe(true);
  });
});
```

- [ ] `npx vitest run src/lib/finance/subscriptionPatterns.test.ts` → falla (módulo no existe).
- [ ] Crear `src/lib/finance/subscriptionPatterns.ts` (los 20 patrones **tal cual** `SubscriptionsManager.tsx` l.31-114, incluidas las 7 entradas `microsoft`: el matching exige todas las keywords, fundirlas rompería Microsoft):

```ts
/** Patrón de suscripción conocida. Todas las keywords deben aparecer en el comentario. */
export interface SubscriptionPattern {
  id: string;
  serviceName: string;
  tipoServicio: string;
  /** Palabras clave que DEBE contener el comentario (todas deben coincidir) */
  keywords: string[];
  /** Palabras que NO debe contener el comentario (excluir falsos positivos) */
  excludeKeywords?: string[];
  /** Monto esperado — si se define, solo acepta transacciones a ±15% de este valor */
  expectedAmount?: number;
  frecuenciaDefault?: 'Mensual' | 'Anual' | 'Irregular';
}

export const SUBSCRIPTION_PATTERNS: SubscriptionPattern[] = [
  { id: 'amazon-prime', serviceName: 'Amazon Prime', tipoServicio: 'Streaming y envíos', keywords: ['amazon', 'retail'], excludeKeywords: ['marketplace'], expectedAmount: 99 },
  { id: 'spotify', serviceName: 'Spotify', tipoServicio: 'Streaming de música', keywords: ['spotify'] },
  { id: 'rotoplas', serviceName: 'Rotoplas', tipoServicio: 'Servicio de agua', keywords: ['rotoplas'], expectedAmount: 399 },
  { id: 'netflix', serviceName: 'Netflix', tipoServicio: 'Streaming de video', keywords: ['netflix'] },
  { id: 'chatgpt', serviceName: 'ChatGPT', tipoServicio: 'Inteligencia Artificial', keywords: ['openai', 'chatgpt'] },
  { id: 'apple', serviceName: 'Apple', tipoServicio: 'Servicios Apple', keywords: ['apple', 'com/bill'] },
  { id: 'google-nest', serviceName: 'Google Nest', tipoServicio: 'Dispositivos inteligentes', keywords: ['google', 'nest'] },
  { id: 'google-one', serviceName: 'Google One', tipoServicio: 'Almacenamiento en la nube', keywords: ['google', 'one'] },
  { id: 'youtube-premium', serviceName: 'YouTube Premium', tipoServicio: 'Streaming de video', keywords: ['google', 'youtube'] },
  { id: 'lovable', serviceName: 'Lovable', tipoServicio: 'Desarrollo de software', keywords: ['lovable'] },
  { id: 'opus-clip', serviceName: 'Opus Clip', tipoServicio: 'Edición de video', keywords: ['opus'] },
  { id: 'github', serviceName: 'GitHub', tipoServicio: 'Desarrollo de software', keywords: ['github'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['msbill'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['microsoft'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['msft'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['xbox'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['office365'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['office 365'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['onedrive'] },
];

/** Todas las keywords presentes, ninguna exclusión y, si hay expectedAmount, monto a ±15%. */
export const matchTransactionToPattern = (comentario: string, monto: number, pattern: SubscriptionPattern): boolean => {
  const lower = comentario.toLowerCase();

  const allKeywordsMatch = pattern.keywords.every(kw => lower.includes(kw.toLowerCase()));
  if (!allKeywordsMatch) return false;

  if (pattern.excludeKeywords) {
    const anyExcluded = pattern.excludeKeywords.some(kw => lower.includes(kw.toLowerCase()));
    if (anyExcluded) return false;
  }

  if (pattern.expectedAmount) {
    const tolerance = pattern.expectedAmount * 0.15;
    if (Math.abs(monto - pattern.expectedAmount) > tolerance) return false;
  }

  return true;
};
```

- [ ] `npx vitest run src/lib/finance/subscriptionPatterns.test.ts` → 3 tests en verde. `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Commit: `git add src/integrations/supabase/types.ts src/lib/finance/subscriptionPatterns.ts src/lib/finance/subscriptionPatterns.test.ts && git commit -m "Patrones de suscripción como módulo puro y tipo frecuencia_manual" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 2.2: `subscriptions.ts` (detección pura) con tests

**Files**
- Create: `src/lib/finance/subscriptions.ts`
- Test: `src/lib/finance/subscriptions.test.ts`
- Modify: `src/lib/finance/subscriptionsSummary.ts` (importa `SubscriptionFrequency`)

**Interfaces**
- Consumes: `Transaction`, `Category` (`@/types/finance`), `Database` (`@/integrations/supabase/types`), `fechaTxISO`, `parseFechaLocal`, `toFechaISO` (`./fechas`), `SUBSCRIPTION_PATTERNS`, `matchTransactionToPattern`.
- Produces:
  ```ts
  export type SubscriptionFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Irregular';
  export type SubscriptionRow = Database['public']['Tables']['subscription_services']['Row'];
  export type SubscriptionInsert = Omit<Database['public']['Tables']['subscription_services']['Insert'], 'user_id'>;
  export interface SubscriptionUpdate { id: string; data: Database['public']['Tables']['subscription_services']['Update'] }
  export interface AliasEntry { canonKey: string; serviceName: string; tipoServicio: string; aliases: string[] }
  export interface DetectedSubscription { canonKey; serviceName; tipoServicio; ultimoPago: { monto: number; fecha: Date }; frecuencia; proximoPago: Date; numeroPagos: number; originalComments: string[] }
  export const DIAS_MISMO_CICLO = 15
  export const resolveServiceName = (comentario: string, monto: number, aliases?: AliasEntry[]) => { serviceName: string; tipoServicio: string; canonKey: string }
  export const agruparCiclos = <T>(items: T[], fecha: (item: T) => Date) => T[][]
  export const detectFrequency = (fechas: Date[]) => { frecuencia: SubscriptionFrequency; ciclos: Date[][] }
  export const calculateNextPayment = (ultimoPago: Date /* local */, frecuencia: SubscriptionFrequency) => Date
  export const previousPaymentAmount = (originalComments: string[], transactions: Transaction[]) => number | null
  export const detectSubscriptions = (transactions: Transaction[], categories: Category[], aliases: AliasEntry[], now?: Date) => DetectedSubscription[]
  export const mergeWithStored = (detected: DetectedSubscription[], stored: SubscriptionRow[]) => { updates: SubscriptionUpdate[]; inserts: SubscriptionInsert[]; orphanIds: string[] }
  ```

- [ ] Crear `src/lib/finance/subscriptions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Category, Transaction } from '@/types/finance';
import { toFechaISO } from './fechas';
import {
  calculateNextPayment, detectFrequency, detectSubscriptions, mergeWithStored,
  previousPaymentAmount, resolveServiceName, SubscriptionRow,
} from './subscriptions';

// "Hoy" fijo: 20 de septiembre de 2026
const NOW = new Date(2026, 8, 20);

// Transaction.fecha real: new Date('YYYY-MM-DD') = medianoche UTC
const utc = (iso: string) => new Date(iso);
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const cat = (over: Partial<Category>): Category => ({ id: 'sub', categoria: 'Servicios', subcategoria: 'Suscripciones', tipo: 'Gastos', ...over });
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: utc('2026-08-08'), comentario: 'NETFLIX.COM', ingreso: 0, gasto: 199,
  monto: -199, subcategoriaId: 'sub', divisa: 'MXN', ...over,
});
const row = (over: Partial<SubscriptionRow>): SubscriptionRow => ({
  id: 'r1', user_id: 'u', service_name: 'Netflix', tipo_servicio: 'Streaming de video', ultimo_pago_monto: 199,
  ultimo_pago_fecha: '2026-07-08', frecuencia: 'Mensual', proximo_pago: '2026-08-08', numero_pagos: 3,
  original_comments: ['NETFLIX.COM'], active: true, canon_key: 'netflix', aliases: [], frecuencia_manual: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
});

const CATS = [cat({})];

describe('resolveServiceName', () => {
  it('un alias del usuario gana a un patrón', () => {
    const r = resolveServiceName('SPOTIFY AB', 129, [{ canonKey: 'musica', serviceName: 'Música', tipoServicio: 'Audio', aliases: ['spotify'] }]);
    expect(r).toEqual({ serviceName: 'Música', tipoServicio: 'Audio', canonKey: 'musica' });
  });
  it('aplica el patrón con expectedAmount a ±15%', () => {
    expect(resolveServiceName('AMAZON RETAIL', 105, []).canonKey).toBe('amazon-prime');
    expect(resolveServiceName('AMAZON RETAIL', 500, []).canonKey).toMatch(/^custom-/);
  });
  it('Microsoft coincide con msbill', () => {
    expect(resolveServiceName('MSBILL.INFO 149', 149, [])).toMatchObject({ serviceName: 'Microsoft', canonKey: 'microsoft' });
  });
  it('sin patrón genera custom-<sin acentos ni símbolos> y un nombre de hasta 3 palabras', () => {
    const r = resolveServiceName('CAFÉ *ÚNICO 12 SUSCRIPCIÓN MENSUAL', 50, []);
    expect(r.canonKey).toBe('custom-cafnico12suscripcinm'); // los dígitos se conservan (misma clave que hoy)
    expect(r.serviceName).toBe('CAFÉ ÚNICO SUSCRIPCIÓN');
    expect(r.tipoServicio).toBe('Suscripción');
  });
});

describe('detectFrequency', () => {
  const fechas = (...isos: string[]) => isos.map(utc);

  it('mensual limpio', () => {
    expect(detectFrequency(fechas('2026-05-08', '2026-06-08', '2026-07-08', '2026-08-08')).frecuencia).toBe('Mensual');
  });
  it('un cargo a ≤15 días del anterior es del mismo ciclo (cambio de plan) y no rompe la mediana', () => {
    const r = detectFrequency(fechas('2026-05-08', '2026-06-08', '2026-07-08', '2026-07-30', '2026-08-08'));
    expect(r.frecuencia).toBe('Mensual');
    expect(r.ciclos).toHaveLength(4);
    expect(r.ciclos[3]).toHaveLength(2); // 30/7 y 8/8 juntos
  });
  it('bimestral, trimestral y anual', () => {
    expect(detectFrequency(fechas('2026-01-10', '2026-03-10', '2026-05-10', '2026-07-10')).frecuencia).toBe('Bimestral');
    expect(detectFrequency(fechas('2025-10-01', '2026-01-01', '2026-04-01', '2026-07-01')).frecuencia).toBe('Trimestral');
    expect(detectFrequency(fechas('2024-08-15', '2025-08-15', '2026-08-15')).frecuencia).toBe('Anual');
  });
  it('un solo pago (o un solo ciclo) es Irregular', () => {
    expect(detectFrequency(fechas('2026-08-08')).frecuencia).toBe('Irregular');
    expect(detectFrequency(fechas('2026-08-01', '2026-08-08', '2026-08-15')).frecuencia).toBe('Irregular');
  });
});

describe('calculateNextPayment', () => {
  const base = local(2026, 8, 8);
  it('suma según la frecuencia; Irregular = +1 mes', () => {
    expect(calculateNextPayment(base, 'Semanal')).toEqual(local(2026, 8, 15));
    expect(calculateNextPayment(base, 'Mensual')).toEqual(local(2026, 9, 8));
    expect(calculateNextPayment(base, 'Bimestral')).toEqual(local(2026, 10, 8));
    expect(calculateNextPayment(base, 'Trimestral')).toEqual(local(2026, 11, 8));
    expect(calculateNextPayment(base, 'Semestral')).toEqual(local(2027, 2, 8));
    expect(calculateNextPayment(base, 'Anual')).toEqual(local(2027, 8, 8));
    expect(calculateNextPayment(base, 'Irregular')).toEqual(local(2026, 9, 8));
  });
  it('fin de mes: 31 ene + 1 mes desborda a marzo (comportamiento de siempre) y no muta la entrada', () => {
    const ene = local(2026, 1, 31);
    expect(calculateNextPayment(ene, 'Mensual')).toEqual(local(2026, 3, 3));
    expect(ene).toEqual(local(2026, 1, 31));
  });
});

describe('previousPaymentAmount', () => {
  it('devuelve el último cargo del ciclo anterior, no el segundo más reciente', () => {
    const txs = [
      tx({ id: '1', comentario: 'ANTHROPIC', fecha: utc('2026-06-08'), gasto: 20 }),
      tx({ id: '2', comentario: 'ANTHROPIC', fecha: utc('2026-07-08'), gasto: 20 }),
      tx({ id: '3', comentario: 'ANTHROPIC', fecha: utc('2026-07-30'), gasto: 100 }),
      tx({ id: '4', comentario: 'ANTHROPIC', fecha: utc('2026-08-08'), gasto: 100 }),
      tx({ id: 'x', comentario: 'OTRO', fecha: utc('2026-08-01'), gasto: 5 }),
    ];
    expect(previousPaymentAmount(['ANTHROPIC'], txs)).toBe(20);
    expect(previousPaymentAmount(['ANTHROPIC'], txs.slice(3))).toBeNull();
  });
});

describe('detectSubscriptions', () => {
  it('agrupa por canon_key con mediana de gaps; fechas: ultimoPago en UTC, proximoPago local', () => {
    const txs = ['2026-05-08', '2026-06-08', '2026-07-08', '2026-07-30', '2026-08-08'].map((f, i) =>
      tx({ id: `a${i}`, comentario: 'ANTHROPIC', fecha: utc(f), gasto: i >= 3 ? 100 : 20 }));
    const [d] = detectSubscriptions(txs, CATS, [], NOW);
    expect(d.canonKey).toBe('custom-anthropic');
    expect(d.frecuencia).toBe('Mensual');
    expect(d.numeroPagos).toBe(5);
    expect(d.ultimoPago).toEqual({ monto: 100, fecha: utc('2026-08-08') });
    expect(toFechaISO(d.proximoPago)).toBe('2026-09-08');
    expect(d.originalComments).toHaveLength(5);
  });
  it('ignora lo que no es gasto, no es Suscripciones o tiene más de 24 meses', () => {
    const txs = [
      tx({ id: '1' }), tx({ id: '2', fecha: utc('2026-07-08') }),
      tx({ id: 'ing', ingreso: 199, gasto: 0 }),
      tx({ id: 'otra', subcategoriaId: 'luz' }),
      tx({ id: 'vieja', fecha: utc('2024-01-01') }),
    ];
    const r = detectSubscriptions(txs, CATS, [], NOW);
    expect(r).toHaveLength(1);
    expect(r[0].numeroPagos).toBe(2);
  });
  it('sin subcategoría Suscripciones no detecta nada', () => {
    expect(detectSubscriptions([tx({})], [cat({ subcategoria: 'Luz' })], [], NOW)).toEqual([]);
  });
});

describe('mergeWithStored', () => {
  const detectada = detectSubscriptions([tx({ id: '1', fecha: utc('2026-07-08') }), tx({ id: '2' })], CATS, [], NOW);

  it('actualiza la fila existente conservando nombre, activo y alias; escribe fechas UTC/local', () => {
    const { updates, inserts, orphanIds } = mergeWithStored(detectada, [row({ service_name: 'Mi Netflix', active: false, aliases: ['nflx'] })]);
    expect(inserts).toEqual([]);
    expect(orphanIds).toEqual([]);
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe('r1');
    expect(updates[0].data).toEqual({
      tipo_servicio: 'Streaming de video', ultimo_pago_monto: 199, ultimo_pago_fecha: '2026-08-08',
      frecuencia: 'Mensual', proximo_pago: '2026-09-08', numero_pagos: 2, original_comments: ['NETFLIX.COM', 'NETFLIX.COM'],
    });
    expect(updates[0].data).not.toHaveProperty('service_name');
    expect(updates[0].data).not.toHaveProperty('active');
    expect(updates[0].data).not.toHaveProperty('aliases');
  });

  it('preserva la frecuencia solo si frecuencia_manual, recalculando proximo_pago con ella', () => {
    const { updates } = mergeWithStored(detectada, [row({ frecuencia: 'Anual', frecuencia_manual: true })]);
    expect(updates[0].data.frecuencia).toBe('Anual');
    expect(updates[0].data.proximo_pago).toBe('2027-08-08');
    const auto = mergeWithStored(detectada, [row({ frecuencia: 'Irregular', frecuencia_manual: false })]);
    expect(auto.updates[0].data.frecuencia).toBe('Mensual');
  });

  it('no emite update si nada cambió', () => {
    const igual = row({ ultimo_pago_fecha: '2026-08-08', proximo_pago: '2026-09-08', numero_pagos: 2, original_comments: ['NETFLIX.COM', 'NETFLIX.COM'] });
    expect(mergeWithStored(detectada, [igual]).updates).toEqual([]);
  });

  it('marca huérfanas y no las cuenta como nombre ocupado (se borran en el mismo sync)', () => {
    const { inserts, orphanIds } = mergeWithStored(detectada, [
      row({ id: 'viejo', canon_key: 'spotify', service_name: 'Netflix' }),
      row({ id: 'sin-clave', canon_key: null, service_name: 'Manual' }),
    ]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ service_name: 'Netflix', canon_key: 'netflix', active: true, frecuencia_manual: false, frecuencia: 'Mensual' });
    expect(orphanIds).toEqual(['viejo', 'sin-clave']);
  });

  it('inserta con sufijo si el nombre ya lo usa una fila que sigue viva', () => {
    const otra = { ...detectada[0], canonKey: 'spotify', serviceName: 'Netflix' };
    const { inserts } = mergeWithStored([...detectada, otra], [
      row({ id: 'viva', canon_key: 'spotify', service_name: 'Netflix' }),
    ]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ service_name: 'Netflix (2)', canon_key: 'netflix' });
  });

  it('dos inserts con el mismo nombre: el primero libre, el segundo con (2); la huérfana k0 no ocupa', () => {
    const dos = [
      { ...detectada[0], canonKey: 'k1' },
      { ...detectada[0], canonKey: 'k2' },
    ];
    const { inserts } = mergeWithStored(dos, [row({ canon_key: 'k0' })]);
    expect(inserts.map(i => i.service_name)).toEqual(['Netflix', 'Netflix (2)']);
  });
});
```

- [ ] `npx vitest run src/lib/finance/subscriptions.test.ts` → falla (módulo no existe).
- [ ] Crear `src/lib/finance/subscriptions.ts`:

```ts
import { Category, Transaction } from '@/types/finance';
import type { Database } from '@/integrations/supabase/types';
import { fechaTxISO, parseFechaLocal, toFechaISO } from './fechas';
import { matchTransactionToPattern, SUBSCRIPTION_PATTERNS } from './subscriptionPatterns';

/** Valores admitidos por el CHECK de subscription_services.frecuencia (migración 20260809033858). Única definición. */
export type SubscriptionFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Irregular';

type Tabla = Database['public']['Tables']['subscription_services'];
export type SubscriptionRow = Tabla['Row'];
/** Fila a insertar; el hook añade user_id. */
export type SubscriptionInsert = Omit<Tabla['Insert'], 'user_id'>;
export interface SubscriptionUpdate { id: string; data: Tabla['Update'] }

/** Alias definidos por el usuario (fusiones manuales previas): canon_key → nombre/tipo/aliases. */
export interface AliasEntry { canonKey: string; serviceName: string; tipoServicio: string; aliases: string[] }

export interface DetectedSubscription {
  canonKey: string;
  serviceName: string;
  tipoServicio: string;
  /** `fecha` es Transaction.fecha (medianoche UTC): se escribe con fechaTxISO. */
  ultimoPago: { monto: number; fecha: Date };
  frecuencia: SubscriptionFrequency;
  /** Fecha local: se escribe con toFechaISO. */
  proximoPago: Date;
  numeroPagos: number;
  originalComments: string[];
}

const DIA_MS = 86_400_000;
/** Dos cargos a ≤ 15 días son del mismo ciclo (cambio de plan, cargo doble). */
export const DIAS_MISMO_CICLO = 15;
/** Meses hacia atrás que se analizan. */
const MESES_ANALIZADOS = 24;

const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA_MS);

/** Transaction.fecha es medianoche UTC; para sumar meses en local hay que pasarla a medianoche local. */
const utcALocal = (d: Date): Date => parseFechaLocal(fechaTxISO(d));

/** 1) alias del usuario, 2) patrones embebidos, 3) nombre limpio + clave `custom-…`. */
export const resolveServiceName = (
  comentario: string,
  monto: number,
  aliases: AliasEntry[] = [],
): { serviceName: string; tipoServicio: string; canonKey: string } => {
  const lower = comentario.toLowerCase();
  for (const entry of aliases) {
    for (const alias of entry.aliases) {
      const a = (alias || '').toLowerCase().trim();
      if (a && lower.includes(a)) {
        return { serviceName: entry.serviceName, tipoServicio: entry.tipoServicio, canonKey: entry.canonKey };
      }
    }
  }
  for (const pattern of SUBSCRIPTION_PATTERNS) {
    if (matchTransactionToPattern(comentario, monto, pattern)) {
      return { serviceName: pattern.serviceName, tipoServicio: pattern.tipoServicio, canonKey: pattern.id };
    }
  }
  const cleanName = comentario.replace(/[*#\d]/g, '').trim().split(/\s+/).slice(0, 3).join(' ') || comentario.substring(0, 20);
  const canonKey = `custom-${comentario.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`;
  return { serviceName: cleanName, tipoServicio: 'Suscripción', canonKey };
};

/** Ordena por fecha y agrupa en ciclos: un elemento a ≤ 15 días del anterior cae en el mismo ciclo. */
export const agruparCiclos = <T,>(items: T[], fecha: (item: T) => Date): T[][] => {
  const orden = [...items].sort((a, b) => fecha(a).getTime() - fecha(b).getTime());
  const ciclos: T[][] = [];
  for (const it of orden) {
    const actual = ciclos[ciclos.length - 1];
    if (actual && diasEntre(fecha(actual[actual.length - 1]), fecha(it)) <= DIAS_MISMO_CICLO) actual.push(it);
    else ciclos.push([it]);
  }
  return ciclos;
};

const frecuenciaPorMediana = (dias: number): SubscriptionFrequency => {
  if (dias >= 20 && dias <= 45) return 'Mensual';
  if (dias >= 46 && dias <= 75) return 'Bimestral';
  if (dias >= 76 && dias <= 120) return 'Trimestral';
  if (dias >= 150 && dias <= 220) return 'Semestral';
  if (dias >= 300 && dias <= 400) return 'Anual';
  return 'Irregular';
};

/**
 * Frecuencia por la MEDIANA de los gaps entre el último cargo de cada ciclo y el
 * del siguiente (la media se rompía con un cargo de cambio de plan a 9 días).
 * `Semanal` no se detecta (el colapso de ciclo lo impide): queda como opción manual.
 */
export const detectFrequency = (fechas: Date[]): { frecuencia: SubscriptionFrequency; ciclos: Date[][] } => {
  const ciclos = agruparCiclos(fechas, (d) => d);
  if (ciclos.length < 2) return { frecuencia: 'Irregular', ciclos };
  const gaps: number[] = [];
  for (let i = 1; i < ciclos.length; i++) {
    const prev = ciclos[i - 1];
    const cur = ciclos[i];
    gaps.push(diasEntre(prev[prev.length - 1], cur[cur.length - 1]));
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const mediana = gaps.length % 2 === 1 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return { frecuencia: frecuenciaPorMediana(Math.round(mediana)), ciclos };
};

/** Próximo pago sobre una copia de una fecha LOCAL (setMonth desborda fin de mes como siempre). */
export const calculateNextPayment = (ultimoPago: Date, frecuencia: SubscriptionFrequency): Date => {
  const next = new Date(ultimoPago);
  switch (frecuencia) {
    case 'Semanal': next.setDate(next.getDate() + 7); break;
    case 'Mensual': next.setMonth(next.getMonth() + 1); break;
    case 'Bimestral': next.setMonth(next.getMonth() + 2); break;
    case 'Trimestral': next.setMonth(next.getMonth() + 3); break;
    case 'Semestral': next.setMonth(next.getMonth() + 6); break;
    case 'Anual': next.setFullYear(next.getFullYear() + 1); break;
    case 'Irregular': next.setMonth(next.getMonth() + 1); break;
  }
  return next;
};

/** Último cargo del ciclo anterior al más reciente (icono de tendencia); null si no hay dos ciclos. */
export const previousPaymentAmount = (originalComments: string[], transactions: Transaction[]): number | null => {
  const comments = new Set(originalComments);
  const pagos = transactions.filter(t => t.gasto > 0 && comments.has(t.comentario));
  const ciclos = agruparCiclos(pagos, t => t.fecha);
  if (ciclos.length < 2) return null;
  const anterior = ciclos[ciclos.length - 2];
  return anterior[anterior.length - 1].gasto;
};

/** Gastos de la subcategoría "Suscripciones" de los últimos 24 meses, agrupados por servicio. */
export const detectSubscriptions = (
  transactions: Transaction[],
  categories: Category[],
  aliases: AliasEntry[],
  now: Date = new Date(),
): DetectedSubscription[] => {
  const ids = new Set(categories.filter(c => c.subcategoria.toLowerCase() === 'suscripciones').map(c => c.id));
  if (ids.size === 0) return [];

  const desde = new Date(now);
  desde.setMonth(desde.getMonth() - MESES_ANALIZADOS);

  const candidatas = transactions.filter(t => t.gasto > 0 && ids.has(t.subcategoriaId) && t.fecha >= desde);

  const grupos = new Map<string, { serviceName: string; tipoServicio: string; txs: Transaction[] }>();
  for (const t of candidatas) {
    const { serviceName, tipoServicio, canonKey } = resolveServiceName(t.comentario, t.gasto, aliases);
    if (!grupos.has(canonKey)) grupos.set(canonKey, { serviceName, tipoServicio, txs: [] });
    grupos.get(canonKey)!.txs.push(t);
  }

  const out: DetectedSubscription[] = [];
  for (const [canonKey, g] of grupos) {
    const sorted = [...g.txs].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const ultimo = sorted[0];
    const { frecuencia } = detectFrequency(sorted.map(t => t.fecha));
    out.push({
      canonKey,
      serviceName: g.serviceName,
      tipoServicio: g.tipoServicio,
      ultimoPago: { monto: ultimo.gasto, fecha: ultimo.fecha },
      frecuencia,
      proximoPago: calculateNextPayment(utcALocal(ultimo.fecha), frecuencia),
      numeroPagos: sorted.length,
      originalComments: sorted.map(t => t.comentario),
    });
  }
  return out;
};

const nombreLibre = (base: string, ocupados: Set<string>): string => {
  if (!ocupados.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base} (${n})`;
    if (!ocupados.has(candidato)) return candidato;
  }
};

const mismosComentarios = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Cruza lo detectado con lo guardado. Preserva service_name, active y aliases;
 * preserva frecuencia solo si frecuencia_manual; recalcula proximo_pago siempre.
 * Solo devuelve updates con cambios reales. Los inserts reciben sufijo " (2)", " (3)"…
 * si el nombre ya existe (UNIQUE (user_id, service_name)). Huérfanas = filas sin
 * canon_key o cuya clave ya no se detecta.
 */
export const mergeWithStored = (
  detected: DetectedSubscription[],
  stored: SubscriptionRow[],
): { updates: SubscriptionUpdate[]; inserts: SubscriptionInsert[]; orphanIds: string[] } => {
  const porCanon = new Map(stored.filter(s => s.canon_key).map(s => [s.canon_key as string, s]));
  const canonDetectados = new Set(detected.map(d => d.canonKey));
  // Nombres ocupados: solo por filas que van a seguir existiendo (las huérfanas se borran en el mismo sync)
  const ocupados = new Set(stored.filter(s => s.canon_key && canonDetectados.has(s.canon_key)).map(s => s.service_name));
  const vistos = new Set<string>();
  const updates: SubscriptionUpdate[] = [];
  const inserts: SubscriptionInsert[] = [];

  for (const d of detected) {
    vistos.add(d.canonKey);
    const existente = porCanon.get(d.canonKey);
    const frecuencia: SubscriptionFrequency = existente?.frecuencia_manual
      ? (existente.frecuencia as SubscriptionFrequency)
      : d.frecuencia;
    const comunes = {
      tipo_servicio: d.tipoServicio,
      ultimo_pago_monto: d.ultimoPago.monto,
      ultimo_pago_fecha: fechaTxISO(d.ultimoPago.fecha),
      frecuencia,
      proximo_pago: toFechaISO(calculateNextPayment(utcALocal(d.ultimoPago.fecha), frecuencia)),
      numero_pagos: d.numeroPagos,
      original_comments: d.originalComments,
    };

    if (existente) {
      const cambia =
        existente.tipo_servicio !== comunes.tipo_servicio ||
        Number(existente.ultimo_pago_monto) !== comunes.ultimo_pago_monto ||
        existente.ultimo_pago_fecha !== comunes.ultimo_pago_fecha ||
        existente.frecuencia !== comunes.frecuencia ||
        existente.proximo_pago !== comunes.proximo_pago ||
        existente.numero_pagos !== comunes.numero_pagos ||
        !mismosComentarios(existente.original_comments ?? [], comunes.original_comments);
      if (cambia) updates.push({ id: existente.id, data: comunes });
    } else {
      const service_name = nombreLibre(d.serviceName, ocupados);
      ocupados.add(service_name);
      inserts.push({ ...comunes, service_name, active: true, canon_key: d.canonKey, frecuencia_manual: false });
    }
  }

  const orphanIds = stored.filter(s => !s.canon_key || !vistos.has(s.canon_key)).map(s => s.id);
  return { updates, inserts, orphanIds };
};
```

- [ ] `npx vitest run src/lib/finance/subscriptions.test.ts` → todos en verde.
- [ ] En `src/lib/finance/subscriptionsSummary.ts` sustituir

```ts
/** Valores admitidos por el CHECK de subscription_services.frecuencia (migración 20260809033858). */
export type SubscriptionFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Irregular';
```
  por
```ts
import type { SubscriptionFrequency } from './subscriptions';
```
  (la línea `const FACTOR_MENSUAL: Record<Exclude<SubscriptionFrequency, 'Irregular'>, number>` sigue igual).

- [ ] `npx vitest run` → verde. `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Commit: `git add src/lib/finance/subscriptions.ts src/lib/finance/subscriptions.test.ts src/lib/finance/subscriptionsSummary.ts && git commit -m "Detección de suscripciones como lógica pura: mediana de gaps, colapso de ciclo y merge con lo guardado" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

<!-- FIN PARTE 2/4 -->

<!-- PARTE 3/4 -->

### Task 2.3: `useSubscriptionServices` devuelve todas las filas; los consumidores filtran `active`

**Files**
- Modify: `src/hooks/useSubscriptionServices.ts`
- Modify: `src/pages/movil/SuscripcionesMovil.tsx`
- Test: ninguno (hook/UI; `computeSubscriptionsSummary` ya documenta "el llamador pasa solo activas")

**Interfaces**
- `useSubscriptionServices(): { subscriptions: SubscriptionService[] /* todas */; loading: boolean; error: unknown }` — misma forma.
- Consumidores: `CxP.tsx` y `PorPagarMovil.tsx` (pasan a `computeCxP`, que ya filtra `active`, `cxp.ts:59` — sin cambios), `SuscripcionesMovil.tsx` (filtra aquí).

- [ ] En `src/hooks/useSubscriptionServices.ts` sustituir la `fetchSubscriptionServices` y el comentario del hook por:

```ts
const fetchSubscriptionServices = async (): Promise<SubscriptionService[]> => {
  const { data, error } = await supabase.from('subscription_services').select('*');
  if (error) throw error;
  return data ?? [];
};

/**
 * Todas las suscripciones (activas e inactivas): cada consumidor filtra `active`.
 * staleTime 0 hasta que SubscriptionsManager invalide al escribir (Task 2.5).
 */
```
  (el resto del archivo no cambia todavía; `staleTime: 0` se sube a `STALE_TIME` en la Task 2.5).

- [ ] En `src/pages/movil/SuscripcionesMovil.tsx` sustituir

```ts
  const resumen = useMemo(() => computeSubscriptionsSummary(subscriptions), [subscriptions]);
```
  por
```ts
  // El hook devuelve también las inactivas; aquí solo cuentan las activas.
  const activas = useMemo(() => subscriptions.filter((s) => s.active), [subscriptions]);
  const resumen = useMemo(() => computeSubscriptionsSummary(activas), [activas]);
```
  y
```ts
  const ordenadas = useMemo(
    () => [...subscriptions].sort((a, b) => a.proximo_pago.localeCompare(b.proximo_pago)),
    [subscriptions],
  );
```
  por
```ts
  const ordenadas = useMemo(
    () => [...activas].sort((a, b) => a.proximo_pago.localeCompare(b.proximo_pago)),
    [activas],
  );
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npx vitest run` → verde.
- [ ] Verificación manual: móvil 390×844 `#/suscripciones` muestra las mismas activas que antes (las inactivas no aparecen); `#/cxp` y escritorio `#/cxp` iguales.
- [ ] Commit: `git add src/hooks/useSubscriptionServices.ts src/pages/movil/SuscripcionesMovil.tsx && git commit -m "useSubscriptionServices devuelve todas las filas; el móvil filtra las activas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 2.4: `useSubscriptionSync`

**Files**
- Create: `src/hooks/useSubscriptionSync.ts`
- Test: ninguno (hook; lógica en `subscriptions.test.ts`; verificación manual en 2.5)

**Interfaces**
- Consumes: `detectSubscriptions`, `mergeWithStored`, `AliasEntry`, `SubscriptionRow`; caché `transacciones`/`categorias` vía `queryClient.getQueryData`.
- Produces:
  ```ts
  export interface SyncArgs { transactions?: Transaction[]; categories?: Category[] }
  export interface SyncResult { updated: number; inserted: number; deleted: number; duplicados: string[] }
  useSubscriptionSync(): { sync: (args?: SyncArgs) => Promise<SyncResult>; syncIfChanged: () => void; syncing: boolean }
  ```

- [ ] **Esperar confirmación del usuario** de que ejecutó `20260921130000_subscription_frecuencia_manual.sql` (a partir de aquí el código escribe `frecuencia_manual`).
- [ ] Crear `src/hooks/useSubscriptionSync.ts`:

```ts
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys } from '@/lib/finance/queryKeys';
import { AliasEntry, detectSubscriptions, mergeWithStored, SubscriptionRow } from '@/lib/finance/subscriptions';
import { Category, Transaction } from '@/types/finance';

export interface SyncArgs {
  transactions?: Transaction[];
  categories?: Category[];
}

export interface SyncResult {
  updated: number;
  inserted: number;
  deleted: number;
  /** Nombres que chocaron con UNIQUE (user_id, service_name); no abortan el resto. */
  duplicados: string[];
}

/**
 * Último array de transacciones (identidad de la caché) ya sincronizado. A nivel
 * de módulo para no repetir la detección en cada montaje de SubscriptionsManager;
 * queryClient.clear() al cerrar sesión crea arrays nuevos y vuelve a disparar.
 */
let ultimoSincronizado: Transaction[] | null = null;

const toAliasEntries = (rows: SubscriptionRow[]): AliasEntry[] =>
  rows
    .filter(r => r.canon_key && Array.isArray(r.aliases) && r.aliases.length > 0)
    .map(r => ({ canonKey: r.canon_key as string, serviceName: r.service_name, tipoServicio: r.tipo_servicio, aliases: r.aliases }));

/**
 * Detecta suscripciones en las transacciones de la caché y persiste el resultado:
 * 1 select + N update/insert (sin upsert: el índice único de canon_key es parcial)
 * + 1 delete de huérfanas; invalida `subscriptions`. De ~4×N+3 consultas a N+2.
 */
export const useSubscriptionSync = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (args: SyncArgs): Promise<SyncResult> => {
      const vacio: SyncResult = { updated: 0, inserted: 0, deleted: 0, duplicados: [] };
      if (!userId) return vacio;
      const QK = financeQueryKeys(userId);
      // Se lee la caché en el momento de ejecutar, no el closure: tras un
      // invalidate(transacciones) ya contiene lo importado.
      const transactions = args.transactions ?? queryClient.getQueryData<Transaction[]>(QK.transacciones) ?? [];
      const categories = args.categories ?? queryClient.getQueryData<Category[]>(QK.categorias) ?? [];
      if (transactions.length === 0) return vacio;

      const { data: stored, error } = await supabase
        .from('subscription_services')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      const rows = (stored ?? []) as SubscriptionRow[];

      const detected = detectSubscriptions(transactions, categories, toAliasEntries(rows));
      const { updates, inserts, orphanIds } = mergeWithStored(detected, rows);

      const duplicados: string[] = [];
      let updated = 0;
      let inserted = 0;

      for (const u of updates) {
        const { error: e } = await supabase.from('subscription_services').update(u.data).eq('id', u.id);
        if (e) {
          if (e.code === '23505') { duplicados.push(rows.find(r => r.id === u.id)?.service_name ?? u.id); continue; }
          throw e;
        }
        updated++;
      }
      // Borrar huérfanas ANTES de insertar: liberan nombres (UNIQUE user_id+service_name).
      if (orphanIds.length > 0) {
        const { error: e } = await supabase.from('subscription_services').delete().in('id', orphanIds);
        if (e) throw e;
      }
      for (const i of inserts) {
        const { error: e } = await supabase.from('subscription_services').insert({ ...i, user_id: userId });
        if (e) {
          if (e.code === '23505') { duplicados.push(i.service_name); continue; }
          throw e;
        }
        inserted++;
      }

      ultimoSincronizado = transactions;
      return { updated, inserted, deleted: orphanIds.length, duplicados };
    },
    onSuccess: (r) => r.duplicados.forEach(n => toast.error(`Nombre duplicado: ${n}`)),
    onError: (e) => {
      console.error('Error sincronizando suscripciones:', e);
      ultimoSincronizado = null;
      toast.error('Error al procesar las suscripciones');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys(userId).subscriptions }),
  });

  const { mutate, mutateAsync } = mutation;

  /** Disparador (b): sincronización explícita (tras importar, tras fusionar). */
  const sync = useCallback((args?: SyncArgs) => mutateAsync(args ?? {}), [mutateAsync]);

  /** Disparador (a): solo si el array de transacciones de la caché cambió desde la última vez. */
  const syncIfChanged = useCallback(() => {
    const txs = queryClient.getQueryData<Transaction[]>(financeQueryKeys(userId).transacciones);
    if (!txs || txs.length === 0 || txs === ultimoSincronizado) return;
    ultimoSincronizado = txs; // antes de mutate: evita un segundo disparo mientras corre
    mutate({});
  }, [queryClient, userId, mutate]);

  return { sync, syncIfChanged, syncing: mutation.isPending };
};
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Commit: `git add src/hooks/useSubscriptionSync.ts && git commit -m "useSubscriptionSync: detectar y persistir suscripciones con N+2 consultas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 2.5: `SubscriptionsManager.tsx` reescrito (< 500 líneas) y `staleTime` de suscripciones a 5 min

**Files**
- Modify: `src/components/SubscriptionsManager.tsx` (reescritura completa; conserva la UI: cabecera con spinner, "Mostrar inactivas", resumen mensual, tarjetas con checkbox/editar nombre/fusionar/frecuencia/iconos de tendencia, diálogo de fusión)
- Modify: `src/hooks/useSubscriptionServices.ts` (`staleTime: 0` → `STALE_TIME`)
- Test: ninguno (UI; verificación manual)

**Interfaces**
- Consumes: `useSubscriptionServices`, `useSubscriptionSync`, `useFinanceDataSupabase().transactions`, `previousPaymentAmount`, `calculateNextPayment`, `parseFechaLocal`, `toFechaISO`.
- Produces: `export const SubscriptionsManager: () => JSX.Element` (misma exportación; `Suscripciones.tsx` no cambia).
- Cambios visibles declarados: `Irregular` mal detectadas pasan a su frecuencia real; `proximo_pago` se recalcula desde el último pago; orden por último pago desc; `FREQUENCY_OPTIONS` con Semanal y Trimestral.

- [ ] En `src/hooks/useSubscriptionServices.ts`: sustituir `import { financeQueryKeys } from './useFinanceDataSupabase';` por `import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';`, `staleTime: 0,` por `staleTime: STALE_TIME,` y el comentario del hook por `/** Todas las suscripciones (activas e inactivas): cada consumidor filtra `active`. Las mutaciones de SubscriptionsManager y useSubscriptionSync invalidan la clave. */`.
- [ ] Sustituir el contenido completo de `src/components/SubscriptionsManager.tsx` por:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionService, useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useSubscriptionSync } from '@/hooks/useSubscriptionSync';
import { supabase } from '@/integrations/supabase/client';
import { financeQueryKeys } from '@/lib/finance/queryKeys';
import { calculateNextPayment, previousPaymentAmount, SubscriptionFrequency } from '@/lib/finance/subscriptions';
import { parseFechaLocal, toFechaISO } from '@/lib/finance/fechas';
import { Transaction } from '@/types/finance';
import { CreditCard, Calendar, Clock, Repeat, RefreshCw, Edit2, Check, X, TrendingUp, TrendingDown, Merge } from 'lucide-react';
import { toast } from 'sonner';

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency; label: string }[] = [
  { value: 'Semanal', label: 'Semanal' },
  { value: 'Mensual', label: 'Mensual' },
  { value: 'Bimestral', label: 'Bimestral' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' },
];

/** Fila de BD + datos derivados para pintar. */
interface ServiceView {
  id: string;
  serviceName: string;
  tipoServicio: string;
  frecuencia: SubscriptionFrequency;
  ultimoPago: { monto: number; fecha: Date; mes: string };
  previousPaymentAmount: number | null;
  proximoPago: Date;
  numeroPagos: number;
  originalComments: string[];
  active: boolean;
}

const toView = (row: SubscriptionService, transactions: Transaction[]): ServiceView => {
  const fecha = parseFechaLocal(row.ultimo_pago_fecha);
  return {
    id: row.id,
    serviceName: row.service_name,
    tipoServicio: row.tipo_servicio,
    frecuencia: row.frecuencia as SubscriptionFrequency,
    ultimoPago: {
      monto: Number(row.ultimo_pago_monto),
      fecha,
      mes: fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    },
    previousPaymentAmount: previousPaymentAmount(row.original_comments ?? [], transactions),
    proximoPago: parseFechaLocal(row.proximo_pago),
    numeroPagos: row.numero_pagos,
    originalComments: row.original_comments ?? [],
    active: row.active,
  };
};

const getFrequencyBadgeVariant = (frequency: string) => {
  switch (frequency) {
    case 'Mensual': return 'default';
    case 'Bimestral': return 'default';
    case 'Semestral': return 'secondary';
    case 'Anual': return 'secondary';
    default: return 'outline';
  }
};

export const SubscriptionsManager = () => {
  const { formatCurrency } = useAppConfig();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { transactions, loading: loadingTx } = useFinanceDataSupabase();
  const { subscriptions, loading: loadingSubs } = useSubscriptionServices();
  const { sync, syncIfChanged, syncing } = useSubscriptionSync();

  const [showInactive, setShowInactive] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingFrequencyId, setEditingFrequencyId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Disparador (a): detectar al montar, una vez por identidad del array de transacciones de la caché.
  useEffect(() => {
    if (!loadingTx && transactions.length > 0) syncIfChanged();
  }, [transactions, loadingTx, syncIfChanged]);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: financeQueryKeys(user?.id).subscriptions });

  const services = useMemo(
    () => subscriptions
      .map(r => toView(r, transactions))
      .sort((a, b) => b.ultimoPago.fecha.getTime() - a.ultimoPago.fecha.getTime()),
    [subscriptions, transactions],
  );

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('subscription_services').update({ active }).eq('id', id);
      if (error) throw error;
      return active;
    },
    onSuccess: (active) => {
      toast.success(active ? 'Suscripción activada' : 'Suscripción desactivada');
      invalidar();
    },
    onError: (e) => {
      console.error('Error updating subscription status:', e);
      toast.error('Error al actualizar el estado de la suscripción');
    },
  });

  const saveName = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('subscription_services')
        .update({ service_name: name })
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('not-found');
    },
    onSuccess: () => {
      toast.success('Nombre de suscripción actualizado');
      setEditingServiceId(null);
      setEditingName('');
      invalidar();
    },
    onError: (e: { code?: string; message?: string }) => {
      console.error('Error updating service name:', e);
      if (e?.code === '23505') toast.error('Ya existe otra suscripción con ese nombre');
      else if (e?.message === 'not-found') toast.error('No se encontró la suscripción a renombrar. Vuelve a analizar las suscripciones.');
      else toast.error(`Error al actualizar el nombre: ${e?.message ?? ''}`);
    },
  });

  const saveFrequency = useMutation({
    mutationFn: async ({ id, frecuencia, ultimoPago }: { id: string; frecuencia: SubscriptionFrequency; ultimoPago: Date }) => {
      const { error } = await supabase
        .from('subscription_services')
        .update({
          frecuencia,
          proximo_pago: toFechaISO(calculateNextPayment(ultimoPago, frecuencia)),
          // Editada por el usuario: el sync ya no la vuelve a detectar.
          frecuencia_manual: true,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingFrequencyId(null);
      invalidar();
    },
    onError: (e) => {
      console.error('Error updating frequency:', e);
      toast.error('Error al actualizar la frecuencia');
    },
  });

  const merge = useMutation({
    mutationFn: async ({ source, target }: { source: ServiceView; target: ServiceView }) => {
      const { data: targetRow } = await supabase
        .from('subscription_services')
        .select('aliases')
        .eq('id', target.id)
        .maybeSingle();
      const existingAliases: string[] = targetRow?.aliases ?? [];
      const newAliases = Array.from(new Set([
        ...existingAliases,
        ...source.originalComments.map(c => (c || '').toLowerCase().trim()).filter(Boolean),
      ]));
      const { error: updErr } = await supabase.from('subscription_services').update({ aliases: newAliases }).eq('id', target.id);
      if (updErr) throw updErr;
      const { error: delErr } = await supabase.from('subscription_services').delete().eq('id', source.id);
      if (delErr) throw delErr;
    },
    onSuccess: async () => {
      setMergeSourceId(null);
      setMergeTargetId('');
      await invalidar();
      // Los alias nuevos cambian la detección: sincronización explícita, sin await:
      // un fallo del sync tiene su propio toast y no debe marcar la fusión (ya hecha) como error.
      sync().catch(() => undefined);
    },
    onError: (e) => {
      console.error('Error merging subscriptions:', e);
      toast.error('Error al fusionar las suscripciones');
    },
  });

  const startEditingName = (serviceId: string, currentName: string) => {
    setEditingServiceId(serviceId);
    setEditingName(currentName);
  };
  const saveEditedName = () => {
    if (!editingServiceId || !editingName.trim()) return;
    saveName.mutate({ id: editingServiceId, name: editingName.trim() });
  };
  const cancelEditingName = () => {
    setEditingServiceId(null);
    setEditingName('');
  };
  const saveEditedFrequency = (service: ServiceView, frecuencia: SubscriptionFrequency) => {
    saveFrequency.mutate({ id: service.id, frecuencia, ultimoPago: service.ultimoPago.fecha });
  };
  const performMerge = () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    const source = services.find(s => s.id === mergeSourceId);
    const target = services.find(s => s.id === mergeTargetId);
    if (!source || !target) return;
    merge.mutate({ source, target });
  };

  const isLoading = syncing || loadingSubs;

  const filteredServices = useMemo(
    () => services.filter(service => (showInactive ? true : service.active)),
    [services, showInactive],
  );

  const monthlySubscriptionsTotal = useMemo(() => {
    const activeMonthlyServices = services.filter(service => service.active && service.frecuencia === 'Mensual');
    const totalAmount = activeMonthlyServices.reduce((sum, service) => sum + service.ultimoPago.monto, 0);
    return { count: activeMonthlyServices.length, totalAmount };
  }, [services]);

  return (
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Suscripciones Activas
          </div>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Análisis automático de los últimos 24 meses
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked as boolean)}
              />
              <label htmlFor="show-inactive" className="text-xs text-muted-foreground cursor-pointer">
                Mostrar inactivas
              </label>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredServices.length} servicios {showInactive ? 'total' : 'activos'}
            </Badge>
          </div>
        </div>

        {monthlySubscriptionsTotal.count > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-primary">Suscripciones Mensuales Activas</h4>
                  <p className="text-sm text-muted-foreground">
                    {monthlySubscriptionsTotal.count} servicio{monthlySubscriptionsTotal.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${formatCurrency(monthlySubscriptionsTotal.totalAmount)}
                </div>
                <div className="text-sm text-muted-foreground">por mes</div>
              </div>
            </div>
          </div>
        )}

        {filteredServices.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se detectaron suscripciones</p>
            <p className="text-sm">Se detectarán automáticamente a partir de tus transacciones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service) => (
              <div key={service.id} className={`group p-4 rounded-lg border transition-colors ${!service.active ? 'bg-muted/20 border-muted' : 'bg-card hover:bg-muted/5'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={service.active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: service.id, active: checked as boolean })}
                      aria-label={`${service.active ? 'Desactivar' : 'Activar'} suscripción de ${service.serviceName}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {editingServiceId === service.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 text-lg font-semibold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedName();
                                else if (e.key === 'Escape') cancelEditingName();
                              }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={saveEditedName} className="h-8 w-8 p-0">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditingName} className="h-8 w-8 p-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-lg ${!service.active ? 'text-muted-foreground' : ''}`}>
                              {service.serviceName}
                            </h3>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingName(service.id, service.serviceName)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Editar nombre"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setMergeSourceId(service.id); setMergeTargetId(''); }}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Fusionar con otra suscripción"
                            >
                              <Merge className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {editingFrequencyId === service.id ? (
                          <div className="flex items-center gap-1">
                            {FREQUENCY_OPTIONS.map(opt => (
                              <Badge
                                key={opt.value}
                                variant={service.frecuencia === opt.value ? 'default' : 'outline'}
                                className="text-xs cursor-pointer hover:bg-primary/20"
                                onClick={() => saveEditedFrequency(service, opt.value)}
                              >
                                {opt.label}
                              </Badge>
                            ))}
                            <Button size="sm" variant="ghost" onClick={() => setEditingFrequencyId(null)} className="h-5 w-5 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant={getFrequencyBadgeVariant(service.frecuencia)}
                            className="text-xs cursor-pointer hover:ring-1 hover:ring-primary/50"
                            onClick={() => setEditingFrequencyId(service.id)}
                            title="Clic para cambiar frecuencia"
                          >
                            {service.frecuencia}
                          </Badge>
                        )}
                        {!service.active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{service.tipoServicio}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {service.numeroPagos} pagos
                  </Badge>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${!service.active ? 'opacity-60' : ''}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Último pago:</span>
                        <div className="font-medium">{service.ultimoPago.mes}</div>
                        <div className="flex items-center gap-1">
                          <span className="text-primary font-bold text-lg">
                            ${formatCurrency(service.ultimoPago.monto)}
                          </span>
                          {service.previousPaymentAmount != null && service.previousPaymentAmount !== service.ultimoPago.monto && (
                            <span title={`Anterior: $${formatCurrency(service.previousPaymentAmount)}`}>
                              {service.ultimoPago.monto > service.previousPaymentAmount
                                ? <TrendingUp className="h-4 w-4 text-destructive" />
                                : <TrendingDown className="h-4 w-4 text-success" />
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Próximo pago estimado:</span>
                        <div className="font-medium">
                          {service.proximoPago.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Repeat className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Frecuencia: {service.frecuencia}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!mergeSourceId} onOpenChange={(open) => { if (!open) { setMergeSourceId(null); setMergeTargetId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fusionar suscripción</DialogTitle>
            <DialogDescription>
              Une <strong>{services.find(s => s.id === mergeSourceId)?.serviceName}</strong> con otra suscripción. Los cargos actuales y futuros se agruparán bajo la suscripción destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Fusionar en:</label>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la suscripción destino" />
              </SelectTrigger>
              <SelectContent>
                {services
                  .filter(s => s.id !== mergeSourceId)
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.serviceName}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMergeSourceId(null); setMergeTargetId(''); }}>Cancelar</Button>
            <Button onClick={performMerge} disabled={!mergeTargetId || merge.isPending}>Fusionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
```

- [ ] `wc -l src/components/SubscriptionsManager.tsx` → < 500. `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio, `#/suscripciones`, con datos reales): Red muestra `subscription_services` (select) y, si hay cambios, un `PATCH`/`POST` por fila cambiada; no hay consultas a `subscription_services` con `canon_key=eq.`. Anthropic pasa a **Mensual** con próximo pago 8 de septiembre si en los últimos 24 meses tiene al menos dos ciclos de cargo (30/7 y 8/8 son un solo ciclo colapsado); si solo existen esos dos cargos queda `Irregular` con próximo pago 8 de septiembre — correcto, no es fallo; Spotify y las editadas a mano conservan su frecuencia; ningún nombre ni estado activo cambia; los iconos de tendencia se ven. Recargar la página: no se repiten escrituras (0 `PATCH`). Editar nombre (y probar un duplicado → toast "Ya existe otra suscripción con ese nombre"), cambiar frecuencia (la fila se actualiza y en Red el `PATCH` lleva `frecuencia_manual: true`), desactivar/activar y "Mostrar inactivas", fusionar dos (la fusionada desaparece y el destino suma pagos). Móvil 390×844 `#/suscripciones`: Anthropic "Este mes · 08 sept 2026".
- [ ] Commit: `git add src/components/SubscriptionsManager.tsx src/hooks/useSubscriptionServices.ts && git commit -m "SubscriptionsManager sobre la caché y la detección pura; ediciones que invalidan" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 2.6: `useAlerts` usa `useSubscriptionServices`; `alerts.ts` acepta las filas de BD

**Files**
- Modify: `src/lib/finance/alerts.ts` (`SubscriptionForAlerts`, `subscriptionIncreaseAlerts`)
- Modify: `src/lib/finance/alerts.test.ts` (fixture `netflix`)
- Modify: `src/hooks/useAlerts.ts` (quitar `fetchSubscriptions` y su query)

**Interfaces**
- Produces:
  ```ts
  export interface SubscriptionForAlerts { id: string; service_name: string; active: boolean; original_comments: string[] }  // SubscriptionService es asignable
  ```

- [ ] En `src/lib/finance/alerts.test.ts` sustituir `const netflix = { id: 's1', serviceName: 'Netflix', active: true, originalComments: ['NETFLIX.COM'] };` por `const netflix = { id: 's1', service_name: 'Netflix', active: true, original_comments: ['NETFLIX.COM'] };`.
- [ ] `npx vitest run src/lib/finance/alerts.test.ts` → falla (tipo/campos).
- [ ] En `src/lib/finance/alerts.ts` sustituir la interfaz

```ts
export interface SubscriptionForAlerts {
  id: string;
  serviceName: string;
  active: boolean;
  originalComments: string[];
}
```
  por
```ts
/** Subconjunto de subscription_services que usan las alertas (la fila completa es asignable). */
export interface SubscriptionForAlerts {
  id: string;
  service_name: string;
  active: boolean;
  original_comments: string[];
}
```
  y en `subscriptionIncreaseAlerts`: `.filter(s => s.active && s.originalComments.length > 0)` → `.filter(s => s.active && s.original_comments.length > 0)`; `const comments = new Set(s.originalComments);` → `const comments = new Set(s.original_comments);`; `title: s.serviceName,` → `title: s.service_name,`.

- [ ] `npx vitest run src/lib/finance/alerts.test.ts` → verde.
- [ ] En `src/hooks/useAlerts.ts`: borrar la función `fetchSubscriptions` completa y su comentario "Temporal hasta la fase 2"; borrar `SubscriptionForAlerts` del import de `@/lib/finance/alerts`; añadir `import { useSubscriptionServices } from './useSubscriptionServices';`; borrar el bloque `const subscriptionsQuery = useQuery({ queryKey: ['finance', user?.id, 'subscriptions-for-alerts'], … });` y en su lugar poner `const { subscriptions, loading: subsLoading } = useSubscriptionServices();`; en `computeAlerts({ … subscriptions: subscriptionsQuery.data ?? [] … })` usar `subscriptions` y en las deps del `useMemo` sustituir `subscriptionsQuery.data` por `subscriptions`; en `loading:` sustituir `subscriptionsQuery.isPending` por `subsLoading`.
- [ ] `grep -rn "subscriptions-for-alerts" src` → sin resultados. `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual: `#/alertas` muestra las mismas alertas de suscripción; Red no muestra un segundo select de `subscription_services` con `select=id,service_name…`.
- [ ] Commit: `git add src/lib/finance/alerts.ts src/lib/finance/alerts.test.ts src/hooks/useAlerts.ts && git commit -m "Las alertas leen las suscripciones de la caché compartida" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 2.7: Changelog 7.5 + build + verificación manual

**Files**
- Modify: `src/components/Changelog.tsx`

- [ ] Insertar al principio del array `changelog`:

```tsx
  {
    version: '7.5',
    date: 'Septiembre 2026',
    changes: [
      { icon: <Sparkles className="h-4 w-4" />, text: 'Suscripciones: la frecuencia se calcula con la mediana de los intervalos y un cargo de cambio de plan ya no la vuelve "Irregular"; las frecuencias editadas a mano se respetan siempre', type: 'improvement' },
      { icon: <Zap className="h-4 w-4" />, text: 'La detección de suscripciones es una función compartida con tests y hace una fracción de las consultas de antes; tras importar un archivo el móvil las ve al día', type: 'improvement' },
      { icon: <Bug className="h-4 w-4" />, text: 'El próximo pago se recalcula siempre desde el último cargo real; frecuencias Semanal y Trimestral disponibles al editar', type: 'fix' },
    ],
  },
```

- [ ] `npx vitest run` → verde. `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npm run build` → sin errores.
- [ ] Verificación manual (spec fase 2): con datos reales, escritorio `#/suscripciones` y móvil `#/suscripciones` coinciden en frecuencias y próximos pagos; el gestor sigue mostrando inactivas con el toggle y los iconos de tendencia.
- [ ] Commit: `git add src/components/Changelog.tsx && git commit -m "Changelog 7.5" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

## Fase 3 — Alertas con corte de datos y aviso en el móvil (versión 7.6)

### Task 3.1: `alerts.ts` con la regla del corte de datos + tests con `now = 20 sep 2026`

**Files**
- Modify: `src/lib/finance/alerts.ts` (`ALERT_RULES` comentarios, `annualPaymentAlerts`, `categorySpikeAlerts`)
- Modify: `src/lib/finance/alerts.test.ts` (reescritura completa)

**Interfaces**
- Sin cambio de firmas. `categorySpikeAlerts` evalúa el mes de `finMesAnterior(now)`; `annualPaymentAlerts` solo alerta vencidos si `due ≤ corte` y `corte − due ≤ 30 días`.

- [ ] Sustituir el contenido completo de `src/lib/finance/alerts.test.ts` por:

```ts
import { describe, expect, it } from 'vitest';
import { Category, Transaction } from '@/types/finance';
import { annualPaymentAlerts, categorySpikeAlerts, subscriptionIncreaseAlerts } from './alerts';

// "Hoy" fijo: 20 de septiembre de 2026 → corte de datos 31 de agosto
const NOW = new Date(2026, 8, 20);
// Transaction.fecha real es medianoche UTC
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

const cat = (over: Partial<Category>): Category => ({ id: 'c1', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos', ...over });
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: utc(2026, 7, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

describe('annualPaymentAlerts', () => {
  const seguro = cat({ id: 'seg', categoria: 'Seguros', subcategoria: 'Seguro coche', frecuencia_seguimiento: 'anual' });
  const pago = (fecha: Date) => [tx({ subcategoriaId: 'seg', gasto: 12000, comentario: 'SEGURO AUTO', fecha })];

  it('avisa cuando el próximo pago (último + 1 año) cae en ≤15 días desde hoy', () => {
    const [a] = annualPaymentAlerts([seguro], pago(new Date(2025, 8, 25)), new Set(), NOW);
    expect(a).toBeDefined();
    expect(a.detail).toContain('vence en 5 días');
    expect(a.amount).toBe(12000);
    expect(a.severity).toBe('media');
    expect(a.key).toBe('pago_anual:seg-seguro auto:2026-09-25');
  });

  it('un vencimiento pasado dentro del mes en curso no alerta (pendiente de importar)', () => {
    expect(annualPaymentAlerts([seguro], pago(new Date(2025, 8, 5)), new Set(), NOW)).toHaveLength(0);
  });

  it('un vencimiento en un mes cerrado alerta (alta) si dista ≤30 días del corte', () => {
    const [a] = annualPaymentAlerts([seguro], pago(new Date(2025, 7, 5)), new Set(), NOW);
    expect(a).toBeDefined();
    expect(a.severity).toBe('alta');
    expect(a.detail).toContain('venció hace 46 días');
  });

  it('calla si el vencimiento dista más de 30 días del corte', () => {
    expect(annualPaymentAlerts([seguro], pago(new Date(2025, 6, 20)), new Set(), NOW)).toHaveLength(0);
  });

  it('no avisa si falta más de 15 días ni si el pago está marcado inactivo', () => {
    expect(annualPaymentAlerts([seguro], pago(new Date(2025, 10, 1)), new Set(), NOW)).toHaveLength(0);
    const txs = pago(new Date(2025, 8, 30));
    const [a] = annualPaymentAlerts([seguro], txs, new Set(), NOW);
    expect(annualPaymentAlerts([seguro], txs, new Set([a.key.split(':')[1]]), NOW)).toHaveLength(0);
  });
});

describe('subscriptionIncreaseAlerts', () => {
  const netflix = { id: 's1', service_name: 'Netflix', active: true, original_comments: ['NETFLIX.COM'] };

  it('avisa cuando el último cobro supera al anterior', () => {
    const [a] = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 219, fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, fecha: utc(2026, 7, 3) }),
    ]);
    expect(a.title).toBe('Netflix');
    expect(a.detail).toContain('219.00 a 249.00');
    expect(a.key).toBe('suscripcion_sube:s1:p2');
  });

  it('calla si el precio no sube, si la suscripción está inactiva o si cambia la divisa', () => {
    const igual = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 249, fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, fecha: utc(2026, 7, 3) }),
    ]);
    expect(igual).toHaveLength(0);
    const inactiva = subscriptionIncreaseAlerts([{ ...netflix, active: false }], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 1, fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 9, fecha: utc(2026, 7, 3) }),
    ]);
    expect(inactiva).toHaveLength(0);
    const divisa = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 10, divisa: 'USD', fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, divisa: 'MXN', fecha: utc(2026, 7, 3) }),
    ]);
    expect(divisa).toHaveLength(0);
  });
});

describe('categorySpikeAlerts', () => {
  const luz = cat({ id: 'c1', categoria: 'Casa', subcategoria: 'Luz' });
  const agua = cat({ id: 'c2', categoria: 'Casa', subcategoria: 'Agua' });
  // 6 meses anteriores al mes cerrado (agosto): julio … febrero
  const history = (amount: number, months = 6) =>
    Array.from({ length: months }, (_, i) => tx({ id: `h${i}`, gasto: amount, fecha: utc(2026, 6 - i, 10) }));

  it('evalúa el último mes cerrado (agosto) contra los 12 anteriores', () => {
    const [a] = categorySpikeAlerts([luz], [...history(1000), tx({ id: 'ago', gasto: 1500 })], NOW);
    expect(a).toBeDefined();
    expect(a.title).toBe('Casa');
    expect(a.detail).toContain('agosto');
    expect(a.detail).toContain('+50%');
    expect(a.key).toBe('categoria_disparada:Casa:2026-08');
    expect(a.date).toEqual(new Date(2026, 7, 1));
    expect(a.href).toContain('monthNum=7&yearNum=2026');
  });

  it('el gasto del mes en curso (septiembre) no se evalúa', () => {
    const txs = [...history(1000), tx({ id: 'ago', gasto: 1000 }), tx({ id: 'sep', gasto: 9000, fecha: utc(2026, 8, 5) })];
    expect(categorySpikeAlerts([luz], txs, NOW)).toHaveLength(0);
  });

  it('un cargo del 1 de septiembre a medianoche UTC cuenta en septiembre, no en agosto', () => {
    const base = [...history(1000), tx({ id: 'ago', gasto: 1000 })];
    expect(categorySpikeAlerts([luz], [...base, tx({ id: 's1', gasto: 5000, fecha: new Date('2026-09-01') })], NOW)).toHaveLength(0);
    expect(categorySpikeAlerts([luz], [...history(1000), tx({ id: 'a1', gasto: 5000, fecha: new Date('2026-08-01') })], NOW)).toHaveLength(1);
  });

  it('agrupa subcategorías en su categoría y neta los reembolsos', () => {
    const txs = [...history(1000), tx({ id: 'a', gasto: 900 }), tx({ id: 'b', subcategoriaId: 'c2', gasto: 900 }), tx({ id: 'r', ingreso: 500 })];
    // 900 + 900 − 500 = 1300 < 1400 → no alerta
    expect(categorySpikeAlerts([luz, agua], txs, NOW)).toHaveLength(0);
    // sin reembolso: 1800 ≥ 1400 → alerta
    expect(categorySpikeAlerts([luz, agua], txs.filter(t => t.id !== 'r'), NOW)).toHaveLength(1);
  });

  it('ignora categorías con poca historia, media pequeña, anuales e inmuebles', () => {
    expect(categorySpikeAlerts([luz], [...history(1000, 2), tx({ gasto: 5000 })], NOW)).toHaveLength(0);
    expect(categorySpikeAlerts([luz], [...history(100), tx({ gasto: 400 })], NOW)).toHaveLength(0);
    const anual = cat({ id: 'c1', frecuencia_seguimiento: 'anual' });
    expect(categorySpikeAlerts([anual], [...history(1000), tx({ gasto: 5000 })], NOW)).toHaveLength(0);
    const inmueble = cat({ id: 'c1', categoria: 'Compra Venta Inmuebles' });
    expect(categorySpikeAlerts([inmueble], [...history(1000), tx({ gasto: 5000 })], NOW)).toHaveLength(0);
  });
});
```

- [ ] `npx vitest run src/lib/finance/alerts.test.ts` → fallan los tests de corte (mes en curso, vencidos).
- [ ] En `src/lib/finance/alerts.ts`:
  1. Sustituir `import { toFechaISO } from './fechas';` por `import { finMesAnterior, toFechaISO } from './fechas';`.
  2. En `ALERT_RULES` sustituir el comentario `/** Pago anual: avisar cuando falten ≤ N días (o ya haya vencido hasta hace N días). */` por `/** Pago anual: avisar cuando falten ≤ N días desde hoy. */` y, antes de `annualDaysOverdue: 30,`, añadir la línea `/** Pago anual vencido: solo si el vencimiento cae ≤ N días antes del corte de datos (fin del mes anterior); lo vencido en el mes en curso está pendiente de importar. */`. Sustituir `/** Categoría: gasto del mes respecto a la media de los 12 meses anteriores. */` por `/** Categoría: gasto del último mes cerrado respecto a la media de los 12 meses anteriores a ese. */`.
  3. Sustituir la función `annualPaymentAlerts` completa por:

```ts
export const annualPaymentAlerts = (categories: Category[], transactions: Transaction[], inactive: Set<string>, now: Date): Alert[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const corte = finMesAnterior(now);
  const corteDia = new Date(corte.getFullYear(), corte.getMonth(), corte.getDate());
  return groupAnnualPayments(categories, transactions)
    .filter(g => !inactive.has(g.id))
    .flatMap(g => {
      const due = new Date(g.nextPayment.getFullYear(), g.nextPayment.getMonth(), g.nextPayment.getDate());
      const days = Math.round((due.getTime() - today.getTime()) / dayMs);
      if (days > ALERT_RULES.annualDaysAhead) return [];
      if (days < 0) {
        // Vencido: solo cuenta si cae en un mes ya importado (≤ corte) y a ≤ N días del corte.
        // groupAnnualPayments ya adelanta nextPayment un año cuando el pago existe.
        const diasAntesDelCorte = Math.round((corteDia.getTime() - due.getTime()) / dayMs);
        if (diasAntesDelCorte < 0 || diasAntesDelCorte > ALERT_RULES.annualDaysOverdue) return [];
      }
      const when = days < 0 ? `venció hace ${-days} día${days === -1 ? '' : 's'}` : days === 0 ? 'vence hoy' : `vence en ${days} día${days === 1 ? '' : 's'}`;
      const currency = g.history[0] ? transactions.find(t => t.comentario === g.history[0].comment && t.subcategoriaId === g.categoryId)?.divisa ?? 'MXN' : 'MXN';
      return [{
        key: `pago_anual:${g.id}:${toFechaISO(due)}`,
        type: 'pago_anual' as const,
        title: g.concept,
        detail: `${g.subcategoryName} · ${when} (último pago ${g.lastDate.getDate()} de ${MONTH_NAMES[g.lastDate.getMonth()]} de ${g.lastDate.getFullYear()})`,
        amount: g.lastAmount,
        currency,
        date: due,
        href: '/pagos-anuales',
        severity: days <= 0 ? 'alta' as const : 'media' as const,
      }];
    });
};
```
  4. En `categorySpikeAlerts`: sustituir el docblock por

```ts
/**
 * Categoría (nivel `categoria`, no subcategoría) cuyo gasto neto del ÚLTIMO MES
 * CERRADO (corte de datos: el mes en curso aún no está importado) supera en
 * `categoryOverRatio` la media de los 12 meses anteriores con gasto.
 * Se excluyen inmuebles y las categorías con seguimiento anual (picos por diseño).
 * La clave `categoria_disparada:<categoria>:<yyyy-mm>` es la que se habría generado
 * en su momento, así que los descartes no resucitan.
 */
```
  sustituir
```ts
  const year = now.getFullYear();
  const month = now.getMonth();
```
  por
```ts
  const corte = finMesAnterior(now);
  const year = corte.getFullYear();
  const month = corte.getMonth();
```
  y sustituir
```ts
    const ym = `${t.fecha.getFullYear()}-${t.fecha.getMonth()}`;
```
  por
```ts
    // Transaction.fecha es medianoche UTC: con getters locales un cargo del día 1 caería en el mes anterior.
    const ym = `${t.fecha.getUTCFullYear()}-${t.fecha.getUTCMonth()}`;
```
  El resto (`currentKey`, `previous` con `new Date(year, month - i, 1)`, `key`, `detail`, `date`, `href`) queda igual y pasa a referirse al mes cerrado.

- [ ] `npx vitest run src/lib/finance/alerts.test.ts` → verde. `npx vitest run` → verde.
- [ ] Commit: `git add src/lib/finance/alerts.ts src/lib/finance/alerts.test.ts && git commit -m "Alertas: gasto disparado del último mes cerrado y vencidos juzgados contra el corte de datos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 3.2: `AlertasResumen` en `ResumenMovil`

**Files**
- Create: `src/components/movil/AlertasResumen.tsx`
- Modify: `src/pages/movil/ResumenMovil.tsx`
- Test: ninguno (UI; verificación manual)

**Interfaces**
- Consumes: `useAlerts()` (`alerts`, `loading`), `Importe`, `Seccion`.
- Produces: `export const AlertasResumen: () => JSX.Element | null` (null si carga o N = 0).

- [ ] Crear `src/components/movil/AlertasResumen.tsx`:

```tsx
import { CalendarClock, CreditCard, TrendingUp } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertType } from '@/lib/finance/alerts';
import { Card, CardContent } from '@/components/ui/card';
import { Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const ICONO: Record<AlertType, typeof CalendarClock> = {
  pago_anual: CalendarClock,
  suscripcion_sube: CreditCard,
  categoria_disparada: TrendingUp,
};

/**
 * Alertas activas (no descartadas) en el Resumen móvil. Solo lectura; si no hay,
 * no se pinta. Comparte la caché de useAlerts con el escritorio.
 */
export const AlertasResumen = () => {
  const { alerts, loading } = useAlerts();
  if (loading || alerts.length === 0) return null;

  return (
    <Seccion titulo={`Alertas (${alerts.length})`}>
      <Card className="border-destructive/40">
        <CardContent className="p-4">
          {alerts.map((a) => {
            const Icon = ICONO[a.type];
            return (
              <div key={a.key} className="flex items-start gap-3 min-h-12 py-3 border-t first:border-t-0 first:pt-0 last:pb-0">
                <div className={cn('p-2 rounded-lg shrink-0', a.severity === 'alta' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.detail}</p>
                  <div className="mt-1">
                    <Importe amount={a.amount} currency={a.currency} />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </Seccion>
  );
};
```

- [ ] En `src/pages/movil/ResumenMovil.tsx`: añadir `import { AlertasResumen } from '@/components/movil/AlertasResumen';` tras el import de `Cargando, Importe, Seccion`; y justo antes de `{/* 1. Patrimonio neto */}` insertar:

```tsx
      {/* 0. Alertas activas (solo si hay) */}
      <AlertasResumen />
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (móvil 390×844, `#/dashboard`): si hay alertas activas, aparece arriba del patrimonio la sección "ALERTAS (N)" con icono, título, detalle a 14px e importe con divisa, sin botón de descartar; en escritorio `#/alertas` descartar una y volver al móvil: N baja sin recargar. Sin alertas: la sección no aparece. Red: sin peticiones nuevas más allá de `alert_dismissals` y, si aún no se visitó Suscripciones, `subscription_services` (ya cacheada).
- [ ] Commit: `git add src/components/movil/AlertasResumen.tsx src/pages/movil/ResumenMovil.tsx && git commit -m "Tarjeta de alertas activas en el Resumen móvil" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 3.3: Textos de `Alertas.tsx` + Changelog 7.6 + build

**Files**
- Modify: `src/pages/Alertas.tsx` (subtítulo)
- Modify: `src/components/Changelog.tsx`

- [ ] En `src/pages/Alertas.tsx` sustituir el párrafo

```tsx
          <p className="text-muted-foreground">
            Pagos anuales a ≤{ALERT_RULES.annualDaysAhead} días, suscripciones que suben de precio y categorías un {Math.round((ALERT_RULES.categoryOverRatio - 1) * 100)}% por encima de su media
          </p>
```
  por
```tsx
          <p className="text-muted-foreground">
            Pagos anuales a ≤{ALERT_RULES.annualDaysAhead} días o vencidos en el último mes cerrado, suscripciones que suben de precio y categorías cuyo gasto del último mes cerrado supera en un {Math.round((ALERT_RULES.categoryOverRatio - 1) * 100)}% su media de los 12 meses anteriores
          </p>
```

- [ ] Insertar al principio del array `changelog` de `src/components/Changelog.tsx`:

```tsx
  {
    version: '7.6',
    date: 'Septiembre 2026',
    changes: [
      { icon: <Sparkles className="h-4 w-4" />, text: 'Alertas en el Resumen móvil: las activas se muestran arriba del patrimonio (solo lectura)', type: 'feature' },
      { icon: <Bug className="h-4 w-4" />, text: 'Gasto inusual: se evalúa el último mes cerrado (el mes en curso aún no está importado), y un pago anual "vencido" solo alerta si venció en un mes ya importado', type: 'fix' },
    ],
  },
```

- [ ] `npx vitest run` → verde. `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npm run build` → sin errores.
- [ ] Verificación manual: escritorio `#/alertas` muestra el nuevo subtítulo y las alertas de "Gasto inusual" refieren a agosto (mes cerrado), no a septiembre; el pie del sidebar dice `v7.6`.
- [ ] Commit: `git add src/pages/Alertas.tsx src/components/Changelog.tsx && git commit -m "Changelog 7.6 y texto de Alertas con el mes de referencia" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

<!-- FIN PARTE 3/4 -->

<!-- PARTE 4/4 -->

## Fase 4 — Importación: parser robusto y categorización explicable (versión 7.7)

> Antes de la Task 4.1, guardar en `$TMPDIR` los fixtures de verificación manual (se reutilizan en 4.6): `coma.csv` (separador `,`, formato que el importador actual ya lee: es el ÚNICO válido para la red "antes/después", porque hoy un CSV con `;` no produce filas), `es.csv` (separador `;`, `1.234,56`; solo "después"), `latin1.csv` (guardado en Windows-1252 con acentos), `importe_saldo.xlsx` (columnas Fecha, Concepto, Importe, Saldo) y `sin_fecha.csv` (una fila sin fecha). Importar `coma.csv` con la versión actual y anotar las filas resultantes (fecha, descripción, monto, categoría sugerida). Importar `es.csv` en 7.6 y anotar las filas/categorías resultantes: es la red "antes/después".

### Task 4.1: `findMatchingRuleDetailed` en `src/lib/classificationRules.ts` con tests; el hook envuelve

**Files**
- Modify: `src/lib/classificationRules.ts`
- Test: `src/lib/classificationRules.test.ts` (nuevo)
- Modify: `src/hooks/useClassificationRules.ts` (`findMatchingRule` y nuevo `findMatchingRuleDetailed`)

**Interfaces**
- Produces:
  ```ts
  export interface ClassificationRuleLike { name: string | null; keyword: string; match_type: ClassificationMatchType; category_id: string; cuenta_id: string | null; active: boolean; amount_min: number | null; amount_max: number | null }
  export interface RuleMatch { category_id: string; name: string | null; keyword: string }
  export const findMatchingRuleDetailed = (rules: ClassificationRuleLike[], description: string, amount?: number, accountId?: string): RuleMatch | null
  useClassificationRules(): { …igual…; findMatchingRule(description, amount?, accountId?): string | null; findMatchingRuleDetailed(description, amount?, accountId?): RuleMatch | null }
  ```

- [ ] Crear `src/lib/classificationRules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ClassificationRuleLike, findMatchingRuleDetailed } from './classificationRules';

const rule = (over: Partial<ClassificationRuleLike>): ClassificationRuleLike => ({
  name: 'Netflix', keyword: 'netflix', match_type: 'contains', category_id: 'cat-netflix',
  cuenta_id: null, active: true, amount_min: null, amount_max: null, ...over,
});

describe('findMatchingRuleDetailed', () => {
  it('devuelve la primera regla activa que coincide (las reglas llegan ordenadas por prioridad) con la keyword que acertó', () => {
    const rules = [
      rule({ name: 'Inactiva', active: false }),
      rule({ name: 'Streaming', keyword: 'spotify, netflix', category_id: 'cat-stream' }),
      rule({ name: 'Netflix' }),
    ];
    expect(findMatchingRuleDetailed(rules, 'NETFLIX.COM MX')).toEqual({ category_id: 'cat-stream', name: 'Streaming', keyword: 'netflix' });
    expect(findMatchingRuleDetailed(rules, 'UBER EATS')).toBeNull();
  });

  it('filtra por cuenta: una regla con cuenta_id solo aplica a esa cuenta y exige accountId', () => {
    const rules = [rule({ cuenta_id: 'a1' })];
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', undefined, 'a1')?.category_id).toBe('cat-netflix');
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', undefined, 'a2')).toBeNull();
    expect(findMatchingRuleDetailed(rules, 'NETFLIX')).toBeNull();
  });

  it('filtra por importe: min/max son condiciones AND y exigen amount', () => {
    const rules = [rule({ amount_min: 100, amount_max: 300 })];
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', 199)?.category_id).toBe('cat-netflix');
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', 50)).toBeNull();
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', 500)).toBeNull();
    expect(findMatchingRuleDetailed(rules, 'NETFLIX')).toBeNull();
  });

  it('respeta match_type exact y starts_with', () => {
    expect(findMatchingRuleDetailed([rule({ match_type: 'exact' })], 'netflix')?.keyword).toBe('netflix');
    expect(findMatchingRuleDetailed([rule({ match_type: 'exact' })], 'netflix mx')).toBeNull();
    expect(findMatchingRuleDetailed([rule({ match_type: 'starts_with' })], 'NETFLIX MX')?.keyword).toBe('netflix');
    expect(findMatchingRuleDetailed([rule({ match_type: 'starts_with' })], 'PAGO NETFLIX')).toBeNull();
  });
});
```

- [ ] `npx vitest run src/lib/classificationRules.test.ts` → falla (no existe la función).
- [ ] Añadir al final de `src/lib/classificationRules.ts`:

```ts
/** Campos de classification_rules que usa la búsqueda (la fila completa del hook es asignable). */
export interface ClassificationRuleLike {
  name: string | null;
  keyword: string;
  match_type: ClassificationMatchType;
  category_id: string;
  cuenta_id: string | null;
  active: boolean;
  amount_min: number | null;
  amount_max: number | null;
}

export interface RuleMatch {
  category_id: string;
  name: string | null;
  /** Primera palabra clave de la lista de la regla que coincidió. */
  keyword: string;
}

/**
 * Primera regla activa (las reglas llegan ordenadas por prioridad desc) cuya
 * palabra clave, cuenta e importe coinciden. Misma lógica que tenía el hook.
 */
export const findMatchingRuleDetailed = (
  rules: ClassificationRuleLike[],
  description: string,
  amount?: number,
  accountId?: string,
): RuleMatch | null => {
  for (const rule of rules) {
    if (!rule.active) continue;

    const keyword = splitClassificationKeywords(rule.keyword)
      .find((k) => matchesClassificationKeyword(description, k, rule.match_type));
    if (keyword === undefined) continue;

    // Account filter — if rule specifies an account, it must match
    if (rule.cuenta_id !== null && accountId !== undefined && rule.cuenta_id !== accountId) continue;
    if (rule.cuenta_id !== null && accountId === undefined) continue;

    // Amount filters are AND conditions — both keyword AND amount must match
    if (rule.amount_min !== null && amount !== undefined && amount < rule.amount_min) continue;
    if (rule.amount_max !== null && amount !== undefined && amount > rule.amount_max) continue;
    // If rule has amount filters but no amount provided, skip this rule
    if ((rule.amount_min !== null || rule.amount_max !== null) && amount === undefined) continue;

    return { category_id: rule.category_id, name: rule.name, keyword };
  }
  return null;
};
```

- [ ] `npx vitest run src/lib/classificationRules.test.ts` → verde.
- [ ] En `src/hooks/useClassificationRules.ts`: sustituir `import { ClassificationMatchType, matchesClassificationRule } from '@/lib/classificationRules';` por `import { ClassificationMatchType, findMatchingRuleDetailed as findDetailed, RuleMatch } from '@/lib/classificationRules';`; sustituir la función `findMatchingRule` completa (desde `const findMatchingRule = (description: string, …` hasta su `};`) por:

```ts
  const findMatchingRuleDetailed = (description: string, amount?: number, accountId?: string): RuleMatch | null =>
    findDetailed(rules, description, amount, accountId);

  const findMatchingRule = (description: string, amount?: number, accountId?: string): string | null =>
    findMatchingRuleDetailed(description, amount, accountId)?.category_id ?? null;
```
  y en el `return` añadir `findMatchingRuleDetailed` tras `findMatchingRule`.

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npx vitest run` → verde.
- [ ] Commit: `git add src/lib/classificationRules.ts src/lib/classificationRules.test.ts src/hooks/useClassificationRules.ts && git commit -m "findMatchingRuleDetailed como función pura con tests" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 4.2: `bankStatementParser.ts` (puro, asíncrono) con tests

**Files**
- Create: `src/lib/import/bankStatementParser.ts`
- Test: `src/lib/import/bankStatementParser.test.ts`

**Interfaces**
- Consumes: `papaparse`, `xlsx` (import dinámico).
- Produces:
  ```ts
  export type DateHint = 'auto' | 'DMY' | 'MDY';
  export interface RawMovement { sourceRow: number; fecha: Date; descripcion: string; montoOriginal: number; cargoAbono?: 'cargo' | 'abono'; tarjetahabiente?: string }
  export type SkipReason = 'sin_fecha' | 'monto_cero' | 'monto_invalido';
  export interface SkippedRow { sourceRow: number; reason: SkipReason; cells: string[] }
  export interface ParseMeta { delimiter?: string; encoding: 'utf-8' | 'windows-1252'; ambiguousDate: boolean }
  export interface ParseResult { movements: RawMovement[]; skipped: SkippedRow[]; meta: ParseMeta }
  export function parseAmount(amountStr: string): number
  export function parseDate(dateStr: string, formatHint?: DateHint): Date | null
  export function detectDateAmbiguity(rows: string[][], dateCol: number): boolean
  export function stripPreamble(rows: string[][]): string[][]
  export function detectFormat(lines: string[][]): { dateCol: number; descCol: number; amountCol: number; hasHeader: boolean }
  export function excelSerialToDate(serial: number): Date | null
  export function decodeBytes(bytes: Uint8Array): { text: string; encoding: ParseMeta['encoding'] }
  export function parseRows(rawRows: string[][], hint?: DateHint): { movements: RawMovement[]; skipped: SkippedRow[]; ambiguousDate: boolean }
  export function parseCsvText(text: string, hint?: DateHint): { movements; skipped; ambiguousDate; delimiter: string }
  export function parseExcelBytes(data: ArrayBuffer | Uint8Array, hint?: DateHint): Promise<{ movements; skipped; ambiguousDate }>
  export const esExcel = (filename: string): boolean
  export async function parseBankStatement(bytes: ArrayBuffer, filename: string, hint?: DateHint): Promise<ParseResult>
  ```

- [ ] Crear `src/lib/import/bankStatementParser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { decodeBytes, detectDateAmbiguity, parseAmount, parseBankStatement, parseCsvText, parseDate, parseRows } from './bankStatementParser';

const utf8 = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer as ArrayBuffer;
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('parseAmount', () => {
  it('europeo, americano, símbolos y signo', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('-$1,234.56')).toBe(-1234.56);
    expect(parseAmount('129,00 EUR')).toBe(129);
    expect(parseAmount('N/A')).toBe(0);
    expect(parseAmount('')).toBe(0);
  });
});

describe('parseDate', () => {
  it('DD/MM/YYYY por defecto, MM/DD con pista, ISO y "DD Mon YYYY", siempre en local', () => {
    expect(parseDate('05/08/2026')).toEqual(local(2026, 8, 5));
    expect(parseDate('05/08/2026', 'MDY')).toEqual(local(2026, 5, 8));
    expect(parseDate('25/08/2026', 'MDY')).toEqual(local(2026, 8, 25)); // 25 no puede ser mes
    expect(parseDate('2026-08-05')).toEqual(local(2026, 8, 5));
    expect(parseDate('5 ago 2026')).toEqual(local(2026, 8, 5));
    expect(parseDate('sin fecha')).toBeNull();
  });
});

describe('detectDateAmbiguity', () => {
  it('es ambiguo cuando día y mes son ≤ 12', () => {
    expect(detectDateAmbiguity([['01/02/2026']], 0)).toBe(true);
    expect(detectDateAmbiguity([['25/02/2026']], 0)).toBe(false);
  });
});

describe('decodeBytes', () => {
  it('UTF-8 (quitando BOM) y Latin-1 cuando los bytes no son UTF-8 válidos', () => {
    const conBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Fecha')]);
    expect(decodeBytes(conBom)).toEqual({ text: 'Fecha', encoding: 'utf-8' });
    const latin1 = new Uint8Array([0x43, 0x41, 0x46, 0xc9]); // "CAFÉ" en Windows-1252
    expect(decodeBytes(latin1)).toEqual({ text: 'CAFÉ', encoding: 'windows-1252' });
  });
});

describe('parseCsvText', () => {
  it('autodetecta el separador ; y decimales europeos', () => {
    const r = parseCsvText('Fecha;Concepto;Importe\n05/08/2026;NETFLIX;-1.234,56\n');
    expect(r.delimiter).toBe(';');
    expect(r.movements).toHaveLength(1);
    expect(r.movements[0]).toMatchObject({ sourceRow: 0, descripcion: 'NETFLIX', montoOriginal: -1234.56 });
    expect(r.movements[0].fecha).toEqual(local(2026, 8, 5));
  });

  it('columnas Cargo/Abono: importe absoluto y cargoAbono', () => {
    const r = parseCsvText('Fecha,Descripción,Cargo,Abono\n01/08/2026,PAGO LUZ,500,\n02/08/2026,NOMINA,,"10,000.00"\n');
    expect(r.movements[0]).toMatchObject({ montoOriginal: 500, cargoAbono: 'cargo' });
    expect(r.movements[1]).toMatchObject({ montoOriginal: 10000, cargoAbono: 'abono' });
  });

  it('preámbulo BBVA y campo multilínea AMEX', () => {
    const r = parseCsvText('Cuenta: 123\nDETALLE DE MOVIMIENTOS\n\nFecha,Descripción,Cargo,Abono,Saldo\n01/08/2026,"AMEX\nMADRID",100,,900\n');
    expect(r.movements).toHaveLength(1);
    expect(r.movements[0].descripcion).toBe('AMEX\nMADRID');
    expect(r.movements[0].montoOriginal).toBe(100);
  });

  it('descarta con motivo: sin fecha, monto cero, monto inválido', () => {
    const r = parseCsvText('Fecha,Concepto,Importe\nTotal,,\n05/08/2026,CERO,0\n06/08/2026,RARO,N/A\n07/08/2026,OK,10\n');
    expect(r.movements).toHaveLength(1);
    expect(r.skipped.map(s => s.reason)).toEqual(['sin_fecha', 'monto_cero', 'monto_invalido']);
    expect(r.skipped[0].cells).toEqual(['Total', '', '']);
    expect(r.skipped[1].sourceRow).toBe(1);
  });

  it('detecta la columna Tarjetahabiente y la ambigüedad de fechas', () => {
    const r = parseCsvText('Fecha,Descripción,Importe,Titular\n01/02/2026,UBER,120,MANUEL\n');
    expect(r.movements[0].tarjetahabiente).toBe('MANUEL');
    expect(r.ambiguousDate).toBe(true);
  });
});

describe('parseRows', () => {
  it('sin cabecera, la única columna numérica que no es fecha se toma como importe', () => {
    const r = parseRows([['05/08/2026', 'CONCEPTO SIN CABECERA', 'x', '250']]);
    expect(r.movements[0].montoOriginal).toBe(250);
  });
});

describe('parseBankStatement', () => {
  it('CSV en Latin-1 → descripción legible y encoding en meta', async () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('Fecha,Concepto,Importe\n05/08/2026,CAF'), 0xc9, ...new TextEncoder().encode(' OL'), 0xc9,
      ...new TextEncoder().encode(',-50\n'),
    ]);
    const r = await parseBankStatement(bytes.buffer as ArrayBuffer, 'banco.csv');
    expect(r.meta).toEqual({ delimiter: ',', encoding: 'windows-1252', ambiguousDate: true });
    expect(r.movements[0].descripcion).toBe('CAFÉ OLÉ');
  });

  it('XLSX: la columna Importe detectada por cabecera gana a Saldo', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Concepto', 'Importe', 'Saldo'],
      ['05/08/2026', 'SPOTIFY', '-129.00', '10000.00'],
      ['06/08/2026', 'NOMINA', '25000.00', '35000.00'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const r = await parseBankStatement(buf, 'estado.xlsx');
    expect(r.meta.encoding).toBe('utf-8');
    expect(r.movements.map(m => m.montoOriginal)).toEqual([-129, 25000]);
    expect(r.movements[0].fecha).toEqual(local(2026, 8, 5));
  });

  it('CSV UTF-8 con BOM: la cabecera Fecha se reconoce igual', async () => {
    const r = await parseBankStatement(utf8('\uFEFFFecha,Concepto,Importe\n25/08/2026,OK,10\n'), 'x.csv');
    expect(r.meta.encoding).toBe('utf-8');
    expect(r.movements).toHaveLength(1);
    expect(r.skipped).toHaveLength(0);
  });
});
```

- [ ] `npx vitest run src/lib/import/bankStatementParser.test.ts` → falla (módulo no existe).
- [ ] Crear `src/lib/import/bankStatementParser.ts` (las funciones `parseAmount`, `parseDate`, `detectDateAmbiguity`, `stripPreamble`, `detectFormat` y `excelSerialToDate` se copian **tal cual** de `src/components/BankStatementImporter.tsx` l.165-449 y 563-571, con dos únicas diferencias: se eliminan los `console.log` y se tipan con `DateHint`):

```ts
import Papa from 'papaparse';

export type DateHint = 'auto' | 'DMY' | 'MDY';

export interface RawMovement {
  /** Índice de la fila entre las filas de datos (tras cabecera y preámbulo), para "ver fila original". */
  sourceRow: number;
  /** Fecha local (medianoche). */
  fecha: Date;
  descripcion: string;
  /** Importe con el signo del archivo. Con columnas Cargo/Abono es el valor absoluto y `cargoAbono` dice cuál era. */
  montoOriginal: number;
  cargoAbono?: 'cargo' | 'abono';
  tarjetahabiente?: string;
}

export type SkipReason = 'sin_fecha' | 'monto_cero' | 'monto_invalido';

export interface SkippedRow {
  sourceRow: number;
  reason: SkipReason;
  cells: string[];
}

export interface ParseMeta {
  delimiter?: string;
  encoding: 'utf-8' | 'windows-1252';
  ambiguousDate: boolean;
}

export interface ParseResult {
  movements: RawMovement[];
  skipped: SkippedRow[];
  meta: ParseMeta;
}

export function parseAmount(amountStr: string): number {
  // ⟵ copiar el cuerpo de BankStatementImporter.tsx l.166-196 con UN cambio declarado:
  // el `replace(/\b(MXN|USD|EUR|GBP)\b/gi, '')` va ANTES del `replace(/["'\s]/g, '')`.
  // Hoy '129,00 EUR' se convierte en '129,00EUR' (sin \b entre 0 y E) y termina en 12900.
}

export function parseDate(dateStr: string, formatHint: DateHint = 'auto'): Date | null {
  // ⟵ copiar tal cual el cuerpo de l.200-242
}

// True if any DD/MM/YYYY-style date in dateCol has both first parts ≤ 12 (ambiguous)
export function detectDateAmbiguity(rows: string[][], dateCol: number): boolean {
  // ⟵ copiar tal cual el cuerpo de l.247-254
}

// Some banks (e.g. BBVA México) add title/metadata rows before the real header.
// Drop everything above the header row so column detection works.
export function stripPreamble(rows: string[][]): string[][] {
  // ⟵ copiar tal cual el cuerpo de l.261-273
}

export function detectFormat(lines: string[][]): { dateCol: number; descCol: number; amountCol: number; hasHeader: boolean } {
  // ⟵ copiar el cuerpo de l.277-448, quitando el console.log('Detected format', …) y con UN cambio declarado:
  // añadir `let descFromHeader = false;` junto a `let descCol = 1;`, poner `descFromHeader = true;` donde la
  // cabecera fija descCol (l.355), y cambiar la condición de l.430 `if (!hasHeader || descCol === 1)` por
  // `if (!descFromHeader)`. Hoy, si la cabecera dice que la descripción es la columna 1, la heurística
  // "texto más largo de la primera fila" la pisa (Fecha,Descripción,Importe,Titular → descripción = Titular).
}

export function excelSerialToDate(serial: number): Date | null {
  // ⟵ copiar tal cual el cuerpo de l.564-570
}

const CARGO_HEADERS = ['cargo', 'debe', 'débito', 'debito', 'retiro', 'egreso', 'importe cargo'];
const ABONO_HEADERS = ['abono', 'haber', 'crédito', 'credito', 'deposito', 'depósito', 'ingreso', 'importe abono'];
const TARJETAHABIENTE_HEADERS = [
  'tarjetahabiente', 'titular', 'nombre titular', 'cardholder', 'nombre tarjetahabiente', 'nombre del tarjetahabiente',
  'tarjeta habiente', 'titular de la tarjeta', 'titular tarjeta', 'card member', 'card member name', 'member name',
  'nombre del titular', 'titulartarjeta',
];

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Motivo de descarte de un importe que parseAmount dejó en 0. */
const motivoMonto = (raw: string): SkipReason => (raw.trim() === '' || /\d/.test(raw) ? 'monto_cero' : 'monto_invalido');

/**
 * Núcleo compartido CSV/Excel: recibe las celdas como texto, quita el preámbulo,
 * detecta columnas y produce movimientos + descartes con motivo.
 */
export function parseRows(rawRows: string[][], hint: DateHint = 'auto'): { movements: RawMovement[]; skipped: SkippedRow[]; ambiguousDate: boolean } {
  const rows = stripPreamble(
    rawRows
      .map((row) => (row || []).map((cell) => (cell ?? '').toString().trim()))
      .filter((row) => row.some((c) => c.length > 0)),
  );
  if (rows.length === 0) return { movements: [], skipped: [], ambiguousDate: false };

  // Muestra limpia para detectar columnas: cabecera + filas con fecha e importe (evita metadatos)
  const candidatas = rows.filter((row) =>
    row.some((cell) => parseDate(cell)) &&
    row.some((cell) => { const a = parseAmount(cell); return a !== 0 && !isNaN(a); }));
  const muestra = [rows[0], ...candidatas.slice(0, 25)];
  const { dateCol, descCol, amountCol, hasHeader } = detectFormat(muestra);

  const headerLower = (hasHeader ? rows[0] : []).map((h) => (h || '').toLowerCase().trim());
  const cargoCol = headerLower.findIndex((h) => CARGO_HEADERS.includes(h));
  const abonoCol = headerLower.findIndex((h) => ABONO_HEADERS.includes(h));
  const tarjetahabienteCol = headerLower.findIndex((h) => TARJETAHABIENTE_HEADERS.includes(sinAcentos(h)));
  const usaCargoAbono = hasHeader && (cargoCol >= 0 || abonoCol >= 0);

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const movements: RawMovement[] = [];
  const skipped: SkippedRow[] = [];

  dataRows.forEach((row, i) => {
    const fecha = parseDate(row[dateCol] ?? '', hint);
    if (!fecha) {
      skipped.push({ sourceRow: i, reason: 'sin_fecha', cells: row });
      return;
    }
    const descripcion = row[descCol] ?? '';

    let montoOriginal = 0;
    let cargoAbono: RawMovement['cargoAbono'];
    let raw = '';
    if (usaCargoAbono) {
      const cargo = cargoCol >= 0 ? parseAmount(row[cargoCol] ?? '') : 0;
      const abono = abonoCol >= 0 ? parseAmount(row[abonoCol] ?? '') : 0;
      if (cargo !== 0) { montoOriginal = Math.abs(cargo); cargoAbono = 'cargo'; }
      else if (abono !== 0) { montoOriginal = Math.abs(abono); cargoAbono = 'abono'; }
      raw = `${row[cargoCol] ?? ''}${row[abonoCol] ?? ''}`;
    } else if (amountCol >= 0) {
      // La columna de importe detectada (por cabecera o por datos) gana siempre a la heurística.
      raw = row[amountCol] ?? '';
      montoOriginal = parseAmount(raw);
    } else {
      // Sin columna de importe: primer numérico de derecha a izquierda
      for (let j = row.length - 1; j >= 0; j--) {
        const v = parseAmount(row[j] ?? '');
        if (v !== 0 && !isNaN(v)) { montoOriginal = v; raw = row[j]; break; }
      }
    }

    if (montoOriginal === 0) {
      skipped.push({ sourceRow: i, reason: motivoMonto(raw), cells: row });
      return;
    }

    const titular = tarjetahabienteCol >= 0 ? (row[tarjetahabienteCol] ?? '').trim() : '';
    movements.push({
      sourceRow: i,
      fecha,
      descripcion,
      montoOriginal,
      ...(cargoAbono ? { cargoAbono } : {}),
      ...(titular ? { tarjetahabiente: titular } : {}),
    });
  });

  return { movements, skipped, ambiguousDate: detectDateAmbiguity(dataRows, dateCol) };
}

/** Quita el BOM; UTF-8 estricto y, si los bytes no son válidos, Windows-1252 (Latin-1). */
export function decodeBytes(bytes: Uint8Array): { text: string; encoding: ParseMeta['encoding'] } {
  const sinBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(sinBom), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(sinBom), encoding: 'windows-1252' };
  }
}

/** CSV con Papa (campos multilínea entre comillas) y separador autodetectado (, ; tab |). */
export function parseCsvText(text: string, hint: DateHint = 'auto'): { movements: RawMovement[]; skipped: SkippedRow[]; ambiguousDate: boolean; delimiter: string } {
  const parsed = Papa.parse<string[]>(text, {
    quoteChar: '"',
    escapeChar: '"',
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', ';', '\t', '|'],
  });
  if (parsed.errors?.length) {
    console.warn('CSV parse errors (showing first 3):', parsed.errors.slice(0, 3));
  }
  const rows = (parsed.data || []).map((row) => (row || []).map((cell) => (cell ?? '').toString()));
  return { ...parseRows(rows, hint), delimiter: parsed.meta.delimiter };
}

const celdaATexto = (cell: unknown): string => {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) {
    const dd = String(cell.getDate()).padStart(2, '0');
    const mm = String(cell.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${cell.getFullYear()}`;
  }
  if (typeof cell === 'number') {
    if (cell > 32874 && cell < 51500 && Number.isInteger(cell)) {
      const d = excelSerialToDate(cell);
      if (d) {
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getUTCFullYear()}`;
      }
    }
    return cell.toString();
  }
  return String(cell);
};

/** Excel: primera hoja; xlsx pesa ~400 KB y se carga solo aquí. */
export async function parseExcelBytes(data: ArrayBuffer | Uint8Array, hint: DateHint = 'auto'): Promise<{ movements: RawMovement[]; skipped: SkippedRow[]; ambiguousDate: boolean }> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' }) as unknown[][];
  const rows: string[][] = jsonData
    .filter((row) => row != null && Array.isArray(row) && row.length > 0)
    .map((row) => Array.from({ length: row.length }, (_, i) => celdaATexto(row[i])));
  return parseRows(rows, hint);
}

export const esExcel = (filename: string): boolean => /\.xlsx?$/i.test(filename);

/** Punto de entrada: bytes + nombre → movimientos, descartes y metadatos. */
export async function parseBankStatement(bytes: ArrayBuffer, filename: string, hint: DateHint = 'auto'): Promise<ParseResult> {
  if (esExcel(filename)) {
    const r = await parseExcelBytes(bytes, hint);
    return { movements: r.movements, skipped: r.skipped, meta: { encoding: 'utf-8', ambiguousDate: r.ambiguousDate } };
  }
  const { text, encoding } = decodeBytes(new Uint8Array(bytes));
  const r = parseCsvText(text, hint);
  return { movements: r.movements, skipped: r.skipped, meta: { delimiter: r.delimiter, encoding, ambiguousDate: r.ambiguousDate } };
}
```

  Al copiar los seis cuerpos "tal cual", verificar que `parseDate` y `detectFormat` no referencian nada del componente (usan solo `parseAmount`/`parseDate` del propio módulo).

- [ ] Añadir a los tests de `detectFormat`/`parseBankStatement` con cabecera las aserciones `expect(movements[0].descripcion).toBe('UBER')` (fixture `Fecha,Descripción,Importe,Titular`) y `toBe('SPOTIFY')` (XLSX `Fecha,Concepto,Importe,Saldo`), que fallan con la heurística heredada y pasan con `descFromHeader`.
- [ ] `npx vitest run src/lib/import/bankStatementParser.test.ts` → verde.
- [ ] Comprobar que el runner soporta Latin-1: `node -p "new TextDecoder('windows-1252').decode(new Uint8Array([0xc9]))"` → `É`.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Commit: `git add src/lib/import/bankStatementParser.ts src/lib/import/bankStatementParser.test.ts && git commit -m "Parser de estados de cuenta puro y testeado: separador autodetectado, Latin-1, Importe por cabecera y descartes con motivo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 4.3: `importCategorizer.ts` + `toParsedRows.ts` con tests

**Files**
- Create: `src/lib/import/importCategorizer.ts`
- Test: `src/lib/import/importCategorizer.test.ts`
- Create: `src/lib/import/toParsedRows.ts`
- Test: `src/lib/import/toParsedRows.test.ts`

**Interfaces**
- Produces (`importCategorizer.ts`):
  ```ts
  export type SuggestionSource = 'historial' | 'regla' | 'historial_parcial';
  export interface CategorySuggestion { categoriaId: string; source: SuggestionSource; detail: string; confidence: 'alta' | 'media' }
  export const normalizeDescription = (desc: string): string
  export const partialKey = (normalized: string): string | null
  export interface HistoryIndex { exact: Map<string, { categoriaId: string; count: number }>; partial: Map<string, { categoriaId: string; count: number }> }
  export const buildHistoryIndex = (transactions: Transaction[], ignorarCategoriaId?: string): HistoryIndex
  export type RuleFinder = (description: string, amount?: number, accountId?: string) => RuleMatch | null
  export const suggestCategory = (description: string, amount: number | undefined, accountId: string | undefined, history: HistoryIndex, findRule: RuleFinder): CategorySuggestion | null
  ```
- Produces (`toParsedRows.ts`):
  ```ts
  export interface ParsedRow { id: string; sourceRow: number; fecha: Date; descripcion: string; monto: number; esGasto: boolean; esReembolso: boolean; categoriaId: string; incluir: boolean; montoOriginal: number; tipo: TransactionType; tarjetahabiente?: string; suggestion?: CategorySuggestion; categoriaManual: boolean }
  export type Categorizer = (descripcion: string, monto: number) => CategorySuggestion | null
  export const toParsedRows = (movements: RawMovement[], tipoCuenta: AccountType, categorizer: Categorizer, categories: Category[], sinAsignarId: string | undefined): ParsedRow[]
  ```

- [ ] Crear `src/lib/import/importCategorizer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Transaction } from '@/types/finance';
import { buildHistoryIndex, normalizeDescription, partialKey, suggestCategory } from './importCategorizer';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date('2026-08-05'), comentario: 'UBER', ingreso: 0, gasto: 100,
  monto: -100, subcategoriaId: 'transporte', divisa: 'MXN', ...over,
});
const sinReglas = () => null;
const regla = (id: string) => () => ({ category_id: id, name: 'Netflix', keyword: 'netflix' });

describe('normalizeDescription / partialKey', () => {
  it('normaliza y calcula la clave parcial solo con ≥2 palabras y ≥8 caracteres', () => {
    expect(normalizeDescription('  UBER *EATS  Madrid! ')).toBe('uber eats madrid');
    expect(partialKey('uber eats madrid centro')).toBe('uber eats madrid');
    expect(partialKey('uber')).toBeNull();
    expect(partialKey('ab cd')).toBeNull();
  });
});

describe('buildHistoryIndex', () => {
  it('la categoría más frecuente gana a la última; desempate por la más reciente', () => {
    const h = buildHistoryIndex([
      tx({ id: '1', subcategoriaId: 'transporte', fecha: new Date('2026-01-01') }),
      tx({ id: '2', subcategoriaId: 'transporte', fecha: new Date('2026-02-01') }),
      tx({ id: '3', subcategoriaId: 'comida', fecha: new Date('2026-08-01') }),
    ]);
    expect(h.exact.get('uber')).toEqual({ categoriaId: 'transporte', count: 2 });
    const empate = buildHistoryIndex([
      tx({ id: '1', subcategoriaId: 'transporte', fecha: new Date('2026-01-01') }),
      tx({ id: '2', subcategoriaId: 'comida', fecha: new Date('2026-08-01') }),
    ]);
    expect(empate.exact.get('uber')?.categoriaId).toBe('comida');
  });

  it('no aprende de la categoría Sin Asignar', () => {
    const h = buildHistoryIndex([tx({ subcategoriaId: 'sin-asignar' })], 'sin-asignar');
    expect(h.exact.size).toBe(0);
  });
});

describe('suggestCategory', () => {
  it('"uber eats madrid" no coincide con el historial "uber" (sin includes bidireccional)', () => {
    const h = buildHistoryIndex([tx({})]);
    expect(suggestCategory('UBER EATS MADRID', 100, 'a1', h, sinReglas)).toBeNull();
  });

  it('historial exacto gana a la regla', () => {
    const h = buildHistoryIndex([tx({ comentario: 'NETFLIX.COM', subcategoriaId: 'ocio' }), tx({ id: '2', comentario: 'NETFLIX.COM', subcategoriaId: 'ocio' })]);
    expect(suggestCategory('NETFLIX.COM', 199, 'a1', h, regla('streaming'))).toEqual({
      categoriaId: 'ocio', source: 'historial', detail: 'Historial · 2 movimientos', confidence: 'alta',
    });
  });

  it('la regla gana al historial parcial', () => {
    const h = buildHistoryIndex([tx({ comentario: 'NETFLIX COM MX 001', subcategoriaId: 'ocio' })]);
    expect(suggestCategory('NETFLIX COM MX 002', 199, 'a1', h, regla('streaming'))).toEqual({
      categoriaId: 'streaming', source: 'regla', detail: 'Regla · Netflix', confidence: 'alta',
    });
  });

  it('sin historial exacto ni regla usa el parcial estricto con confianza media', () => {
    const h = buildHistoryIndex([tx({ comentario: 'OXXO GAS CENTRO 12', subcategoriaId: 'gasolina' })]);
    expect(suggestCategory('OXXO GAS CENTRO 99', 500, 'a1', h, sinReglas)).toEqual({
      categoriaId: 'gasolina', source: 'historial_parcial', detail: 'Parecido a · oxxo gas centro', confidence: 'media',
    });
  });
});
```

- [ ] `npx vitest run src/lib/import/importCategorizer.test.ts` → falla (módulo no existe).
- [ ] Crear `src/lib/import/importCategorizer.ts`:

```ts
import { Transaction } from '@/types/finance';
import { RuleMatch } from '@/lib/classificationRules';

export type SuggestionSource = 'historial' | 'regla' | 'historial_parcial';

export interface CategorySuggestion {
  categoriaId: string;
  source: SuggestionSource;
  /** Texto del tooltip: "Historial · 12 movimientos", "Regla · Netflix", "Parecido a · uber bcn". */
  detail: string;
  confidence: 'alta' | 'media';
}

/** Misma normalización que usaba el importador: minúsculas, solo letras/números/espacios. */
export const normalizeDescription = (desc: string): string =>
  desc
    .toLowerCase()
    .replace(/[^a-záéíóúñü0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Clave parcial estricta: primeras 3 palabras, solo si hay ≥ 2 palabras y ≥ 8 caracteres. */
export const partialKey = (normalized: string): string | null => {
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 2 || normalized.length < 8) return null;
  return words.slice(0, 3).join(' ');
};

interface Tally {
  categoriaId: string;
  count: number;
}

export interface HistoryIndex {
  exact: Map<string, Tally>;
  partial: Map<string, Tally>;
}

type Acumulador = Map<string, Map<string, { count: number; last: number }>>;

/**
 * Por descripción normalizada (y por clave parcial), la categoría MÁS FRECUENTE
 * del historial; desempate: la más reciente. Ignora "Sin Asignar" si se pasa su id.
 */
export const buildHistoryIndex = (transactions: Transaction[], ignorarCategoriaId?: string): HistoryIndex => {
  const exact: Acumulador = new Map();
  const partial: Acumulador = new Map();

  const add = (acc: Acumulador, key: string, t: Transaction) => {
    if (!acc.has(key)) acc.set(key, new Map());
    const porCat = acc.get(key)!;
    const cur = porCat.get(t.subcategoriaId) ?? { count: 0, last: 0 };
    porCat.set(t.subcategoriaId, { count: cur.count + 1, last: Math.max(cur.last, t.fecha.getTime()) });
  };

  for (const t of transactions) {
    if (!t.comentario || !t.subcategoriaId) continue;
    if (ignorarCategoriaId && t.subcategoriaId === ignorarCategoriaId) continue;
    const n = normalizeDescription(t.comentario);
    if (n.length < 3) continue;
    add(exact, n, t);
    const p = partialKey(n);
    if (p) add(partial, p, t);
  }

  const resolver = (acc: Acumulador): Map<string, Tally> => {
    const out = new Map<string, Tally>();
    for (const [key, porCat] of acc) {
      let best: { categoriaId: string; count: number; last: number } | null = null;
      for (const [categoriaId, v] of porCat) {
        if (!best || v.count > best.count || (v.count === best.count && v.last > best.last)) {
          best = { categoriaId, ...v };
        }
      }
      if (best) out.set(key, { categoriaId: best.categoriaId, count: best.count });
    }
    return out;
  };

  return { exact: resolver(exact), partial: resolver(partial) };
};

export type RuleFinder = (description: string, amount?: number, accountId?: string) => RuleMatch | null;

/** Orden: historial exacto → regla → historial parcial estricto. Sin `includes` bidireccional. */
export const suggestCategory = (
  description: string,
  amount: number | undefined,
  accountId: string | undefined,
  history: HistoryIndex,
  findRule: RuleFinder,
): CategorySuggestion | null => {
  const n = normalizeDescription(description);

  const exact = history.exact.get(n);
  if (exact) {
    return { categoriaId: exact.categoriaId, source: 'historial', detail: `Historial · ${exact.count} movimiento${exact.count === 1 ? '' : 's'}`, confidence: 'alta' };
  }

  const rule = findRule(description, amount, accountId);
  if (rule) {
    return { categoriaId: rule.category_id, source: 'regla', detail: `Regla · ${rule.name || rule.keyword}`, confidence: 'alta' };
  }

  const p = partialKey(n);
  const parcial = p ? history.partial.get(p) : undefined;
  if (p && parcial) {
    return { categoriaId: parcial.categoriaId, source: 'historial_parcial', detail: `Parecido a · ${p}`, confidence: 'media' };
  }

  return null;
};
```

- [ ] `npx vitest run src/lib/import/importCategorizer.test.ts` → verde.
- [ ] Crear `src/lib/import/toParsedRows.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Category } from '@/types/finance';
import { RawMovement } from './bankStatementParser';
import { toParsedRows } from './toParsedRows';

const mov = (over: Partial<RawMovement>): RawMovement => ({ sourceRow: 0, fecha: new Date(2026, 7, 5), descripcion: 'X', montoOriginal: -100, ...over });
const cats: Category[] = [
  { id: 'gasto', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos' },
  { id: 'retiro', categoria: 'Inversión', subcategoria: 'Retiro', tipo: 'Retiro' },
  { id: 'ingreso', categoria: 'Sueldo', subcategoria: 'Nómina', tipo: 'Ingreso' },
];
const sug = (categoriaId: string) => () => ({ categoriaId, source: 'regla' as const, detail: 'Regla · x', confidence: 'alta' as const });

describe('toParsedRows', () => {
  it('banco: negativo = gasto, positivo = ingreso; tarjeta: al revés', () => {
    const [g, i] = toParsedRows([mov({ montoOriginal: -100 }), mov({ montoOriginal: 100 })], 'Banco', () => null, cats, 'sin');
    expect(g).toMatchObject({ esGasto: true, tipo: 'Gastos', monto: 100, montoOriginal: -100, categoriaId: 'sin', categoriaManual: false });
    expect(i).toMatchObject({ esGasto: false, tipo: 'Ingreso', monto: 100 });
    const [tg] = toParsedRows([mov({ montoOriginal: 100 })], 'Tarjeta de Crédito', () => null, cats, 'sin');
    expect(tg).toMatchObject({ esGasto: true, montoOriginal: 100 });
  });

  it('cargo/abono: montoOriginal firmado según el tipo de cuenta', () => {
    const [c, a] = toParsedRows([mov({ montoOriginal: 500, cargoAbono: 'cargo' }), mov({ montoOriginal: 900, cargoAbono: 'abono' })], 'Banco', () => null, cats, 'sin');
    expect(c).toMatchObject({ montoOriginal: -500, esGasto: true });
    expect(a).toMatchObject({ montoOriginal: 900, esGasto: false });
    const [tc] = toParsedRows([mov({ montoOriginal: 500, cargoAbono: 'cargo' })], 'Tarjeta de Crédito', () => null, cats, 'sin');
    expect(tc).toMatchObject({ montoOriginal: 500, esGasto: true });
  });

  it('usa el tipo de la categoría sugerida solo si es compatible con el signo', () => {
    const [r] = toParsedRows([mov({ montoOriginal: -100 })], 'Banco', sug('retiro'), cats, 'sin');
    expect(r).toMatchObject({ tipo: 'Retiro', esGasto: true, categoriaId: 'retiro' });
    expect(r.suggestion?.source).toBe('regla');
    const [x] = toParsedRows([mov({ montoOriginal: -100 })], 'Banco', sug('ingreso'), cats, 'sin');
    expect(x).toMatchObject({ tipo: 'Gastos', esGasto: true, categoriaId: 'ingreso' });
  });

  it('conserva sourceRow y tarjetahabiente', () => {
    const [r] = toParsedRows([mov({ sourceRow: 7, tarjetahabiente: 'MANUEL' })], 'Banco', () => null, cats, 'sin');
    expect(r).toMatchObject({ sourceRow: 7, tarjetahabiente: 'MANUEL', incluir: true, esReembolso: false });
  });
});
```

- [ ] `npx vitest run src/lib/import/toParsedRows.test.ts` → falla.
- [ ] Crear `src/lib/import/toParsedRows.ts`:

```ts
import { AccountType, Category, TransactionType } from '@/types/finance';
import { RawMovement } from './bankStatementParser';
import { CategorySuggestion } from './importCategorizer';

export interface ParsedRow {
  id: string;
  sourceRow: number;
  fecha: Date;
  descripcion: string;
  monto: number;
  esGasto: boolean;
  esReembolso: boolean;
  categoriaId: string;
  incluir: boolean;
  /** Signo ya ajustado al tipo de cuenta (convención de siempre; lo usa el toggle de reembolso). */
  montoOriginal: number;
  tipo: TransactionType;
  tarjetahabiente?: string;
  /** Por qué se sugirió la categoría; undefined si no hubo sugerencia. */
  suggestion?: CategorySuggestion;
  /** true cuando el usuario la cambió a mano en el preview. */
  categoriaManual: boolean;
}

export type Categorizer = (descripcion: string, monto: number) => CategorySuggestion | null;

/**
 * Signo → gasto/ingreso según el tipo de cuenta (tarjeta: positivo = gasto;
 * banco: negativo = gasto) + sugerencia de categoría. El tipo de la categoría
 * sugerida solo se adopta si es compatible con el signo.
 */
export const toParsedRows = (
  movements: RawMovement[],
  tipoCuenta: AccountType,
  categorizer: Categorizer,
  categories: Category[],
  sinAsignarId: string | undefined,
): ParsedRow[] => {
  const isCreditCard = tipoCuenta === 'Tarjeta de Crédito';
  const byId = new Map(categories.map((c) => [c.id, c]));
  const stamp = Date.now();

  return movements.map((m, i) => {
    let montoOriginal: number;
    if (m.cargoAbono === 'cargo') montoOriginal = isCreditCard ? Math.abs(m.montoOriginal) : -Math.abs(m.montoOriginal);
    else if (m.cargoAbono === 'abono') montoOriginal = isCreditCard ? -Math.abs(m.montoOriginal) : Math.abs(m.montoOriginal);
    else montoOriginal = m.montoOriginal;

    const monto = Math.abs(montoOriginal);
    const suggestion = categorizer(m.descripcion, monto) ?? undefined;
    const matched = suggestion ? byId.get(suggestion.categoriaId) : undefined;
    const isExpenseLike = isCreditCard ? montoOriginal > 0 : montoOriginal < 0;

    let tipo: TransactionType;
    if (matched?.tipo) {
      const ct = matched.tipo;
      if (isExpenseLike && (ct === 'Gastos' || ct === 'Retiro')) tipo = ct;
      else if (!isExpenseLike && (ct === 'Ingreso' || ct === 'Aportación')) tipo = ct;
      else tipo = isExpenseLike ? 'Gastos' : 'Ingreso';
    } else {
      tipo = isExpenseLike ? 'Gastos' : 'Ingreso';
    }

    return {
      id: `import-${i}-${stamp}`,
      sourceRow: m.sourceRow,
      fecha: m.fecha,
      descripcion: m.descripcion,
      monto,
      esGasto: tipo === 'Gastos' || tipo === 'Retiro',
      esReembolso: false,
      categoriaId: suggestion?.categoriaId || sinAsignarId || '',
      incluir: true,
      montoOriginal,
      tipo,
      tarjetahabiente: m.tarjetahabiente,
      suggestion,
      categoriaManual: false,
    };
  });
};
```

- [ ] `npx vitest run src/lib/import` → verde. `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Commit: `git add src/lib/import/importCategorizer.ts src/lib/import/importCategorizer.test.ts src/lib/import/toParsedRows.ts src/lib/import/toParsedRows.test.ts && git commit -m "Categorización explicable: historial exacto, regla y parcial estricto; filas de preview desde movimientos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 4.4: `addTransactionsBatch` relanza el error y escribe con `toFechaISO`

**Files**
- Modify: `src/hooks/useFinanceDataSupabase.ts` (función `addTransactionsBatch`, l.400-440)

**Interfaces**
- `addTransactionsBatch(newTransactions: Omit<Transaction, 'id' | 'monto'>[]): Promise<void>` — ahora **lanza** en caso de error (único llamador: el importador). Sigue invalidando `transacciones`.

- [ ] Añadir `import { toFechaISO } from '@/lib/finance/fechas';` tras `import { computeDashboardMetrics } from '@/lib/finance/dashboardMetrics';`.
- [ ] Sustituir la función completa `const addTransactionsBatch = async (…) => { try { … } catch (error) { … } };` por:

```ts
  /**
   * Inserción masiva (importador). Las fechas llegan LOCALES del parser → toFechaISO.
   * Relanza el error: el importador muestra el toast y mantiene el preview abierto.
   */
  const addTransactionsBatch = async (newTransactions: Omit<Transaction, 'id' | 'monto'>[]) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    const insertData = newTransactions.map(transaction => {
      const data: any = {
        cuenta_id: transaction.cuentaId,
        fecha: toFechaISO(transaction.fecha),
        comentario: transaction.comentario,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto,
        subcategoria_id: transaction.subcategoriaId,
        divisa: transaction.divisa || 'MXN',
        user_id: userData.user.id
      };
      if (transaction.tarjetahabiente) {
        data.tarjetahabiente = transaction.tarjetahabiente;
      }
      return data;
    });

    const { error } = await supabase
      .from('transacciones')
      .insert(insertData);

    if (error) {
      console.error('Error adding transactions batch:', error);
      throw error;
    }

    // Los saldos se derivan en memoria de la caché de transacciones.
    await invalidate(QK.transacciones);
  };
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npx vitest run` → verde.
- [ ] Commit: `git add src/hooks/useFinanceDataSupabase.ts && git commit -m "addTransactionsBatch relanza el error y escribe la fecha local con toFechaISO" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 4.5: Partir el importador en `src/components/import/*`

**Files**
- Create: `src/components/import/BankStatementImporter.tsx` (orquestador)
- Create: `src/components/import/ImportPreviewTable.tsx`
- Create: `src/components/import/CreateRuleFromRowDialog.tsx`
- Create: `src/components/import/ImportSummaryBar.tsx`
- Delete: `src/components/BankStatementImporter.tsx`
- Modify: `src/pages/Transacciones.tsx` (import)
- Test: ninguno (UI; verificación manual en 4.6)

**Interfaces**
- Orquestador: `export default BankStatementImporter({ accounts, categories, transactions, onImportTransactions }: BankStatementImporterProps)` — mismas props que hoy.
- `ImportPreviewTable` props:
  ```ts
  { rows: ParsedRow[]; allRows: ParsedRow[]; categories: Category[]; isCreditCard: boolean; hasTarjetahabiente: boolean;
    sortColumn: SortColumn; sortDirection: SortDirection; onSort(c: SortColumn): void;
    onToggleAll(checked: boolean): void; onToggleInclude(id: string): void; onToggleReembolso(id: string): void;
    onCategoryChange(id: string, categoriaId: string): void; onCreateRule(row: ParsedRow): void;
    pendingMatches: Map<string, Pending[]>; pendingLinks: Record<string, string>; onTogglePendingLink(rowId: string, matches: Pending[]): void }
  export type SortColumn = 'fecha' | 'descripcion' | 'tipo' | 'monto' | 'categoria'; export type SortDirection = 'asc' | 'desc';
  ```
- `CreateRuleFromRowDialog` props: `{ row: ParsedRow | null; onClose(): void; categories: Category[]; accountId: string; accountName: string; rows: ParsedRow[]; onSave(rule: NewRule): Promise<PostgrestError | null | undefined>; onApplied(rule: NewRule): number }` con `export interface NewRule { name: string; keyword: string; match_type: 'contains'; category_id: string; cuenta_id: string | null; priority: number; active: boolean; amount_min: null; amount_max: null }`.
- `ImportSummaryBar` props: `{ rows: ParsedRow[]; skipped: SkippedRow[]; meta: ParseMeta | null; currency: string; importing: boolean; selectedCount: number; onBack(): void; onImport(): void }`.

- [ ] Crear `src/components/import/ImportSummaryBar.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ParseMeta, SkippedRow, SkipReason } from '@/lib/import/bankStatementParser';
import { ParsedRow } from '@/lib/import/toParsedRows';

const MOTIVO: Record<SkipReason, string> = {
  sin_fecha: 'Sin fecha válida',
  monto_cero: 'Importe 0 o vacío',
  monto_invalido: 'Importe no numérico',
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

interface Props {
  rows: ParsedRow[];
  skipped: SkippedRow[];
  meta: ParseMeta | null;
  currency: string;
  importing: boolean;
  selectedCount: number;
  onBack: () => void;
  onImport: () => void;
}

/** Pie del preview: totales de las filas incluidas, descartadas con motivo, cómo se leyó el archivo, Importar. */
export const ImportSummaryBar = ({ rows, skipped, meta, currency, importing, selectedCount, onBack, onImport }: Props) => {
  const [showSkipped, setShowSkipped] = useState(false);

  const totales = useMemo(() => {
    const incluidas = rows.filter(r => r.incluir);
    const gastos = incluidas.filter(r => r.esGasto && !r.esReembolso);
    const ingresos = incluidas.filter(r => !r.esGasto || r.esReembolso);
    return {
      nGastos: gastos.length,
      gastos: gastos.reduce((s, r) => s + r.monto, 0),
      nIngresos: ingresos.length,
      ingresos: ingresos.reduce((s, r) => s + r.monto, 0),
    };
  }, [rows]);

  const lectura = meta
    ? [meta.encoding === 'windows-1252' ? 'Archivo leído como Latin-1' : null, meta.delimiter && meta.delimiter !== ',' ? `separador "${meta.delimiter === '\t' ? 'tab' : meta.delimiter}"` : null]
        .filter(Boolean).join(' · ')
    : '';

  return (
    <div className="space-y-2 pt-3 border-t">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{totales.nGastos} gasto{totales.nGastos !== 1 ? 's' : ''} · <span className="text-destructive font-medium">-{formatMoney(totales.gastos)} {currency}</span></span>
        <span>{totales.nIngresos} ingreso{totales.nIngresos !== 1 ? 's' : ''} · <span className="text-green-600 font-medium">+{formatMoney(totales.ingresos)} {currency}</span></span>
        {lectura && <span>{lectura}</span>}
      </div>

      {skipped.length > 0 && (
        <Collapsible open={showSkipped} onOpenChange={setShowSkipped}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
              {showSkipped ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
              {skipped.length} fila{skipped.length !== 1 ? 's' : ''} descartada{skipped.length !== 1 ? 's' : ''}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="max-h-32 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs px-2 w-14">Fila</TableHead>
                    <TableHead className="text-xs px-2 w-40">Motivo</TableHead>
                    <TableHead className="text-xs px-2">Contenido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skipped.map(s => (
                    <TableRow key={s.sourceRow}>
                      <TableCell className="text-xs px-2">{s.sourceRow + 1}</TableCell>
                      <TableCell className="text-xs px-2">{MOTIVO[s.reason]}</TableCell>
                      <TableCell className="text-xs px-2 truncate max-w-[420px]" title={s.cells.join(' | ')}>{s.cells.join(' | ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={onBack}>Atrás</Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{selectedCount} de {rows.length} a importar</span>
          <Button size="sm" onClick={onImport} disabled={importing || selectedCount === 0}>
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] Crear `src/components/import/CreateRuleFromRowDialog.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { matchesClassificationRule, normalizeRuleText } from '@/lib/classificationRules';
import { ParsedRow } from '@/lib/import/toParsedRows';
import { Category, TransactionType } from '@/types/finance';
import { cn } from '@/lib/utils';

export interface NewRule {
  name: string;
  keyword: string;
  match_type: 'contains';
  category_id: string;
  cuenta_id: string | null;
  priority: number;
  active: boolean;
  amount_min: null;
  amount_max: null;
}

const TIPOS: TransactionType[] = ['Gastos', 'Ingreso', 'Reembolso', 'Aportación', 'Retiro'];

interface Props {
  /** Fila desde la que se crea; null = diálogo cerrado. */
  row: ParsedRow | null;
  onClose: () => void;
  categories: Category[];
  accountId: string;
  accountName: string;
  /** Todas las filas del preview, para "coincide con N filas". */
  rows: ParsedRow[];
  /** Guarda la regla (addRule del hook); devuelve el error si lo hay. */
  onSave: (rule: NewRule) => Promise<unknown>;
  /** Aplica la regla a las filas no manuales; devuelve cuántas cambió. */
  onApplied: (rule: NewRule) => number;
}

/** Regla prellenada con las 2 primeras palabras de la descripción; vista previa en vivo de coincidencias. */
export const CreateRuleFromRowDialog = ({ row, onClose, categories, accountId, accountName, rows, onSave, onApplied }: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [soloCuenta, setSoloCuenta] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    // Misma normalización que usan las reglas al comparar (normalizeRuleText: puntuación → espacio),
    // no la del historial (normalizeDescription: puntuación eliminada); si no, 'NETFLIX.COM' nunca coincidiría.
    const dosPalabras = normalizeRuleText(row.descripcion).split(' ').filter(Boolean).slice(0, 2).join(' ');
    setName(dosPalabras);
    setKeyword(dosPalabras);
    setCategoryId(row.categoriaId);
    setSoloCuenta(false);
  }, [row]);

  const coincidencias = useMemo(
    () => (keyword.trim() ? rows.filter(r => matchesClassificationRule(r.descripcion, keyword, 'contains')).length : 0),
    [rows, keyword],
  );

  const grupos = useMemo(
    () => TIPOS.map(tipo => ({ tipo, categories: categories.filter(c => c.tipo === tipo) })).filter(g => g.categories.length > 0),
    [categories],
  );
  const categoria = categories.find(c => c.id === categoryId);

  const guardar = async () => {
    if (!name.trim() || !keyword.trim() || !categoryId) return;
    setSaving(true);
    const rule: NewRule = {
      name: name.trim(),
      keyword: keyword.trim(),
      match_type: 'contains',
      category_id: categoryId,
      cuenta_id: soloCuenta ? accountId : null,
      priority: 0,
      active: true,
      amount_min: null,
      amount_max: null,
    };
    const error = await onSave(rule);
    setSaving(false);
    // addRule devuelve null si insertó, el error de Supabase si falló y undefined si no hay sesión:
    // solo null es éxito.
    if (error !== null) {
      toast({ title: 'Error', description: 'No se pudo crear la regla', variant: 'destructive' });
      return;
    }
    const n = onApplied(rule);
    toast({ title: 'Regla creada', description: `Aplicada a ${n} fila${n !== 1 ? 's' : ''}` });
    onClose();
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear regla para filas como esta</DialogTitle>
          <DialogDescription>
            Las descripciones que contengan la palabra clave se clasificarán con esta categoría, ahora y en futuras importaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Nombre</Label>
            <Input id="rule-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-keyword">Palabra clave (contiene)</Label>
            <Input id="rule-keyword" value={keyword} onChange={e => setKeyword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Coincide con {coincidencias} fila{coincidencias !== 1 ? 's' : ''} de este archivo</p>
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Popover modal={true} open={catOpen} onOpenChange={setCatOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  <span className="truncate">{categoria ? `${categoria.categoria} - ${categoria.subcategoria}` : 'Selecciona una categoría'}</span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-background z-[110]" align="start">
                <Command>
                  <CommandInput placeholder="Buscar categoría..." />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                    {grupos.map(g => (
                      <CommandGroup key={g.tipo} heading={g.tipo}>
                        {g.categories.map(c => (
                          <CommandItem key={c.id} value={`${c.categoria} ${c.subcategoria}`} onSelect={() => { setCategoryId(c.id); setCatOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4 shrink-0', categoryId === c.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="text-xs">{c.categoria} - {c.subcategoria}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="rule-account" checked={soloCuenta} onCheckedChange={c => setSoloCuenta(!!c)} />
            <Label htmlFor="rule-account" className="text-sm font-normal">Solo para la cuenta {accountName}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving || !name.trim() || !keyword.trim() || !categoryId}>
            {saving ? 'Guardando...' : 'Crear regla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] Crear `src/components/import/ImportPreviewTable.tsx` (tabla de hoy l.1245-1458 más el icono de fuente y el ítem "Crear regla…"):

```tsx
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronsUpDown, History, ListChecks, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pending } from '@/hooks/usePendings';
import { ParsedRow } from '@/lib/import/toParsedRows';
import { Category, TransactionType } from '@/types/finance';
import { cn } from '@/lib/utils';

export type SortColumn = 'fecha' | 'descripcion' | 'tipo' | 'monto' | 'categoria';
export type SortDirection = 'asc' | 'desc';

interface Props {
  /** Filas ya filtradas y ordenadas. */
  rows: ParsedRow[];
  /** Todas las filas (checkbox de cabecera). */
  allRows: ParsedRow[];
  categories: Category[];
  isCreditCard: boolean;
  hasTarjetahabiente: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (c: SortColumn) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleInclude: (id: string) => void;
  onToggleReembolso: (id: string) => void;
  onCategoryChange: (id: string, categoriaId: string) => void;
  onCreateRule: (row: ParsedRow) => void;
  pendingMatches: Map<string, Pending[]>;
  pendingLinks: Record<string, string>;
  onTogglePendingLink: (rowId: string, matches: Pending[]) => void;
}

const formatDate = (date: Date) => date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatMoney = (amount: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

/** Icono + tooltip con la fuente de la sugerencia (o "Manual"). */
const FuenteIcono = ({ row }: { row: ParsedRow }) => {
  if (row.categoriaManual) {
    return (
      <Tooltip><TooltipTrigger asChild><Pencil className="h-3 w-3 text-muted-foreground shrink-0" /></TooltipTrigger><TooltipContent>Manual</TooltipContent></Tooltip>
    );
  }
  if (!row.suggestion) return null;
  const Icon = row.suggestion.source === 'regla' ? ListChecks : History;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={cn('h-3 w-3 shrink-0', row.suggestion.source === 'historial_parcial' ? 'text-muted-foreground opacity-60' : 'text-muted-foreground')} />
      </TooltipTrigger>
      <TooltipContent>{row.suggestion.detail}</TooltipContent>
    </Tooltip>
  );
};

export const ImportPreviewTable = ({
  rows, allRows, categories, isCreditCard, hasTarjetahabiente, sortColumn, sortDirection, onSort,
  onToggleAll, onToggleInclude, onToggleReembolso, onCategoryChange, onCreateRule, pendingMatches, pendingLinks, onTogglePendingLink,
}: Props) => {
  const [openCatRowId, setOpenCatRowId] = useState<string | null>(null);

  const categoriesByType = useMemo(() => ({
    gastoCategories: categories.filter(c => c.tipo === 'Gastos'),
    ingresoCategories: categories.filter(c => c.tipo === 'Ingreso'),
    reembolsoCategories: categories.filter(c => c.tipo === 'Reembolso'),
    aportacionCategories: categories.filter(c => c.tipo === 'Aportación'),
    retiroCategories: categories.filter(c => c.tipo === 'Retiro'),
  }), [categories]);

  const getGroupedCategoriesForRow = (row: ParsedRow) => {
    const groups: { tipo: TransactionType; categories: Category[] }[] = [];
    if (row.esReembolso) {
      if (categoriesByType.gastoCategories.length > 0) groups.push({ tipo: 'Gastos', categories: [...categoriesByType.gastoCategories] });
      if (categoriesByType.reembolsoCategories.length > 0) groups.push({ tipo: 'Reembolso', categories: [...categoriesByType.reembolsoCategories] });
    } else if (row.esGasto || row.tipo === 'Gastos' || row.tipo === 'Retiro') {
      if (categoriesByType.gastoCategories.length > 0) groups.push({ tipo: 'Gastos', categories: [...categoriesByType.gastoCategories] });
      if (categoriesByType.retiroCategories.length > 0) groups.push({ tipo: 'Retiro', categories: [...categoriesByType.retiroCategories] });
    } else {
      if (categoriesByType.ingresoCategories.length > 0) groups.push({ tipo: 'Ingreso', categories: [...categoriesByType.ingresoCategories] });
      if (categoriesByType.aportacionCategories.length > 0) groups.push({ tipo: 'Aportación', categories: [...categoriesByType.aportacionCategories] });
    }
    // La categoría seleccionada, primero
    const selectedGroupIdx = groups.findIndex(g => g.categories.some(c => c.id === row.categoriaId));
    if (selectedGroupIdx > 0) {
      const [selectedGroup] = groups.splice(selectedGroupIdx, 1);
      groups.unshift(selectedGroup);
    }
    const group = groups[0];
    if (group) {
      const idx = group.categories.findIndex(c => c.id === row.categoriaId);
      if (idx > 0) {
        const [cat] = group.categories.splice(idx, 1);
        group.categories.unshift(cat);
      }
    }
    return groups;
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getTipoDisplay = (row: ParsedRow) => {
    if (row.esReembolso) return 'Reemb.';
    switch (row.tipo) {
      case 'Aportación': return 'Aport.';
      case 'Retiro': return 'Retiro';
      case 'Gastos': return 'Gasto';
      case 'Ingreso': return 'Ingreso';
      default: return row.esGasto ? 'Gasto' : 'Ingreso';
    }
  };

  return (
    <div className="overflow-auto max-h-[50vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-2">
              <Checkbox checked={allRows.every(r => r.incluir)} onCheckedChange={(checked) => onToggleAll(!!checked)} />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('fecha')}>
              <span className="flex items-center text-xs">Fecha {getSortIcon('fecha')}</span>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('descripcion')}>
              <span className="flex items-center text-xs">Descripción {getSortIcon('descripcion')}</span>
            </TableHead>
            {isCreditCard && hasTarjetahabiente && (
              <TableHead className="px-2"><span className="text-xs">Titular</span></TableHead>
            )}
            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('monto')}>
              <span className="flex items-center justify-end text-xs">Monto {getSortIcon('monto')}</span>
            </TableHead>
            <TableHead className="w-14 text-center px-1"><span className="text-xs">Reemb.</span></TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('categoria')}>
              <span className="flex items-center text-xs">Categoría {getSortIcon('categoria')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const category = categories.find(c => c.id === row.categoriaId);
            const isSinAsignar = !category || category.subcategoria === 'Sin Asignar';
            const isExpense = row.esGasto && !row.esReembolso;
            const matches = pendingMatches.get(row.id);
            const linkedId = pendingLinks[row.id];
            const selectedMatch = matches ? (linkedId ? matches.find(m => m.id === linkedId) : matches[0]) : undefined;

            return (
              <TableRow key={row.id} className={!row.incluir ? 'opacity-50' : ''}>
                <TableCell className="px-2">
                  <Checkbox checked={row.incluir} onCheckedChange={() => onToggleInclude(row.id)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs px-2">{formatDate(row.fecha)}</TableCell>
                <TableCell className="max-w-[220px] text-xs px-2" title={row.descripcion}>
                  <div className="truncate">{row.descripcion}</div>
                  {matches && matches.length > 0 && (
                    <button type="button" onClick={() => onTogglePendingLink(row.id, matches)} className="mt-1 inline-flex items-center gap-1" title={selectedMatch?.concepto}>
                      <Badge variant={linkedId ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal">
                        {linkedId ? '✓ ' : ''}Pendiente: {selectedMatch?.concepto}
                        {matches.length > 1 ? ` (+${matches.length - 1})` : ''}
                      </Badge>
                    </button>
                  )}
                </TableCell>
                {isCreditCard && hasTarjetahabiente && (
                  <TableCell className="text-xs px-2 max-w-[100px] truncate" title={row.tarjetahabiente || ''}>{row.tarjetahabiente || '-'}</TableCell>
                )}
                <TableCell className={`text-right text-xs font-medium px-2 ${isExpense ? 'text-destructive' : 'text-green-600'}`}>
                  <span className="flex items-center justify-end gap-1">
                    <span className="text-[10px] opacity-60">{getTipoDisplay(row)}</span>
                    {isExpense ? '-' : '+'}{formatMoney(row.monto)}
                  </span>
                </TableCell>
                <TableCell className="text-center px-1">
                  {(!row.esGasto || row.esReembolso) ? (
                    <Checkbox checked={row.esReembolso} onCheckedChange={() => onToggleReembolso(row.id)} />
                  ) : null}
                </TableCell>
                <TableCell className="px-2">
                  <div className="flex items-center gap-1">
                    <Popover modal={true} open={openCatRowId === row.id} onOpenChange={(isOpen) => setOpenCatRowId(isOpen ? row.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          size="sm"
                          title={category ? `${category.categoria} - ${category.subcategoria}` : 'Sin Asignar'}
                          className={cn('w-48 justify-between text-left font-normal text-xs h-7', isSinAsignar && 'border-yellow-500')}
                        >
                          <span className="truncate">{category ? `${category.categoria} - ${category.subcategoria}` : 'Sin Asignar'}</span>
                          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72 p-0 bg-background pointer-events-auto z-[100]"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        onWheel={(e) => e.stopPropagation()}
                        onInteractOutside={(e) => e.stopPropagation()}
                      >
                        <Command className="overflow-visible">
                          <CommandInput placeholder="Buscar categoría..." />
                          <CommandList className="max-h-60 overflow-y-auto overscroll-contain">
                            <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                            {getGroupedCategoriesForRow(row).map(group => (
                              <CommandGroup key={group.tipo} heading={group.tipo}>
                                {group.categories.map(cat => (
                                  <CommandItem
                                    key={cat.id}
                                    value={`${cat.categoria} ${cat.subcategoria}`}
                                    onSelect={() => { setOpenCatRowId(null); onCategoryChange(row.id, cat.id); }}
                                    className="whitespace-normal"
                                  >
                                    <Check className={cn('mr-2 h-4 w-4 shrink-0', row.categoriaId === cat.id ? 'opacity-100' : 'opacity-0')} />
                                    <span className="break-words text-xs">{cat.categoria} - {cat.subcategoria}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                        {/* Fuera del CommandList: cmdk oculta los ítems que no coinciden con lo escrito en el buscador */}
                        <div className="border-t p-1">
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => { setOpenCatRowId(null); onCreateRule(row); }}>
                            <Plus className="mr-2 h-4 w-4 shrink-0" />
                            Crear regla para filas como esta…
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FuenteIcono row={row} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
```


- [ ] Crear `src/components/import/BankStatementImporter.tsx` (orquestador):

```tsx
import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useClassificationRules } from '@/hooks/useClassificationRules';
import { Pending, usePendings } from '@/hooks/usePendings';
import { useSubscriptionSync } from '@/hooks/useSubscriptionSync';
import { matchesClassificationRule } from '@/lib/classificationRules';
import { toFechaISO } from '@/lib/finance/fechas';
import { DateHint, parseBankStatement, ParseMeta, SkippedRow } from '@/lib/import/bankStatementParser';
import { buildHistoryIndex, suggestCategory } from '@/lib/import/importCategorizer';
import { ParsedRow, toParsedRows } from '@/lib/import/toParsedRows';
import { Account, Category, Transaction } from '@/types/finance';
import { CreateRuleFromRowDialog, NewRule } from './CreateRuleFromRowDialog';
import { ImportPreviewTable, SortColumn, SortDirection } from './ImportPreviewTable';
import { ImportSummaryBar } from './ImportSummaryBar';

interface BankStatementImporterProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'monto'>[]) => Promise<void>;
}

type Step = 'select-account' | 'upload' | 'preview';
type PreviewFilter = 'all' | 'sin_asignar' | 'dudosas';

const esSinAsignar = (cat: Category | undefined) => !cat || cat.subcategoria === 'Sin Asignar' || cat.categoria === 'SIN ASIGNAR';

/**
 * Orquestador: pasos, estado del preview e importación. El parseo y la
 * categorización viven en src/lib/import; la tabla, el resumen y el diálogo
 * de reglas son componentes hermanos.
 */
const BankStatementImporter = ({ accounts, categories, transactions, onImportTransactions }: BankStatementImporterProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('select-account');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);
  const [meta, setMeta] = useState<ParseMeta | null>(null);
  const [importing, setImporting] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dateFormat, setDateFormat] = useState<DateHint>('auto');
  const [needsDateFormatChoice, setNeedsDateFormatChoice] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingLinks, setPendingLinks] = useState<Record<string, string>>({});
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const [ruleRow, setRuleRow] = useState<ParsedRow | null>(null);

  const { toast } = useToast();
  const { findMatchingRuleDetailed, addRule } = useClassificationRules();
  const { pendings, reload: reloadPendings } = usePendings();
  const { sync } = useSubscriptionSync();

  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);
  const isCreditCard = selectedAccount?.tipo === 'Tarjeta de Crédito';

  const sinAsignarCategory = useMemo(
    () => categories.find(c => c.subcategoria === 'Sin Asignar' || c.categoria === 'Sin Asignar'),
    [categories],
  );

  const historyIndex = useMemo(() => buildHistoryIndex(transactions, sinAsignarCategory?.id), [transactions, sinAsignarCategory]);

  const categorizer = useCallback(
    (descripcion: string, monto: number) => suggestCategory(descripcion, monto, selectedAccountId, historyIndex, findMatchingRuleDetailed),
    [selectedAccountId, historyIndex, findMatchingRuleDetailed],
  );

  const processFile = async (file: File, hint: DateHint) => {
    const result = await parseBankStatement(await file.arrayBuffer(), file.name, hint);

    if (result.movements.length === 0) {
      toast({
        title: 'Error',
        description: /\.xlsx?$/i.test(file.name)
          ? 'No se encontraron transacciones válidas en el archivo Excel. Revisa que tenga columnas de fecha e importe.'
          : 'No se encontraron transacciones válidas en el archivo',
        variant: 'destructive',
      });
      return;
    }

    if (result.meta.ambiguousDate && hint === 'auto' && !needsDateFormatChoice) {
      setPendingFile(file);
      setNeedsDateFormatChoice(true);
      return;
    }

    setParsedRows(toParsedRows(result.movements, selectedAccount!.tipo, categorizer, categories, sinAsignarCategory?.id));
    setSkipped(result.skipped);
    setMeta(result.meta);
    setStep('preview');
    setNeedsDateFormatChoice(false);
    setPendingFile(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await processFile(file, dateFormat);
    } catch (error) {
      console.error('Error parsing file:', error);
      const description = error instanceof Error ? error.message : 'Error al procesar el archivo';
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmDateFormat = async (chosen: 'DMY' | 'MDY') => {
    setDateFormat(chosen);
    if (!pendingFile) {
      setNeedsDateFormatChoice(false);
      return;
    }
    try {
      await processFile(pendingFile, chosen);
    } catch (error) {
      console.error('Error reparsing file:', error);
      toast({ title: 'Error', description: 'Error al reprocesar el archivo', variant: 'destructive' });
    }
  };

  const handleToggleInclude = (id: string) =>
    setParsedRows(prev => prev.map(row => (row.id === id ? { ...row, incluir: !row.incluir } : row)));

  const handleToggleReembolso = (id: string) =>
    setParsedRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const newEsReembolso = !row.esReembolso;
      return {
        ...row,
        esReembolso: newEsReembolso,
        esGasto: newEsReembolso ? true : row.montoOriginal < 0 ? !isCreditCard : isCreditCard,
      };
    }));

  const handleCategoryChange = (id: string, categoriaId: string) =>
    setParsedRows(prev => prev.map(row => (row.id === id ? { ...row, categoriaId, categoriaManual: true } : row)));

  /** Aplica una regla recién creada a las filas no manuales que coincidan; devuelve cuántas. */
  const applyRule = (rule: NewRule): number => {
    // Se calcula sobre el estado actual, fuera del updater: React no garantiza cuándo (ni cuántas
    // veces, en StrictMode) ejecuta el updater, así que un contador dentro daría 0 o el doble.
    let n = 0;
    const next = parsedRows.map(row => {
      if (row.categoriaManual) return row;
      if (rule.cuenta_id && rule.cuenta_id !== selectedAccountId) return row;
      if (!matchesClassificationRule(row.descripcion, rule.keyword, rule.match_type)) return row;
      n++;
      return {
        ...row,
        categoriaId: rule.category_id,
        suggestion: { categoriaId: rule.category_id, source: 'regla' as const, detail: `Regla · ${rule.name || rule.keyword}`, confidence: 'alta' as const },
      };
    });
    if (n > 0) setParsedRows(next);
    return n;
  };

  const handleImport = async () => {
    const rowsToImport = parsedRows.filter(row => row.incluir);
    if (rowsToImport.length === 0) {
      toast({ title: 'Error', description: 'No hay transacciones seleccionadas para importar', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      // Ensure we have a valid "Sin Asignar" category id (required by DB FK)
      let fallbackCategoryId = sinAsignarCategory?.id || '';
      if (!fallbackCategoryId) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error('Usuario no autenticado');
        const { data, error } = await supabase.rpc('ensure_sin_asignar_category', { user_uuid: userData.user.id });
        if (error) throw error;
        fallbackCategoryId = (data as string) || '';
      }
      if (!fallbackCategoryId) {
        toast({ title: 'Error', description: 'No se pudo determinar la categoría "Sin Asignar". Reintenta y revisa tus categorías.', variant: 'destructive' });
        return;
      }

      const transactionsToImport = rowsToImport.map(row => {
        const subcategoriaId = row.categoriaId || fallbackCategoryId;
        // Reembolso = ingreso > 0 + categoría tipo 'Gastos'
        const ingreso = row.esReembolso ? row.monto : (row.esGasto ? 0 : row.monto);
        const gasto = row.esReembolso ? 0 : (row.esGasto ? row.monto : 0);
        const result: Omit<Transaction, 'id' | 'monto'> = {
          cuentaId: selectedAccountId,
          fecha: row.fecha,
          comentario: row.descripcion,
          ingreso,
          gasto,
          subcategoriaId,
          divisa: selectedAccount?.divisa || 'MXN',
        };
        if (row.tarjetahabiente) result.tarjetahabiente = row.tarjetahabiente;
        return result;
      });

      // addTransactionsBatch relanza si falla y, si va bien, ya invalidó `transacciones`.
      await onImportTransactions(transactionsToImport);

      // Vincular pendientes: localizar la transacción recién creada (cuenta+fecha+comentario+monto)
      // y marcar el pendiente como cobrado.
      const linkedEntries = rowsToImport
        .map(r => ({ row: r, pendingId: pendingLinks[r.id] }))
        .filter(e => e.pendingId);
      let vinculados = 0;
      if (linkedEntries.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (userId) {
          for (const { row, pendingId } of linkedEntries) {
            const pending = pendings.find(p => p.id === pendingId);
            if (!pending) continue;
            const fechaStr = toFechaISO(row.fecha);
            const { data: txMatches } = await supabase
              .from('transacciones')
              .select('id, ingreso, comentario, cuenta_id, fecha, created_at')
              .eq('user_id', userId)
              .eq('cuenta_id', selectedAccountId)
              .eq('fecha', fechaStr)
              .eq('comentario', row.descripcion)
              .order('created_at', { ascending: false })
              .limit(5);
            const tx = (txMatches ?? []).find(t => Math.abs(Number(t.ingreso) - row.monto) < 0.01);
            if (!tx) continue;
            const totalCobrado = (pending.monto_cobrado ?? 0) + row.monto;
            const nuevoEstado = totalCobrado >= pending.monto_esperado ? 'cobrado' : 'cobrado_parcial';
            await supabase
              .from('transaction_pendings')
              .update({ transaccion_cobro_id: tx.id, monto_cobrado: totalCobrado, fecha_cobro: fechaStr, estado: nuevoEstado })
              .eq('id', pendingId);
            vinculados++;
          }
          await reloadPendings();
        }
      }

      toast({
        title: 'Importación completada',
        description: `${transactionsToImport.length} transacciones importadas en ${selectedAccount?.nombre ?? 'la cuenta'}${vinculados > 0 ? ` · ${vinculados} pendiente${vinculados !== 1 ? 's' : ''} vinculado${vinculados !== 1 ? 's' : ''}` : ''}`,
      });

      handleClose();

      // La caché de transacciones ya está al día: el sync lee de ella y deja
      // subscription_services listo para el móvil. Sus errores ya muestran toast.
      sync().catch(() => undefined);
    } catch (error) {
      console.error('Error importing:', error);
      toast({ title: 'Error', description: 'Error al importar transacciones', variant: 'destructive' });
      // El preview sigue abierto con las filas intactas.
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('select-account');
    setSelectedAccountId('');
    setParsedRows([]);
    setSkipped([]);
    setMeta(null);
    setDateFormat('auto');
    setNeedsDateFormatChoice(false);
    setPendingFile(null);
    setPendingLinks({});
    setPreviewFilter('all');
    setRuleRow(null);
  };

  const selectedCount = parsedRows.filter(r => r.incluir).length;
  const sinAsignarCount = useMemo(
    () => parsedRows.filter(row => esSinAsignar(categories.find(c => c.id === row.categoriaId))).length,
    [parsedRows, categories],
  );
  const dudosasCount = useMemo(() => parsedRows.filter(r => !r.categoriaManual && r.suggestion?.confidence === 'media').length, [parsedRows]);
  const hasTarjetahabiente = useMemo(() => parsedRows.some(r => r.tarjetahabiente), [parsedRows]);

  // Pendientes activos que coinciden con filas de ingreso (divisa + monto restante).
  const activePendings = useMemo(
    () => pendings.filter(p => p.estado === 'pendiente' || p.estado === 'cobrado_parcial'),
    [pendings],
  );
  const rowPendingMatches = useMemo(() => {
    const map = new Map<string, Pending[]>();
    if (!selectedAccount || activePendings.length === 0) return map;
    for (const row of parsedRows) {
      if (row.esGasto || row.esReembolso) continue;
      if (row.tipo !== 'Ingreso') continue;
      const matches = activePendings.filter(p =>
        p.divisa === selectedAccount.divisa &&
        Math.abs((p.monto_esperado - (p.monto_cobrado ?? 0)) - row.monto) < 0.01);
      if (matches.length > 0) map.set(row.id, matches);
    }
    return map;
  }, [parsedRows, activePendings, selectedAccount]);

  const togglePendingLink = (rowId: string, matches: Pending[]) =>
    setPendingLinks(prev => {
      const next = { ...prev };
      if (next[rowId]) delete next[rowId];
      else next[rowId] = (matches.find(m => m.id === prev[rowId]) ?? matches[0]).id;
      return next;
    });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const sortedRows = useMemo(() => [...parsedRows].sort((a, b) => {
    let comparison = 0;
    switch (sortColumn) {
      case 'fecha': comparison = a.fecha.getTime() - b.fecha.getTime(); break;
      case 'descripcion': comparison = a.descripcion.localeCompare(b.descripcion); break;
      case 'tipo': comparison = a.tipo.localeCompare(b.tipo); break;
      case 'monto': comparison = a.monto - b.monto; break;
      case 'categoria': {
        const catA = categories.find(c => c.id === a.categoriaId);
        const catB = categories.find(c => c.id === b.categoriaId);
        const nameA = catA ? `${catA.categoria} - ${catA.subcategoria}` : 'Sin Asignar';
        const nameB = catB ? `${catB.categoria} - ${catB.subcategoria}` : 'Sin Asignar';
        comparison = nameA.localeCompare(nameB);
        break;
      }
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [parsedRows, sortColumn, sortDirection, categories]);

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'sin_asignar') return sortedRows.filter(row => esSinAsignar(categories.find(c => c.id === row.categoriaId)));
    if (previewFilter === 'dudosas') return sortedRows.filter(r => !r.categoriaManual && r.suggestion?.confidence === 'media');
    return sortedRows;
  }, [sortedRows, previewFilter, categories]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Estado de Cuenta
        </Button>
      </DialogTrigger>

      <DialogContent className={`${step === 'preview' ? 'max-w-5xl max-h-[90vh]' : 'max-w-md'}`} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Estado de Cuenta
          </DialogTitle>
          <DialogDescription>
            {step === 'select-account' && 'Selecciona la cuenta a la que pertenece el estado de cuenta'}
            {step === 'upload' && 'Sube tu archivo CSV o Excel'}
            {step === 'preview' && `Vista previa - ${selectedCount} de ${parsedRows.length} transacciones seleccionadas`}
          </DialogDescription>
        </DialogHeader>

        {step === 'select-account' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nombre} ({account.tipo}) - {account.divisa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAccount && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Tipo:</strong> {selectedAccount.tipo}</p>
                <p><strong>Divisa:</strong> {selectedAccount.divisa}</p>
                <p className="text-muted-foreground mt-2">
                  {isCreditCard
                    ? 'En tarjetas de crédito: valores positivos = gastos, negativos = pagos/abonos'
                    : 'En cuentas bancarias: valores negativos = gastos, positivos = ingresos'}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => setStep('upload')} disabled={!selectedAccountId}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Arrastra o haz clic para subir</p>
                <p className="text-sm text-muted-foreground mt-1">CSV o Excel (.csv, .xls, .xlsx)</p>
              </label>
            </div>

            {needsDateFormatChoice && (
              <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Formato de fecha ambiguo</p>
                    <p className="text-muted-foreground mt-1">Algunas fechas pueden interpretarse como DD/MM o MM/DD. Selecciona el formato:</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="default" onClick={() => handleConfirmDateFormat('DMY')}>DD/MM/YYYY (México / España)</Button>
                  <Button size="sm" variant="outline" onClick={() => handleConfirmDateFormat('MDY')}>MM/DD/YYYY (EEUU)</Button>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select-account')}>Atrás</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3 overflow-hidden">
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant={previewFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewFilter('all')}>
                Todas ({parsedRows.length})
              </Button>
              <Button
                variant={previewFilter === 'sin_asignar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewFilter('sin_asignar')}
                className={sinAsignarCount > 0 ? 'border-yellow-500' : ''}
              >
                Sin Asignar ({sinAsignarCount})
              </Button>
              <Button variant={previewFilter === 'dudosas' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewFilter('dudosas')}>
                Dudosas ({dudosasCount})
              </Button>
            </div>

            <ImportPreviewTable
              rows={filteredPreviewRows}
              allRows={parsedRows}
              categories={categories}
              isCreditCard={!!isCreditCard}
              hasTarjetahabiente={hasTarjetahabiente}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onToggleAll={(checked) => setParsedRows(prev => prev.map(r => ({ ...r, incluir: checked })))}
              onToggleInclude={handleToggleInclude}
              onToggleReembolso={handleToggleReembolso}
              onCategoryChange={handleCategoryChange}
              onCreateRule={setRuleRow}
              pendingMatches={rowPendingMatches}
              pendingLinks={pendingLinks}
              onTogglePendingLink={togglePendingLink}
            />

            <ImportSummaryBar
              rows={parsedRows}
              skipped={skipped}
              meta={meta}
              currency={selectedAccount?.divisa ?? 'MXN'}
              importing={importing}
              selectedCount={selectedCount}
              onBack={() => { setParsedRows([]); setSkipped([]); setMeta(null); setStep('upload'); }}
              onImport={handleImport}
            />
          </div>
        )}
      </DialogContent>

      <CreateRuleFromRowDialog
        row={ruleRow}
        onClose={() => setRuleRow(null)}
        categories={categories}
        accountId={selectedAccountId}
        accountName={selectedAccount?.nombre ?? ''}
        rows={parsedRows}
        onSave={addRule}
        onApplied={applyRule}
      />
    </Dialog>
  );
};

export default BankStatementImporter;
```

- [ ] En `src/pages/Transacciones.tsx` sustituir `import BankStatementImporter from '@/components/BankStatementImporter';` por `import BankStatementImporter from '@/components/import/BankStatementImporter';`.
- [ ] `git rm src/components/BankStatementImporter.tsx`.
- [ ] `grep -rn "console.log" src/components/import src/lib/import` → sin resultados. `grep -rn "parseCSVLine\|getCategoriesForRow" src` → sin resultados. `wc -l src/components/import/BankStatementImporter.tsx` → ≈ 350-420.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npx vitest run` → verde.
- [ ] Verificación manual (escritorio, `#/transacciones`, fixtures de `$TMPDIR`):
  1. `coma.csv`: las filas coinciden con la anotación "antes" salvo las diferencias de orden de categorización declaradas. `es.csv` (`;`, `1.234,56`): montos y fechas correctas; el pie muestra `separador ";"`.
  2. `latin1.csv`: descripciones con acentos legibles; pie "Archivo leído como Latin-1".
  3. `importe_saldo.xlsx`: el monto es el de `Importe`, no `Saldo`.
  4. `sin_fecha.csv`: "1 fila descartada" → desplegar muestra fila, motivo "Sin fecha válida" y contenido.
  5. Fila con descripción idéntica a historial: icono History + tooltip "Historial · N movimientos"; fila que solo coincide con una regla: icono ListChecks + "Regla · Nombre"; sin nada: borde amarillo sin icono. Cambiar categoría a mano → icono lápiz "Manual". Filtro "Dudosas (N)" lista solo parciales.
  6. Combobox de categoría → "Crear regla para filas como esta…": diálogo prellenado, "Coincide con N filas"; guardar → toast "Regla creada · Aplicada a N filas", filas con icono Regla, y en `#/reglas-clasificacion` aparece la regla.
  7. Fallo de insert (en DevTools › Network, bloquear el patrón `rest/v1/transacciones` — corta también el GET de refetch, es esperado — y pulsar Importar): toast "Error al importar transacciones" y el preview sigue abierto con las filas.
  8. Importación correcta: toast "N transacciones importadas en {cuenta}"; Red muestra `POST transacciones`, `GET transacciones`, `GET subscription_services` y los `PATCH`/`POST` del sync; móvil 390×844 `#/suscripciones` refleja el cargo nuevo sin abrir el gestor de escritorio.
- [ ] Commit: `git add src/components/import src/pages/Transacciones.tsx && git commit -m "Dividir el importador: parser y categorización en lib, tabla con fuente de la sugerencia, reglas desde el preview y resumen con descartes" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.

---

### Task 4.6: Changelog 7.7 + build + verificación manual final

**Files**
- Modify: `src/components/Changelog.tsx`

- [ ] Insertar al principio del array `changelog`:

```tsx
  {
    version: '7.7',
    date: 'Septiembre 2026',
    changes: [
      { icon: <Upload className="h-4 w-4" />, text: 'Importación más fiable: CSV con separador ; o coma, archivos Latin-1, columna Importe respetada en Excel, y las filas descartadas se ven con su motivo', type: 'improvement' },
      { icon: <Tag className="h-4 w-4" />, text: 'Cada categoría sugerida muestra por qué (historial exacto, regla o parecido); las reglas ganan a las adivinanzas y se pueden crear desde el propio preview', type: 'feature' },
      { icon: <Bug className="h-4 w-4" />, text: 'Si la importación falla, el preview permanece abierto; si va bien, un aviso indica cuántas transacciones se guardaron y las suscripciones del móvil quedan al día', type: 'fix' },
    ],
  },
```

- [ ] `npx vitest run` → verde (fechas, alerts, subscriptions, subscriptionPatterns, classificationRules, bankStatementParser, importCategorizer, toParsedRows y los existentes). `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npm run build` → sin errores; en la salida, `xlsx` sigue en un chunk aparte (carga bajo demanda).
- [ ] Verificación manual: repetir los puntos 1 y 8 de la Task 4.5 con el build de producción (`preview_start` `name: "savium-preview"`, puerto 4173); el pie del sidebar dice `v7.7`.
- [ ] Commit: `git add src/components/Changelog.tsx && git commit -m "Changelog 7.7" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.
- [ ] Avisar al usuario: rama `consolidacion-datos` lista; push y despliegue solo cuando lo pida.

---

### Critical Files for Implementation
- `/Users/manoloto/Apps/SaviumFinance/docs/superpowers/specs/2026-09-21-consolidacion-datos-design.md` (fuente de verdad de las cinco fases)
- `/Users/manoloto/Apps/SaviumFinance/src/hooks/useFinanceDataSupabase.ts` (claves de caché, `invalidate`, `addTransactionsBatch`)
- `/Users/manoloto/Apps/SaviumFinance/src/components/SubscriptionsManager.tsx` (origen de patrones, `resolveServiceName`, `calculateNextPayment` y la UI que se conserva)
- `/Users/manoloto/Apps/SaviumFinance/src/lib/finance/alerts.ts` (regla del corte de datos)
- `/Users/manoloto/Apps/SaviumFinance/src/components/BankStatementImporter.tsx` (origen de `parseAmount`/`parseDate`/`detectFormat` y del split en `src/components/import/*`)

<!-- FIN PARTE 4/4 -->