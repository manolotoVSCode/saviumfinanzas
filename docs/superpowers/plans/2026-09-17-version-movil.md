# Plan de implementación: versión móvil reducida

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Contexto

Savium hoy muestra en móvil (< 768px) las mismas páginas completas de escritorio apretadas en una pantalla chica: letra pequeña, tablas, formularios. El usuario quiere una versión móvil **reducida y de solo lectura** para consultar rápido activos y pasivos, inversiones, suscripciones, cuentas por cobrar y por pagar — sin transacciones, sin importar, sin editar nada. La spec fue aprobada en chat y revisada contra el código por los agentes `code-reviewer` y `explorer` (21 hallazgos incorporados). Este plan la implementa.

**Goal:** En pantallas < 768px, Savium muestra cinco pantallas de solo lectura (Resumen, Inversiones, Suscripciones, Por cobrar, Por pagar) con nav inferior, letra grande y selector de divisa propio; el resto de rutas protegidas muestran "Solo disponible en escritorio". El escritorio no cambia de comportamiento.

**Architecture:** `App.tsx` envuelve cada ruta protegida en `ProtectedRoute > Responsive > página`. `Responsive` elige con `useIsMobile()` entre la página de escritorio (que sigue montando su propio `Layout`) y `MobileLayout > página móvil` (con `MobileCurrencyProvider` y `Suspense` propios). La lógica de negocio nueva vive como funciones puras en `src/lib/finance/` (`investmentReturn`, `computeCxP`, `computeSubscriptionsSummary`, `computePendingsSummary`, `fechas`) con tests vitest; las páginas móviles solo componen hooks existentes + esas funciones. `Layout.tsx` pierde su rama móvil.

**Tech Stack:** React 18, Vite, TypeScript (strict: false), Tailwind + shadcn/ui, TanStack Query 5, Supabase, react-router-dom 6 (`HashRouter`), vitest 2 (solo `src/**/*.test.ts`), lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-17-version-movil-design.md` (fuente de verdad).

## Global Constraints

- Rama de trabajo: `git checkout -b version-movil` antes de la Tarea 1.
- Comandos de verificación: `npx vitest run <archivo>` por tarea, `npx vitest run` completo, `npx tsc --noEmit -p tsconfig.app.json` (el archivo existe), `npm run build`.
- Mensajes de commit en español, sin prefijos (`feat:`, etc.), una línea de asunto y el pie `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Verificación manual: Browser pane con `preview_start` `name: "savium-dev"` (puerto 8080), `resize_window` a 390×844 para móvil y `preset: "desktop"` para escritorio. Rutas con hash: `http://localhost:8080/#/dashboard`.
- Modo oscuro: en consola `document.documentElement.classList.add('dark')` (no hay toggle en la app).
- Nada por debajo de 14px en contenido; importe principal 32px; filas ≥ 48px; código de divisa siempre junto al número. Excepción única: etiquetas de la nav inferior a 12px (cinco etiquetas de 14px no caben en 390px).
- `computeCxP` recibe siempre `baseCurrency = config.currency`, nunca la divisa elegida en móvil.
- Ningún control móvil crea, edita ni borra nada.
- Páginas de escritorio que se tocan: solo `Inversiones.tsx` (usa `investmentReturn`) y `CxP.tsx` (usa `computeCxP` + `useSubscriptionServices`).
- Push solo cuando el usuario lo pida.

## Decisiones tomadas al planificar (no están en la spec)

1. Las suscripciones en `CxP.tsx` usan hoy `'MXN'` literal como divisa; `computeCxP` usa `baseCurrency` (con perfil MXN el escritorio muestra lo mismo). Es la única diferencia intencional respecto al código literal.
2. `investmentReturn` devuelve también `ultima` para que `Inversiones.tsx` deje de calcular `valsInv` localmente.
3. `MobileLayout` se monta desde `Responsive` (no desde cada página) para que sobreviva al cambio de ruta: solo cambia el hijo lazy, que suspende en el `Suspense` de `MobileLayout`.
4. En `CxP.tsx` escritorio, `bloques` pasa a `allRows.filter(r => r.tipo === ...)`: totales idénticos; dentro de cada pestaña las filas quedan ordenadas por fecha (antes, orden de inserción).
5. Utilidades de fecha (`parseFechaLocal`, `diasHasta`, `formatFechaCorta`) en `src/lib/finance/fechas.ts` porque `new Date('YYYY-MM-DD')` parsea en UTC y desplaza un día en México.
6. **Comportamiento heredado conocido:** `computeCxP` conserva `new Date(s.proximo_pago)` (UTC) para suscripciones, copiado de `CxP.tsx`. En México eso muestra la fecha un día antes en Por pagar y excluye del CxP una suscripción cuyo `proximo_pago` es hoy; `SuscripcionesMovil` usa `parseFechaLocal` y muestra el día correcto. La discrepancia entre ambas pantallas NO es un error de la implementación. Se mantiene para que el commit de extracción dé "totales idénticos" al escritorio; corregirlo (usar `parseFechaLocal` en `computeCxP`, cambiando también escritorio) queda como commit aparte opcional al final, previa decisión del usuario.
7. `InversionesMovil` muestra `i.tipo` (texto copiado al guardar), no el nombre actual del tipo por `tipo_id` como hace el escritorio. Si el usuario renombra un tipo, las etiquetas difieren. Aceptado para no cargar `useInvestmentTypes` en móvil.
8. `MobileCurrencyProvider` expone `ready`; `MobileLayout` no monta ninguna pantalla hasta que `ready` (elección guardada o perfil cargado), para que nada se calcule con el `'MXN'` provisional de `useAppConfig`.

---

### Task 1: `useIsMobile` síncrono y `viewport-fit=cover`

**Files**
- Modify: `src/hooks/use-mobile.tsx`
- Modify: `index.html` (línea 5)
- Test: ninguno (hook de DOM; verificación manual)

**Interfaces**
- Produces: `useIsMobile(): boolean` con valor correcto ya en el primer render.

- [ ] Crear rama: `git checkout -b version-movil`.
- [ ] Copiar este plan al repo para que viaje con la spec: `cp ~/.claude/plans/pasame-el-plan-ya-vivid-noodle.md docs/superpowers/plans/2026-09-17-version-movil.md` (crear la carpeta) y `git add docs/superpowers/plans && git commit -m "Plan de implementación de la versión móvil"`.
- [ ] Sustituir el contenido completo de `src/hooks/use-mobile.tsx` por:

```tsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * true por debajo de 768px. Se inicializa de forma síncrona para que el primer
 * render ya sea el correcto (antes arrancaba en undefined → false y en móvil
 * montaba la página de escritorio un instante).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => window.innerWidth < MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
```

- [ ] En `index.html`, línea 5:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual: Browser pane a 390×844, `#/dashboard`: aparece directamente el layout móvil actual (nav inferior antigua) sin parpadeo del sidebar. A escritorio: sidebar.
- [ ] Commit: `git add src/hooks/use-mobile.tsx index.html && git commit -m "useIsMobile síncrono y viewport-fit=cover para la versión móvil"`.

---

### Task 2: `investmentReturn` como función pura + uso en `Inversiones.tsx`

**Files**
- Create: `src/lib/finance/investmentReturn.ts`
- Test: `src/lib/finance/investmentReturn.test.ts`
- Modify: `src/pages/Inversiones.tsx` (imports + líneas 135-144)

**Interfaces**
- Consumes: `Investment`, `InvestmentValuation` de `@/types/investments`.
- Produces:
  ```ts
  export interface InvestmentReturn { invertido: number; valor: number; delta: number; pct: number; ultima?: InvestmentValuation }
  export const investmentReturn = (inv: Investment, valuations: InvestmentValuation[]): InvestmentReturn
  ```

- [ ] Escribir `src/lib/finance/investmentReturn.test.ts` (antes de escribirlo, confirmar los campos de `InvestmentValuation` en `src/types/investments.ts:78+` y ajustar la factory `val` si difieren):

```ts
import { describe, expect, it } from 'vitest';
import { Investment, InvestmentValuation } from '@/types/investments';
import { investmentReturn } from './investmentReturn';

const inv = (over: Partial<Investment>): Investment => ({
  id: 'i1', user_id: 'u', nombre: 'Cetes', tipo: 'Renta fija', tipo_id: null,
  monto_invertido: 0, valor_actual: 0, rendimiento_bruto: null, rendimiento_neto: null,
  tasa_anual: null, modalidad: 'Reinversión', modalidad_pago: null, moneda: 'MXN',
  fecha_inicio: '2026-01-01', fecha_vencimiento: null, ultimo_pago: null, cuenta_id: null,
  beneficio_estimado: null, notas: null, activa: true, saldo_cuenta: null,
  ...over,
});

const val = (over: Partial<InvestmentValuation>): InvestmentValuation => ({
  id: 'v', user_id: 'u', inversion_id: 'i1', fecha: '2026-01-01', valor: 0, aportacion: 0, retiro: 0, notas: null,
  ...over,
} as InvestmentValuation);

describe('investmentReturn', () => {
  it('con una sola valuación la base es monto_invertido y ultima es esa valuación', () => {
    const r = investmentReturn(
      inv({ monto_invertido: 1000, valor_actual: 1200 }),
      [val({ id: 'v1', fecha: '2026-03-01', valor: 1200 })],
    );
    expect(r.invertido).toBe(1000);
    expect(r.valor).toBe(1200);
    expect(r.delta).toBe(200);
    expect(r.pct).toBe(20);
    expect(r.ultima?.id).toBe('v1');
  });

  it('con varias valuaciones la base es la primera por fecha y ultima la más reciente', () => {
    const r = investmentReturn(
      inv({ monto_invertido: 1000, valor_actual: 1300 }),
      [
        val({ id: 'v2', fecha: '2026-06-01', valor: 1300 }),
        val({ id: 'v1', fecha: '2026-01-01', valor: 1100 }),
        val({ id: 'otra', inversion_id: 'i2', fecha: '2025-01-01', valor: 5 }),
      ],
    );
    expect(r.invertido).toBe(1000);
    expect(r.valor).toBe(1300);
    expect(r.delta).toBe(200);
    expect(r.pct).toBeCloseTo(18.1818, 3);
    expect(r.ultima?.id).toBe('v2');
  });

  it('sin monto_invertido usa la primera valuación como invertido', () => {
    const r = investmentReturn(
      inv({ monto_invertido: 0, valor_actual: 500 }),
      [val({ fecha: '2026-02-01', valor: 500 })],
    );
    expect(r.invertido).toBe(500);
    expect(r.valor).toBe(500);
    expect(r.delta).toBe(0);
    expect(r.pct).toBe(0);
  });

  it('sin monto_invertido ni valuaciones usa saldo_cuenta', () => {
    const r = investmentReturn(inv({ monto_invertido: 0, valor_actual: 800, saldo_cuenta: 800 }), []);
    expect(r.invertido).toBe(800);
    expect(r.delta).toBe(0);
    expect(r.ultima).toBeUndefined();
  });

  it('con base cero el porcentaje es 0 y no NaN', () => {
    const r = investmentReturn(inv({ monto_invertido: 0, valor_actual: 0 }), []);
    expect(r.pct).toBe(0);
    expect(r.valor).toBe(0);
  });
});
```

- [ ] `npx vitest run src/lib/finance/investmentReturn.test.ts` → falla (módulo no existe).
- [ ] Crear `src/lib/finance/investmentReturn.ts`:

```ts
import { Investment, InvestmentValuation } from '@/types/investments';

export interface InvestmentReturn {
  /** Capital de referencia: monto_invertido, si no la primera valuación, si no el saldo de la cuenta vinculada. */
  invertido: number;
  /** Valor actual (valor_actual ya viene sobreescrito por useInvestments). */
  valor: number;
  /** valor − base, donde base es la primera valuación si hay más de una, si no `invertido`. */
  delta: number;
  /** delta / base × 100; 0 si base es 0. */
  pct: number;
  /** Última valuación por fecha, si existe. */
  ultima?: InvestmentValuation;
}

/**
 * Misma fórmula que usaba Inversiones.tsx en línea: rendimiento de una inversión
 * a partir de sus valuaciones. No muta `valuations`.
 */
export const investmentReturn = (inv: Investment, valuations: InvestmentValuation[]): InvestmentReturn => {
  const valsInv = valuations
    .filter((v) => v.inversion_id === inv.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primera = valsInv[0];
  const ultima = valsInv[valsInv.length - 1];
  const invertido = inv.monto_invertido || (primera ? primera.valor : inv.saldo_cuenta ?? 0);
  const valor = inv.valor_actual || invertido || 0;
  const base = primera && valsInv.length > 1 ? primera.valor : invertido;
  const delta = valor - base;
  const pct = base ? (delta / base) * 100 : 0;
  return { invertido, valor, delta, pct, ultima };
};
```

- [ ] `npx vitest run src/lib/finance/investmentReturn.test.ts` → 5 tests en verde.
- [ ] En `src/pages/Inversiones.tsx` añadir el import tras `import { Investment } from '@/types/investments';`:

```ts
import { investmentReturn } from '@/lib/finance/investmentReturn';
```

- [ ] En `src/pages/Inversiones.tsx`, sustituir el bloque de las líneas 135-144 (desde `const valsInv = valuations` hasta `const pct = base ? (delta / base) * 100 : 0;`) por:

```ts
          const { invertido, valor, delta, pct, ultima } = investmentReturn(i, valuations);
```

  (El resto de `renderGrupo` sigue usando `ultima`, `invertido`, `valor`, `delta`, `pct` sin cambios. Si `valsInv` se usa en otra parte del mismo bloque, conservarlo.)

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual (escritorio, `#/inversiones`): cada inversión muestra los mismos importes y "Última valuación" que antes.
- [ ] Commit: `git add src/lib/finance/investmentReturn.ts src/lib/finance/investmentReturn.test.ts src/pages/Inversiones.tsx && git commit -m "Extraer investmentReturn a función pura con tests"`.

---

### Task 3: `computeCxP` + `useSubscriptionServices` + `CxP.tsx` los usa

**Files**
- Create: `src/lib/finance/cxp.ts`
- Test: `src/lib/finance/cxp.test.ts`
- Create: `src/hooks/useSubscriptionServices.ts`
- Modify: `src/hooks/useFinanceDataSupabase.ts` (añadir clave `subscriptions` a `financeQueryKeys`, líneas 18-22)
- Modify: `src/pages/CxP.tsx`

**Interfaces**
- Consumes: `Account`, `Category`, `Transaction` (`@/types/finance`), `CurrencyCode` (`./dashboardMetrics`), `Database` (`@/integrations/supabase/types`), `financeQueryKeys`.
- Produces:
  ```ts
  // cxp.ts
  export type CxPTipo = 'Suscripción' | 'Pago anual' | 'Recurrente mensual' | 'Tarjeta de crédito' | 'Préstamo';
  export interface CxPRow { id: string; concepto: string; tipo: CxPTipo; monto: number; divisa: CurrencyCode; fechaEstimada: Date; detalle?: string }
  export interface CxPSubscription { id: string; service_name: string; active: boolean; frecuencia: string; proximo_pago: string; ultimo_pago_monto: number }
  export interface CxPInput { transactions: Transaction[]; categories: Category[]; accounts: Account[]; subscriptions: CxPSubscription[]; horizonte: number; baseCurrency: CurrencyCode; now?: Date }
  export const computeCxP = (input: CxPInput): CxPRow[]   // ordenadas por fechaEstimada asc, sin convertir divisas
  // useSubscriptionServices.ts
  export type SubscriptionService = Database['public']['Tables']['subscription_services']['Row'];
  export const useSubscriptionServices = (): { subscriptions: SubscriptionService[]; loading: boolean; error: Error | null }
  // useFinanceDataSupabase.ts
  financeQueryKeys(userId).subscriptions  // ['finance', userId, 'subscriptions'] as const
  ```

- [ ] Escribir `src/lib/finance/cxp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Account, Category, Transaction } from '@/types/finance';
import { computeCxP, CxPSubscription } from './cxp';

// "Hoy" fijo: 15 de septiembre de 2026
const NOW = new Date(2026, 8, 15);

const account = (over: Partial<Account>): Account => ({
  id: 'a1', nombre: 'Banco', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN', ...over,
});

const cat = (over: Partial<Category>): Category => ({
  id: 'c1', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos', ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

const sub = (over: Partial<CxPSubscription>): CxPSubscription => ({
  id: 's1', service_name: 'Netflix', active: true, frecuencia: 'Mensual', proximo_pago: '2026-09-20', ultimo_pago_monto: 199,
  ...over,
});

const base = { transactions: [] as Transaction[], categories: [] as Category[], accounts: [] as Account[], subscriptions: [] as CxPSubscription[], horizonte: 30, baseCurrency: 'MXN' as const, now: NOW };

describe('computeCxP · suscripciones', () => {
  it('incluye las activas con próximo pago dentro del horizonte, en baseCurrency', () => {
    const rows = computeCxP({ ...base, subscriptions: [
      sub({}),
      sub({ id: 's2', active: false }),
      sub({ id: 's3', proximo_pago: '2026-09-10' }),   // ya pasó
      sub({ id: 's4', proximo_pago: '2026-11-01' }),   // fuera de 30 días
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'sub-s1', concepto: 'Netflix', tipo: 'Suscripción', monto: 199, divisa: 'MXN', detalle: 'Mensual' });
    expect(rows[0].fechaEstimada.getTime()).toBe(new Date('2026-09-20').getTime());
  });

  it('una fila sin divisa propia (suscripción) cae en baseCurrency', () => {
    const rows = computeCxP({ ...base, baseCurrency: 'USD', subscriptions: [sub({})] });
    expect(rows[0].divisa).toBe('USD');
  });
});

describe('computeCxP · pagos anuales', () => {
  const seguro = cat({ id: 'seg', categoria: 'Seguros', subcategoria: 'Coche', frecuencia_seguimiento: 'anual' });

  it('proyecta el último pago + 1 año con su divisa', () => {
    const rows = computeCxP({ ...base, categories: [seguro], transactions: [
      tx({ subcategoriaId: 'seg', gasto: 12000, divisa: 'USD', fecha: new Date(2025, 8, 25) }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'anual-seg', concepto: 'Seguros · Coche', tipo: 'Pago anual', monto: 12000, divisa: 'USD' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 25));
  });

  it('rueda hacia adelante en años si la proyección ya pasó', () => {
    const rows = computeCxP({ ...base, categories: [seguro], transactions: [
      tx({ subcategoriaId: 'seg', gasto: 100, fecha: new Date(2024, 8, 20) }),
    ] });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 20));
  });

  it('respeta el horizonte: 30 días lo excluye, 60 lo incluye', () => {
    const txs = [tx({ subcategoriaId: 'seg', gasto: 100, fecha: new Date(2025, 10, 1) })]; // → 1 nov 2026
    expect(computeCxP({ ...base, categories: [seguro], transactions: txs, horizonte: 30 })).toHaveLength(0);
    expect(computeCxP({ ...base, categories: [seguro], transactions: txs, horizonte: 60 })).toHaveLength(1);
  });
});

describe('computeCxP · recurrentes', () => {
  const luz = cat({ id: 'luz', categoria: 'Hogar', subcategoria: 'Luz' });

  it('agrupa por subcategoría, detecta mensual y promedia los últimos 2 pagos', () => {
    const rows = computeCxP({ ...base, categories: [luz], transactions: [
      tx({ id: 't1', subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 7, 10) }),
      tx({ id: 't2', subcategoriaId: 'luz', gasto: 700, fecha: new Date(2026, 6, 10) }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'rec-luz-MXN', concepto: 'Hogar · Luz', tipo: 'Recurrente mensual', monto: 600, divisa: 'MXN', detalle: 'mensual · prom. últimos 2' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 9, 10));
  });

  it('con un solo pago no hay recurrente', () => {
    const rows = computeCxP({ ...base, categories: [luz], transactions: [
      tx({ subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 7, 10) }),
    ] });
    expect(rows).toHaveLength(0);
  });
});

describe('computeCxP · tarjetas', () => {
  it('tarjeta con saldo negativo: monto absoluto, su divisa y fecha = now + 15 días', () => {
    const rows = computeCxP({ ...base, accounts: [
      account({ id: 'tc', nombre: 'Visa', tipo: 'Tarjeta de Crédito', saldoActual: -3500, divisa: 'USD' }),
      account({ id: 'tc2', nombre: 'Amex', tipo: 'Tarjeta de Crédito', saldoActual: 100 }),
      account({ id: 'tc3', nombre: 'Vieja', tipo: 'Tarjeta de Crédito', saldoActual: -50, vendida: true }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'card-tc', concepto: 'Visa', tipo: 'Tarjeta de crédito', monto: 3500, divisa: 'USD', detalle: 'Saldo pendiente actual' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 30));
  });
});

describe('computeCxP · préstamos', () => {
  const prestamo = cat({ id: 'loan', categoria: 'Finanzas', subcategoria: 'Préstamo coche' });

  it('cuota = último pago, siguiente mes, solo si el último pago tiene ≤ 45 días', () => {
    const rows = computeCxP({ ...base, categories: [prestamo], transactions: [
      tx({ subcategoriaId: 'loan', gasto: 4000, fecha: new Date(2026, 7, 20) }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'loan-loan', concepto: 'Finanzas · Préstamo coche', tipo: 'Préstamo', monto: 4000, divisa: 'MXN', detalle: 'Cuota estimada' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 20));
  });

  it('préstamo sin pagos en 45 días se considera saldado', () => {
    const rows = computeCxP({ ...base, categories: [prestamo], transactions: [
      tx({ subcategoriaId: 'loan', gasto: 4000, fecha: new Date(2026, 5, 1) }),
    ] });
    expect(rows).toHaveLength(0);
  });
});

describe('computeCxP · orden', () => {
  it('devuelve todas las fuentes ordenadas por fecha estimada', () => {
    const rows = computeCxP({
      ...base,
      categories: [cat({ id: 'loan', categoria: 'Finanzas', subcategoria: 'Préstamo coche' })],
      transactions: [tx({ subcategoriaId: 'loan', gasto: 4000, fecha: new Date(2026, 7, 20) })], // 20 sep
      accounts: [account({ id: 'tc', tipo: 'Tarjeta de Crédito', saldoActual: -10 })],            // 30 sep
      subscriptions: [sub({ proximo_pago: '2026-10-05' })],                                        // 5 oct
    });
    expect(rows.map((r) => r.tipo)).toEqual(['Préstamo', 'Tarjeta de crédito', 'Suscripción']);
  });
});
```

- [ ] `npx vitest run src/lib/finance/cxp.test.ts` → falla (módulo no existe).
- [ ] Crear `src/lib/finance/cxp.ts` (lógica copiada literalmente de los cinco `useMemo` de `CxP.tsx`, con un único `now`; única diferencia intencional: suscripciones usan `baseCurrency` en vez del literal `'MXN'`):

```ts
import { Account, Category, Transaction } from '@/types/finance';
import { CurrencyCode } from './dashboardMetrics';

export type CxPTipo = 'Suscripción' | 'Pago anual' | 'Recurrente mensual' | 'Tarjeta de crédito' | 'Préstamo';

export interface CxPRow {
  id: string;
  concepto: string;
  tipo: CxPTipo;
  monto: number;
  divisa: CurrencyCode;
  fechaEstimada: Date;
  detalle?: string;
}

/** Subconjunto de subscription_services que necesita el cálculo. */
export interface CxPSubscription {
  id: string;
  service_name: string;
  active: boolean;
  frecuencia: string;
  proximo_pago: string;
  ultimo_pago_monto: number;
}

export interface CxPInput {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  subscriptions: CxPSubscription[];
  /** Días hacia adelante (30, 60, 90). */
  horizonte: number;
  /** Divisa del perfil: fallback de filas sin divisa y parte de la clave de agrupación de recurrentes. */
  baseCurrency: CurrencyCode;
  now?: Date;
}

const DIA_MS = 1000 * 60 * 60 * 24;

/**
 * Cuentas por pagar estimadas en el horizonte: suscripciones, pagos anuales,
 * recurrentes, tarjetas y préstamos. Devuelve las filas con su divisa (no
 * convierte) ordenadas por fecha estimada. Un único `now` para las cinco fuentes.
 */
export const computeCxP = ({
  transactions, categories, accounts, subscriptions, horizonte, baseCurrency, now = new Date(),
}: CxPInput): CxPRow[] => {
  const limite = new Date(now);
  limite.setDate(now.getDate() + horizonte);

  // 1) Suscripciones activas próximas al horizonte
  const cxpSuscripciones: CxPRow[] = subscriptions
    .filter((s) => s.active)
    .filter((s) => {
      const px = new Date(s.proximo_pago);
      return px >= now && px <= limite;
    })
    .map((s) => ({
      id: `sub-${s.id}`,
      concepto: s.service_name,
      tipo: 'Suscripción' as const,
      monto: Number(s.ultimo_pago_monto) || 0,
      divisa: baseCurrency, // subscription_services no guarda divisa → divisa del perfil
      fechaEstimada: new Date(s.proximo_pago),
      detalle: s.frecuencia,
    }));

  // 2) Pagos anuales próximos (categorías anuales, next payment = last + 1 año)
  const cxpAnuales: CxPRow[] = [];
  const anualCats = categories.filter((c) => {
    const s = `${c.categoria} ${c.subcategoria}`.toLowerCase();
    const esPrestamo = s.includes('préstamo') || s.includes('prestamo') || s.includes('hipoteca');
    return c.frecuencia_seguimiento === 'anual' && c.tipo === 'Gastos' && !esPrestamo;
  });
  anualCats.forEach((cat) => {
    const txs = transactions
      .filter((t) => t.subcategoriaId === cat.id && t.gasto > 0)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    if (!txs.length) return;
    const last = txs[0];
    const nextDate = new Date(last.fecha);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    // Si ya pasó, rodar hacia adelante en incrementos anuales
    while (nextDate < now) nextDate.setFullYear(nextDate.getFullYear() + 1);
    if (nextDate <= limite) {
      cxpAnuales.push({
        id: `anual-${cat.id}`,
        concepto: `${cat.categoria} · ${cat.subcategoria}`,
        tipo: 'Pago anual',
        monto: Number(last.gasto),
        divisa: (last.divisa as CurrencyCode) || baseCurrency,
        fechaEstimada: nextDate,
        detalle: 'Estimado según último pago',
      });
    }
  });

  // 3) Recurrentes — obligaciones fijas ineludibles agrupadas POR SUBCATEGORÍA.
  //    Detecta periodicidad real (mensual, bimensual, trimestral) según el espaciado
  //    entre pagos y usa el promedio de los ÚLTIMOS 2 PAGOS como monto de referencia.
  const cxpRecurrentes: CxPRow[] = [];
  const desde = new Date(now);
  desde.setDate(desde.getDate() - 240); // ventana amplia para captar bimensuales/trimestrales

  const catsById = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // Whitelist: SOLO obligaciones fijas ineludibles.
  const esObligacionFija = (cat: Category) => {
    const c = (cat.categoria || '').toLowerCase();
    const s = (cat.subcategoria || '').toLowerCase();
    if (c === 'hogar' && !s.includes('alquiler') && !s.includes('hipoteca') && !s.includes('servicios hogar') && s !== 'servicios') return true;
    if (c === 'educación' || c === 'educacion') return true;
    if (c === 'servicios' && (s.includes('celular') || s.includes('telefon') || s.includes('internet'))) return true;
    if (c === 'salud' && s.includes('seguro')) return true;
    if (c === 'transporte' && s.includes('seguro')) return true;
    return false;
  };

  // Agrupar por subcategoría + divisa (mismo servicio en distintos países = recurrentes distintos)
  const bySubcat = new Map<string, { txs: Transaction[]; cat: Category; divisa: string }>();
  transactions.forEach((t) => {
    if (!t.subcategoriaId || !(t.gasto > 0)) return;
    const fecha = new Date(t.fecha);
    if (fecha < desde) return;
    const cat = catsById.get(t.subcategoriaId);
    if (!cat || cat.tipo !== 'Gastos') return;
    if (!esObligacionFija(cat)) return;
    if (cat.frecuencia_seguimiento === 'anual') return;
    const label = `${cat.categoria} ${cat.subcategoria}`.toLowerCase();
    if (label.includes('suscripc')) return;
    if (label.includes('prestamo') || label.includes('préstamo') || label.includes('hipoteca')) return;

    const divisa = (t.divisa as string) || baseCurrency;
    const key = `${t.subcategoriaId}::${divisa}`;
    const g = bySubcat.get(key) || { txs: [], cat, divisa };
    g.txs.push(t);
    bySubcat.set(key, g);
  });

  bySubcat.forEach(({ txs, cat, divisa }) => {
    const sorted = txs.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    if (sorted.length < 2) return;

    // Detectar periodicidad: mediana de gaps (días) entre pagos consecutivos
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const d1 = new Date(sorted[i].fecha).getTime();
      const d2 = new Date(sorted[i + 1].fecha).getTime();
      gaps.push((d1 - d2) / DIA_MS);
    }
    gaps.sort((a, b) => a - b);
    const gapMed = gaps[Math.floor(gaps.length / 2)];

    // Clasificar en 1, 2 o 3 meses
    let periodoMeses = 1;
    let etiqueta = 'mensual';
    if (gapMed >= 75) {
      periodoMeses = 3;
      etiqueta = 'trimestral';
    } else if (gapMed >= 45) {
      periodoMeses = 2;
      etiqueta = 'bimensual';
    }

    const last = sorted[0];
    const lastDate = new Date(last.fecha);
    const diasDesdeUltimo = (now.getTime() - lastDate.getTime()) / DIA_MS;
    // Tolerancia: 1.5x el periodo esperado (mínimo 45 días para dar margen a mensuales)
    const tolerancia = Math.max(45, periodoMeses * 30 * 1.5);
    if (diasDesdeUltimo > tolerancia) return;

    // Monto = promedio de los últimos 2 pagos
    const ultimos = sorted.slice(0, 2);
    const monto = ultimos.reduce((s, t) => s + Number(t.gasto), 0) / ultimos.length;

    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + periodoMeses);
    while (nextDate < now) nextDate.setMonth(nextDate.getMonth() + periodoMeses);
    if (nextDate > limite) return;

    cxpRecurrentes.push({
      id: `rec-${cat.id}-${divisa}`,
      concepto: `${cat.categoria} · ${cat.subcategoria}`,
      tipo: 'Recurrente mensual',
      monto,
      divisa: divisa as CurrencyCode,
      fechaEstimada: nextDate,
      detalle: `${etiqueta} · prom. últimos 2`,
    });
  });

  // 4) Tarjetas de crédito con saldo negativo
  const cxpTarjetas: CxPRow[] = accounts
    .filter((a) => a.tipo === 'Tarjeta de Crédito' && !a.vendida && a.saldoActual < 0)
    .map((a) => {
      // Fecha estimada: 15 días adelante como aproximación
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + 15);
      return {
        id: `card-${a.id}`,
        concepto: a.nombre,
        tipo: 'Tarjeta de crédito' as const,
        monto: Math.abs(a.saldoActual),
        divisa: (a.divisa as CurrencyCode) || baseCurrency,
        fechaEstimada: nextDate,
        detalle: 'Saldo pendiente actual',
      };
    });

  // 5) Préstamos (subcategoría contiene "Préstamo" o "Hipoteca")
  const cxpPrestamos: CxPRow[] = [];
  const prestamoCats = categories.filter((c) => {
    const s = `${c.categoria} ${c.subcategoria}`.toLowerCase();
    return c.tipo === 'Gastos' && (s.includes('préstamo') || s.includes('prestamo') || s.includes('hipoteca'));
  });
  prestamoCats.forEach((cat) => {
    const txs = transactions
      .filter((t) => t.subcategoriaId === cat.id && t.gasto > 0)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    if (!txs.length) return;
    const last = txs[0];
    const lastDate = new Date(last.fecha);
    const diasDesdeUltimo = (now.getTime() - lastDate.getTime()) / DIA_MS;
    // Préstamo saldado / inactivo: si el último pago es de hace >45 días, no hay compromiso vigente
    if (diasDesdeUltimo > 45) return;
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    while (nextDate < now) nextDate.setMonth(nextDate.getMonth() + 1);
    if (nextDate > limite) return;

    cxpPrestamos.push({
      id: `loan-${cat.id}`,
      concepto: `${cat.categoria} · ${cat.subcategoria}`,
      tipo: 'Préstamo',
      monto: Number(last.gasto),
      divisa: (last.divisa as CurrencyCode) || baseCurrency,
      fechaEstimada: nextDate,
      detalle: 'Cuota estimada',
    });
  });

  return [...cxpSuscripciones, ...cxpAnuales, ...cxpRecurrentes, ...cxpTarjetas, ...cxpPrestamos].sort(
    (a, b) => a.fechaEstimada.getTime() - b.fechaEstimada.getTime()
  );
};
```

- [ ] `npx vitest run src/lib/finance/cxp.test.ts` → 11 tests en verde.
- [ ] En `src/hooks/useFinanceDataSupabase.ts`, sustituir `financeQueryKeys` por:

```ts
export const financeQueryKeys = (userId: string | undefined) => ({
  cuentas: ['finance', userId, 'cuentas'] as const,
  categorias: ['finance', userId, 'categorias'] as const,
  transacciones: ['finance', userId, 'transacciones'] as const,
  subscriptions: ['finance', userId, 'subscriptions'] as const,
});
```

- [ ] Crear `src/hooks/useSubscriptionServices.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { financeQueryKeys } from './useFinanceDataSupabase';

export type SubscriptionService = Database['public']['Tables']['subscription_services']['Row'];

const EMPTY: SubscriptionService[] = [];

const fetchSubscriptionServices = async (): Promise<SubscriptionService[]> => {
  const { data, error } = await supabase.from('subscription_services').select('*').eq('active', true);
  if (error) throw error;
  return data ?? [];
};

/**
 * Suscripciones activas (tabla completa). staleTime 0 porque SubscriptionsManager
 * escribe en la tabla sin invalidar nada: cada montaje vuelve a pedirlas.
 */
export const useSubscriptionServices = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: financeQueryKeys(user?.id).subscriptions,
    queryFn: fetchSubscriptionServices,
    staleTime: 0,
    enabled: !!user,
  });
  return {
    subscriptions: query.data ?? EMPTY,
    loading: query.isPending,
    error: query.error,
  };
};
```

- [ ] En `src/pages/CxP.tsx`:
  1. Sustituir las líneas 1-6 de imports por:

```tsx
import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { computeCxP, CxPRow } from '@/lib/finance/cxp';
import { CurrencyCode } from '@/lib/finance/dashboardMetrics';
```

  (los imports de `Card`, `Table`, `Badge`, `Tabs`, `Select` e iconos lucide se conservan.)

  2. Borrar la declaración local `type CxPRow = { ... };` (líneas 14-22).
  3. Sustituir desde `const CxP = () => {` (línea 29) hasta el cierre del `useMemo` de `allRows` inclusive (`[cxpSuscripciones, ...cxpPrestamos]` + `);`, línea 280) por el bloque de abajo. Todos los números de línea de esta tarea son de la numeración ORIGINAL del archivo: localizar por contenido, no por número, porque el paso 1 cambia el recuento.

```tsx
const CxP = () => {
  const financeData = useFinanceDataSupabase();
  const { formatCurrency, config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const { subscriptions } = useSubscriptionServices();

  const [horizonte, setHorizonte] = useState<number>(30);

  const baseCurrency = (config.currency as CurrencyCode) || 'MXN';

  const allRows = useMemo<CxPRow[]>(
    () =>
      computeCxP({
        transactions: financeData.transactions,
        categories: financeData.categories,
        accounts: financeData.accounts,
        subscriptions,
        horizonte,
        baseCurrency,
      }),
    [financeData.transactions, financeData.categories, financeData.accounts, subscriptions, horizonte, baseCurrency]
  );
```

  4. Dejar intactos `totalEnBase`, `liquidezBreakdown`, `liquidez`, `colchon`, `totalPorTipo` y el bloque `if (financeData.loading)`.
  5. Sustituir el array `bloques` por:

```tsx
  const bloques: { key: string; label: string; icon: any; rows: CxPRow[]; tipo: CxPRow['tipo'] }[] = [
    { key: 'susc', label: 'Suscripciones', icon: CreditCard, rows: allRows.filter((r) => r.tipo === 'Suscripción'), tipo: 'Suscripción' },
    { key: 'anual', label: 'Pagos Anuales', icon: CalendarClock, rows: allRows.filter((r) => r.tipo === 'Pago anual'), tipo: 'Pago anual' },
    { key: 'recur', label: 'Recurrentes', icon: Repeat, rows: allRows.filter((r) => r.tipo === 'Recurrente mensual'), tipo: 'Recurrente mensual' },
    { key: 'card', label: 'Tarjetas', icon: CreditCard, rows: allRows.filter((r) => r.tipo === 'Tarjeta de crédito'), tipo: 'Tarjeta de crédito' },
    { key: 'loan', label: 'Préstamos', icon: Landmark, rows: allRows.filter((r) => r.tipo === 'Préstamo'), tipo: 'Préstamo' },
  ];
```

  6. El JSX de retorno queda igual.

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `grep -n "supabase\|useEffect" src/pages/CxP.tsx` no devuelve nada.
- [ ] `npx vitest run` → todo en verde.
- [ ] Verificación manual (escritorio, `#/cxp`): anotar antes del cambio (`git stash`) "Total CxP 30d", número de conceptos, los cinco totales por tipo y las filas de "Todo"; tras el cambio deben coincidir en 30, 60 y 90 días. Única diferencia aceptada: dentro de cada pestaña por tipo las filas van ordenadas por fecha.
- [ ] Commit: `git add src/lib/finance/cxp.ts src/lib/finance/cxp.test.ts src/hooks/useSubscriptionServices.ts src/hooks/useFinanceDataSupabase.ts src/pages/CxP.tsx && git commit -m "Extraer computeCxP a función pura y hook useSubscriptionServices"`.

---

### Task 4: `subscriptionsSummary` (estimado mensual prorrateado) + utilidades de fechas

**Files**
- Create: `src/lib/finance/fechas.ts`
- Test: `src/lib/finance/fechas.test.ts`
- Create: `src/lib/finance/subscriptionsSummary.ts`
- Test: `src/lib/finance/subscriptionsSummary.test.ts`

**Interfaces**
- Produces:
  ```ts
  // fechas.ts
  export const parseFechaLocal = (iso: string): Date            // 'YYYY-MM-DD' → medianoche local
  export const diasHasta = (iso: string, now?: Date): number    // días enteros desde hoy(00:00) hasta iso
  export const formatFechaCorta = (d: Date): string             // '20 sept 2026'
  // subscriptionsSummary.ts
  export type SubscriptionFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Irregular';
  export interface SubscriptionForSummary { frecuencia: string; ultimo_pago_monto: number }
  export interface SubscriptionsSummary { estimadoMensual: number; estimadas: number; sinEstimar: number }
  export const estimadoMensualDe = (frecuencia: string, monto: number): number | null
  export const computeSubscriptionsSummary = (subs: SubscriptionForSummary[]): SubscriptionsSummary
  ```

- [ ] Escribir `src/lib/finance/fechas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { diasHasta, parseFechaLocal } from './fechas';

const NOW = new Date(2026, 8, 15, 14, 30); // 15 sep 2026, con hora para comprobar el truncado

describe('parseFechaLocal', () => {
  it('convierte YYYY-MM-DD a medianoche local', () => {
    expect(parseFechaLocal('2026-09-20')).toEqual(new Date(2026, 8, 20));
  });
  it('acepta timestamps ISO completos', () => {
    expect(parseFechaLocal('2026-09-20T10:00:00.000Z').getTime()).toBe(new Date('2026-09-20T10:00:00.000Z').getTime());
  });
});

describe('diasHasta', () => {
  it('cuenta días enteros desde hoy', () => {
    expect(diasHasta('2026-09-20', NOW)).toBe(5);
    expect(diasHasta('2026-09-15', NOW)).toBe(0);
    expect(diasHasta('2026-09-10', NOW)).toBe(-5);
  });
});
```

- [ ] `npx vitest run src/lib/finance/fechas.test.ts` → falla.
- [ ] Crear `src/lib/finance/fechas.ts`:

```ts
const DIA_MS = 86_400_000;

/** 'YYYY-MM-DD' → Date a medianoche local (new Date('YYYY-MM-DD') parsea en UTC y desplaza un día en México). */
export const parseFechaLocal = (iso: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return new Date(iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

/** Días enteros desde hoy (00:00 local) hasta la fecha; negativo si ya pasó. */
export const diasHasta = (iso: string, now: Date = new Date()): number => {
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseFechaLocal(iso).getTime() - hoy.getTime()) / DIA_MS);
};

/** '20 sept 2026'. */
export const formatFechaCorta = (d: Date): string =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
```

- [ ] `npx vitest run src/lib/finance/fechas.test.ts` → verde.
- [ ] Escribir `src/lib/finance/subscriptionsSummary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeSubscriptionsSummary, estimadoMensualDe } from './subscriptionsSummary';

describe('estimadoMensualDe', () => {
  it('prorratea cada frecuencia a un mes', () => {
    expect(estimadoMensualDe('Semanal', 120)).toBeCloseTo(520, 5);   // 120 × 52 / 12
    expect(estimadoMensualDe('Mensual', 200)).toBe(200);
    expect(estimadoMensualDe('Bimestral', 300)).toBe(150);
    expect(estimadoMensualDe('Trimestral', 300)).toBe(100);
    expect(estimadoMensualDe('Semestral', 600)).toBe(100);
    expect(estimadoMensualDe('Anual', 1200)).toBe(100);
  });
  it('Irregular y frecuencias desconocidas no se estiman', () => {
    expect(estimadoMensualDe('Irregular', 50)).toBeNull();
    expect(estimadoMensualDe('Quincenal', 50)).toBeNull();
  });
});

describe('computeSubscriptionsSummary', () => {
  it('suma el prorrateo y cuenta aparte las que no se pueden estimar', () => {
    const r = computeSubscriptionsSummary([
      { frecuencia: 'Semanal', ultimo_pago_monto: 100 },     // 433.33
      { frecuencia: 'Mensual', ultimo_pago_monto: 200 },     // 200
      { frecuencia: 'Bimestral', ultimo_pago_monto: 300 },   // 150
      { frecuencia: 'Trimestral', ultimo_pago_monto: 300 },  // 100
      { frecuencia: 'Semestral', ultimo_pago_monto: 600 },   // 100
      { frecuencia: 'Anual', ultimo_pago_monto: 1200 },      // 100
      { frecuencia: 'Irregular', ultimo_pago_monto: 999 },   // fuera
    ]);
    expect(r.estimadoMensual).toBeCloseTo(1083.33, 2);
    expect(r.estimadas).toBe(6);
    expect(r.sinEstimar).toBe(1);
  });
  it('con lista vacía devuelve ceros', () => {
    expect(computeSubscriptionsSummary([])).toEqual({ estimadoMensual: 0, estimadas: 0, sinEstimar: 0 });
  });
});
```

- [ ] `npx vitest run src/lib/finance/subscriptionsSummary.test.ts` → falla.
- [ ] Crear `src/lib/finance/subscriptionsSummary.ts`:

```ts
/** Valores admitidos por el CHECK de subscription_services.frecuencia (migración 20260809033858). */
export type SubscriptionFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Irregular';

/** Factor para pasar un pago con esa frecuencia a su equivalente mensual. */
const FACTOR_MENSUAL: Record<Exclude<SubscriptionFrequency, 'Irregular'>, number> = {
  Semanal: 52 / 12,
  Mensual: 1,
  Bimestral: 1 / 2,
  Trimestral: 1 / 3,
  Semestral: 1 / 6,
  Anual: 1 / 12,
};

export interface SubscriptionForSummary {
  frecuencia: string;
  ultimo_pago_monto: number;
}

export interface SubscriptionsSummary {
  /** Suma prorrateada a un mes de las suscripciones con frecuencia conocida (sin convertir divisa). */
  estimadoMensual: number;
  /** Cuántas entran en el estimado. */
  estimadas: number;
  /** Irregulares o de frecuencia desconocida: no se estiman, se cuentan aparte. */
  sinEstimar: number;
}

/** Equivalente mensual de un pago según su frecuencia; null si no se puede estimar. */
export const estimadoMensualDe = (frecuencia: string, monto: number): number | null => {
  const factor = (FACTOR_MENSUAL as Record<string, number | undefined>)[frecuencia];
  if (factor === undefined) return null;
  return (Number(monto) || 0) * factor;
};

/** Estimado mensual prorrateado. El llamador pasa solo suscripciones activas. */
export const computeSubscriptionsSummary = (subs: SubscriptionForSummary[]): SubscriptionsSummary => {
  let estimadoMensual = 0;
  let estimadas = 0;
  let sinEstimar = 0;
  subs.forEach((s) => {
    const m = estimadoMensualDe(s.frecuencia, s.ultimo_pago_monto);
    if (m === null) {
      sinEstimar += 1;
    } else {
      estimadoMensual += m;
      estimadas += 1;
    }
  });
  return { estimadoMensual, estimadas, sinEstimar };
};
```

- [ ] `npx vitest run src/lib/finance/subscriptionsSummary.test.ts src/lib/finance/fechas.test.ts` → verde.
- [ ] Commit: `git add src/lib/finance/fechas.ts src/lib/finance/fechas.test.ts src/lib/finance/subscriptionsSummary.ts src/lib/finance/subscriptionsSummary.test.ts && git commit -m "Estimado mensual prorrateado de suscripciones y utilidades de fechas"`.

---

### Task 5: `pendingsSummary` (activos, vencidos primero, total convertido)

**Files**
- Create: `src/lib/finance/pendingsSummary.ts`
- Test: `src/lib/finance/pendingsSummary.test.ts`

**Interfaces**
- Consumes: `ConvertCurrency`, `CurrencyCode` de `./dashboardMetrics`.
- Produces:
  ```ts
  export interface PendingForSummary { id: string; monto_esperado: number; monto_cobrado: number; divisa: string; fecha_esperada: string | null; estado: string }
  export interface PendingRow<T extends PendingForSummary> { pending: T; restante: number; vencido: boolean }
  export interface PendingsSummary<T extends PendingForSummary> { rows: PendingRow<T>[]; total: number; vencidos: number }
  export const isPendingActive = (p: { estado: string }): boolean
  export const isPendingOverdue = (p: { fecha_esperada: string | null }, now: Date): boolean
  export const computePendingsSummary = <T extends PendingForSummary>(pendings: T[], convertCurrency: ConvertCurrency, currency: CurrencyCode, now?: Date): PendingsSummary<T>
  ```

- [ ] Escribir `src/lib/finance/pendingsSummary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ConvertCurrency } from './dashboardMetrics';
import { computePendingsSummary, isPendingOverdue, PendingForSummary } from './pendingsSummary';

// Tasas fijas para el test: 1 USD = 20 MXN, 1 EUR = 22 MXN
const RATES = { MXN: 1, USD: 20, EUR: 22 };
const convert: ConvertCurrency = (amount, from, to) => {
  if (from === to) return amount;
  return (amount * RATES[from]) / RATES[to];
};

const NOW = new Date(2026, 8, 15);

const pending = (over: Partial<PendingForSummary>): PendingForSummary => ({
  id: 'p', monto_esperado: 100, monto_cobrado: 0, divisa: 'MXN', fecha_esperada: '2026-09-20', estado: 'pendiente', ...over,
});

describe('isPendingOverdue', () => {
  it('vencido si fecha_esperada < hoy a las 00:00 (misma regla que usePendings)', () => {
    expect(isPendingOverdue(pending({ fecha_esperada: '2026-09-10' }), NOW)).toBe(true);
    expect(isPendingOverdue(pending({ fecha_esperada: '2026-09-20' }), NOW)).toBe(false);
    expect(isPendingOverdue(pending({ fecha_esperada: null }), NOW)).toBe(false);
  });
});

describe('computePendingsSummary', () => {
  it('solo cuenta pendientes y cobrados parciales, con el restante por cobrar', () => {
    const r = computePendingsSummary([
      pending({ id: 'a', monto_esperado: 100 }),
      pending({ id: 'b', monto_esperado: 300, monto_cobrado: 120, estado: 'cobrado_parcial' }),
      pending({ id: 'c', estado: 'cobrado' }),
      pending({ id: 'd', estado: 'cancelado' }),
    ], convert, 'MXN', NOW);
    expect(r.rows.map((x) => x.pending.id)).toEqual(['a', 'b']);
    expect(r.rows[1].restante).toBe(180);
    expect(r.total).toBe(280);
  });

  it('convierte fila a fila a la divisa elegida', () => {
    const list = [
      pending({ id: 'usd', monto_esperado: 100, divisa: 'USD' }),
      pending({ id: 'mxn', monto_esperado: 500, divisa: 'MXN' }),
    ];
    expect(computePendingsSummary(list, convert, 'MXN', NOW).total).toBe(2500);
    expect(computePendingsSummary(list, convert, 'USD', NOW).total).toBe(125);
  });

  it('ordena vencidos primero, luego por fecha, y sin fecha al final', () => {
    const r = computePendingsSummary([
      pending({ id: 'sin-fecha', fecha_esperada: null }),
      pending({ id: 'futuro-lejos', fecha_esperada: '2026-10-01' }),
      pending({ id: 'vencido', fecha_esperada: '2026-09-01' }),
      pending({ id: 'futuro-cerca', fecha_esperada: '2026-09-20' }),
      pending({ id: 'muy-vencido', fecha_esperada: '2026-08-01' }),
    ], convert, 'MXN', NOW);
    expect(r.rows.map((x) => x.pending.id)).toEqual(['muy-vencido', 'vencido', 'futuro-cerca', 'futuro-lejos', 'sin-fecha']);
    expect(r.vencidos).toBe(2);
    expect(r.rows[0].vencido).toBe(true);
    expect(r.rows[2].vencido).toBe(false);
  });
});
```

- [ ] `npx vitest run src/lib/finance/pendingsSummary.test.ts` → falla.
- [ ] Crear `src/lib/finance/pendingsSummary.ts`:

```ts
import { ConvertCurrency, CurrencyCode } from './dashboardMetrics';

export interface PendingForSummary {
  id: string;
  monto_esperado: number;
  monto_cobrado: number;
  divisa: string;
  fecha_esperada: string | null;
  estado: string;
}

export interface PendingRow<T extends PendingForSummary> {
  pending: T;
  /** monto_esperado − monto_cobrado, en la divisa del pendiente. */
  restante: number;
  vencido: boolean;
}

export interface PendingsSummary<T extends PendingForSummary> {
  /** Activos, vencidos primero y luego por fecha esperada (sin fecha al final). */
  rows: PendingRow<T>[];
  /** Suma de restantes convertidos a `currency`. */
  total: number;
  vencidos: number;
}

export const isPendingActive = (p: { estado: string }): boolean =>
  p.estado === 'pendiente' || p.estado === 'cobrado_parcial';

/** Misma regla que usePendings.overdueCount: fecha_esperada < hoy a las 00:00 local. */
export const isPendingOverdue = (p: { fecha_esperada: string | null }, now: Date): boolean => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return !!p.fecha_esperada && new Date(p.fecha_esperada) < today;
};

export const computePendingsSummary = <T extends PendingForSummary>(
  pendings: T[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
  now: Date = new Date(),
): PendingsSummary<T> => {
  const rows: PendingRow<T>[] = pendings
    .filter(isPendingActive)
    .map((p) => ({
      pending: p,
      restante: p.monto_esperado - (p.monto_cobrado ?? 0),
      vencido: isPendingOverdue(p, now),
    }))
    .sort((a, b) => {
      if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
      const fa = a.pending.fecha_esperada;
      const fb = b.pending.fecha_esperada;
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fa.localeCompare(fb);
    });

  const total = rows.reduce(
    (sum, r) => sum + convertCurrency(r.restante, r.pending.divisa as CurrencyCode, currency),
    0,
  );

  return { rows, total, vencidos: rows.filter((r) => r.vencido).length };
};
```

- [ ] `npx vitest run src/lib/finance/pendingsSummary.test.ts` → verde.
- [ ] Commit: `git add src/lib/finance/pendingsSummary.ts src/lib/finance/pendingsSummary.test.ts && git commit -m "Resumen de pendientes por cobrar como función pura"`.

---

### Task 6: Infraestructura móvil: contexto de divisa, `ui.tsx`, `MobileLayout`, `Responsive`, `SoloEscritorio`, cableado en `App.tsx`, `Layout.tsx` sin rama móvil

**Files**
- Create: `src/contexts/MobileCurrencyContext.tsx`
- Create: `src/components/movil/ui.tsx`
- Create: `src/components/movil/MobileLayout.tsx`
- Create: `src/components/Responsive.tsx`
- Create: `src/pages/movil/SoloEscritorio.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`
- Test: ninguno (UI); verificación manual

**Interfaces**
- Consumes: `useIsMobile`, `useAppConfig` (`config.currency`), `useAuth().signOut`, `usePendings().overdueCount`, `formatNumber` de `@/lib/formatters`.
- Produces:
  ```ts
  // MobileCurrencyContext.tsx
  export const MOBILE_CURRENCY_KEY = 'savium.movil.divisa';
  export const MOBILE_CURRENCIES: CurrencyCode[];
  export const MobileCurrencyProvider: React.FC<{ children: React.ReactNode }>;
  export const useMobileCurrency = (): { currency: CurrencyCode; ready: boolean; setCurrency: (c: CurrencyCode) => void }
  // ui.tsx
  export const Importe: ({ amount, currency, principal?, className? }) => JSX.Element
  export const Seccion: ({ titulo, children, className? }) => JSX.Element
  export const Cargando: ({ texto? }) => JSX.Element
  // Responsive.tsx
  export default Responsive: ({ desktop: ComponentType; mobile: ComponentType }) => JSX.Element
  // MobileLayout.tsx
  export default MobileLayout: ({ children }) => JSX.Element
  ```

- [ ] Crear `src/contexts/MobileCurrencyContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAppConfig } from '@/hooks/useAppConfig';
import type { CurrencyCode } from '@/lib/finance/dashboardMetrics';

export const MOBILE_CURRENCY_KEY = 'savium.movil.divisa';
export const MOBILE_CURRENCIES: CurrencyCode[] = ['MXN', 'USD', 'EUR'];

interface MobileCurrencyContextValue {
  /** Divisa a usar. Mientras `ready` es false vale 'MXN' provisional: no calcular nada con ella. */
  currency: CurrencyCode;
  /** true cuando hay elección guardada o ya llegó la divisa del perfil. */
  ready: boolean;
  setCurrency: (c: CurrencyCode) => void;
}

const MobileCurrencyContext = createContext<MobileCurrencyContextValue | undefined>(undefined);

const readStored = (): CurrencyCode | null => {
  try {
    const v = localStorage.getItem(MOBILE_CURRENCY_KEY);
    return v === 'MXN' || v === 'USD' || v === 'EUR' ? v : null;
  } catch {
    return null;
  }
};

/**
 * Divisa elegida para la versión móvil. Prioridad: localStorage si el usuario
 * eligió alguna vez; si no, la del perfil (config.currency) una vez configLoaded.
 * Solo se escribe en localStorage al tocar un chip, nunca al inicializar.
 * useAppConfig arranca en 'MXN' provisional hasta que carga el perfil; por eso
 * `ready` es false hasta entonces y MobileLayout muestra un loader.
 */
export const MobileCurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const { config, configLoaded } = useAppConfig();
  const [chosen, setChosen] = useState<CurrencyCode | null>(readStored);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setChosen(c);
    try {
      localStorage.setItem(MOBILE_CURRENCY_KEY, c);
    } catch {
      // sin almacenamiento disponible: la elección dura la sesión
    }
  }, []);

  const value = useMemo<MobileCurrencyContextValue>(() => {
    if (chosen) return { currency: chosen, ready: true, setCurrency };
    if (configLoaded) return { currency: config.currency, ready: true, setCurrency };
    return { currency: 'MXN', ready: false, setCurrency };
  }, [chosen, configLoaded, config.currency, setCurrency]);

  return <MobileCurrencyContext.Provider value={value}>{children}</MobileCurrencyContext.Provider>;
};

export const useMobileCurrency = () => {
  const ctx = useContext(MobileCurrencyContext);
  if (!ctx) throw new Error('useMobileCurrency debe usarse dentro de MobileCurrencyProvider');
  return ctx;
};
```

- [ ] Crear `src/components/movil/ui.tsx` (piezas compartidas por las cinco pantallas):

```tsx
import { ReactNode } from 'react';
import { formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

/** Importe con el código de divisa junto al número. `principal` = 32px. */
export const Importe = ({
  amount, currency, principal = false, className,
}: { amount: number; currency: string; principal?: boolean; className?: string }) => (
  <span className={cn('tabular-nums whitespace-nowrap', principal ? 'text-[32px] font-bold leading-none' : 'text-base font-semibold', className)}>
    {formatNumber(amount)}{' '}
    <span className={cn('font-normal text-muted-foreground', principal ? 'text-base' : 'text-sm')}>{currency}</span>
  </span>
);

export const Seccion = ({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) => (
  <section className={cn('space-y-2', className)}>
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">{titulo}</h2>
    {children}
  </section>
);

export const Cargando = ({ texto = 'Cargando...' }: { texto?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    <p className="text-base">{texto}</p>
  </div>
);
```

- [ ] Crear `src/pages/movil/SoloEscritorio.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SoloEscritorio = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-20 px-4">
      <Monitor className="h-12 w-12 text-muted-foreground" />
      <p className="text-xl font-semibold">Solo disponible en escritorio</p>
      <p className="text-base text-muted-foreground">
        Esta pantalla no tiene versión móvil. Ábrela desde un ordenador.
      </p>
      <Button size="lg" className="h-12 text-base" onClick={() => navigate('/dashboard')}>
        Ir a Resumen
      </Button>
    </div>
  );
};

export default SoloEscritorio;
```

- [ ] Crear `src/components/movil/MobileLayout.tsx`:

```tsx
import { ReactNode, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, CreditCard, Clock, Receipt, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendings } from '@/hooks/usePendings';
import { MobileCurrencyProvider, MOBILE_CURRENCIES, useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { Cargando } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const TABS = [
  { path: '/dashboard', icon: BarChart3, label: 'Resumen', matches: ['/', '/dashboard'] },
  { path: '/inversiones', icon: TrendingUp, label: 'Inversiones', matches: ['/inversiones'] },
  { path: '/suscripciones', icon: CreditCard, label: 'Suscripciones', matches: ['/suscripciones'] },
  { path: '/pendientes', icon: Clock, label: 'Por cobrar', matches: ['/pendientes'] },
  { path: '/cxp', icon: Receipt, label: 'Por pagar', matches: ['/cxp'] },
];

const CurrencyChips = () => {
  const { currency, setCurrency } = useMobileCurrency();
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Divisa">
      {MOBILE_CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          aria-pressed={currency === c}
          className={cn(
            'h-10 min-w-[48px] px-2 rounded-full text-sm font-semibold transition-colors',
            currency === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
};

const Shell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { overdueCount } = usePendings();
  const { ready } = useMobileCurrency();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* CABECERA */}
      {/* min-h (no h fija): en PWA de iPhone el safe-area-inset-top vale 44-59px y una altura fija dejaría los chips fuera de la cabecera */}
      <header className="sticky top-0 z-40 min-h-14 bg-background border-b flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={() => navigate('/dashboard')} aria-label="Ir a Resumen">
          <img src="/images/logo.png" alt="Savium" className="h-8 w-auto" />
        </button>
        <div className="flex items-center gap-2">
          <CurrencyChips />
          <button
            type="button"
            onClick={signOut}
            aria-label="Cerrar sesión"
            className="h-11 w-11 flex items-center justify-center rounded-full text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* CONTENIDO: no se monta ninguna pantalla hasta saber la divisa (evita calcular con el MXN provisional) */}
      <main className="px-4 py-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))]">
        {ready ? <Suspense fallback={<Cargando />}>{children}</Suspense> : <Cargando />}
      </main>

      {/* NAV INFERIOR: 64px + zona segura */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t h-[calc(4rem_+_env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {TABS.map(({ path, icon: Icon, label, matches }) => {
            const active = matches.includes(location.pathname);
            const badge = path === '/pendientes' && overdueCount > 0 ? overdueCount : null;
            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 h-full',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-6 w-6" />
                {/* Etiquetas a 12px: cinco etiquetas de 14px no caben en 390px; es la única excepción a ≥14px */}
                <span className={cn('text-[12px] leading-none', active && 'font-semibold')}>{label}</span>
                {badge !== null && (
                  <span className="absolute top-2 right-[calc(50%-22px)] min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[12px] font-semibold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

/**
 * Cabecera + contenido + nav inferior de la versión móvil. Se monta desde
 * Responsive (no desde cada página) para que sobreviva al cambio de pestaña:
 * el Suspense interno muestra el loader del contenido sin perder la nav.
 */
const MobileLayout = ({ children }: { children: ReactNode }) => (
  <MobileCurrencyProvider>
    <Shell>{children}</Shell>
  </MobileCurrencyProvider>
);

export default MobileLayout;
```

- [ ] Crear `src/components/Responsive.tsx`:

```tsx
import { ComponentType } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from '@/components/movil/MobileLayout';

interface ResponsiveProps {
  /** Página de escritorio (lazy). Monta su propio Layout. */
  desktop: ComponentType;
  /** Página móvil (lazy). Se renderiza dentro de MobileLayout. */
  mobile: ComponentType;
}

/**
 * Elige la versión según el ancho. Va dentro de ProtectedRoute, así que las
 * páginas móviles nunca se montan sin usuario.
 */
const Responsive = ({ desktop: Desktop, mobile: Mobile }: ResponsiveProps) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileLayout>
        <Mobile />
      </MobileLayout>
    );
  }
  return <Desktop />;
};

export default Responsive;
```

- [ ] Sustituir `src/App.tsx` completo por (en esta tarea TODAS las rutas móviles apuntan a `SoloEscritorio`; las tareas 7-11 van sustituyendo una a una):

```tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import ProtectedRoute from "@/components/ProtectedRoute";
import Responsive from "@/components/Responsive";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Las páginas se cargan bajo demanda para reducir el bundle inicial.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transacciones = lazy(() => import("./pages/Transacciones"));
const Inversiones = lazy(() => import("./pages/Inversiones"));
const Informes = lazy(() => import("./pages/Informes"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const TransaccionesCategoria = lazy(() => import("./pages/TransaccionesCategoria"));
const ReglasClasificacion = lazy(() => import("./pages/ReglasClasificacion"));
const Cuentas = lazy(() => import("./pages/Cuentas"));
const Categorias = lazy(() => import("./pages/Categorias"));
const SeguimientoGastos = lazy(() => import("./pages/SeguimientoGastos"));
const SeguimientoIngresos = lazy(() => import("./pages/SeguimientoIngresos"));
const Pendientes = lazy(() => import("./pages/Pendientes"));
const Suscripciones = lazy(() => import("./pages/Suscripciones"));
const IngresosRecurrentes = lazy(() => import("./pages/IngresosRecurrentes"));
const PagosAnuales = lazy(() => import("./pages/PagosAnuales"));
const CxP = lazy(() => import("./pages/CxP"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
const Alertas = lazy(() => import("./pages/Alertas"));

// Versión móvil (< 768px), solo lectura.
const SoloEscritorio = lazy(() => import("./pages/movil/SoloEscritorio"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p>Cargando...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute fallbackPath="/auth">
                  <Responsive desktop={Dashboard} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Responsive desktop={Dashboard} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/transacciones" element={
                <ProtectedRoute>
                  <Responsive desktop={Transacciones} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/inversiones" element={
                <ProtectedRoute>
                  <Responsive desktop={Inversiones} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/informes" element={
                <ProtectedRoute>
                  <Responsive desktop={Informes} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute>
                  <Responsive desktop={Configuracion} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/transacciones-categoria" element={
                <ProtectedRoute>
                  <Responsive desktop={TransaccionesCategoria} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/reglas-clasificacion" element={
                <ProtectedRoute>
                  <Responsive desktop={ReglasClasificacion} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/cuentas" element={
                <ProtectedRoute>
                  <Responsive desktop={Cuentas} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/categorias" element={
                <ProtectedRoute>
                  <Responsive desktop={Categorias} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/seguimiento-gastos" element={
                <ProtectedRoute>
                  <Responsive desktop={SeguimientoGastos} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/seguimiento-ingresos" element={
                <ProtectedRoute>
                  <Responsive desktop={SeguimientoIngresos} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/pendientes" element={
                <ProtectedRoute>
                  <Responsive desktop={Pendientes} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/suscripciones" element={
                <ProtectedRoute>
                  <Responsive desktop={Suscripciones} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/ingresos-recurrentes" element={
                <ProtectedRoute>
                  <Responsive desktop={IngresosRecurrentes} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/pagos-anuales" element={
                <ProtectedRoute>
                  <Responsive desktop={PagosAnuales} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/cxp" element={
                <ProtectedRoute>
                  <Responsive desktop={CxP} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/alertas" element={
                <ProtectedRoute>
                  <Responsive desktop={Alertas} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/changelog" element={
                <ProtectedRoute>
                  <Responsive desktop={ChangelogPage} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
```

- [ ] En `src/components/Layout.tsx`, quitar la rama móvil. Cambios exactos:
  1. Borrar `import { useIsMobile } from '@/hooks/use-mobile';`.
  2. Borrar `const isMobile = useIsMobile();`.
  3. Borrar el bloque `const mobileNavItems = [ ... ];` completo.
  4. Sustituir `  // Desktop layout with sidebar\n  if (!isMobile) {\n    return (` por `  return (`.
  5. Borrar desde el `);` + `  }` que cierran ese `return` hasta el final del bloque móvil, dejando el archivo así tras el `</main>`:

```tsx
      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64">
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
```

  (Quitar un nivel de indentación a todo el JSX del sidebar es opcional; basta con que compile.)

  Comprobación: `grep -n "isMobile\|mobileNavItems\|BOTTOM NAV\|MOBILE HEADER" src/components/Layout.tsx` no devuelve nada.

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores. `npx vitest run` → verde.
- [ ] Verificación manual:
  - Browser pane a 390×844, `#/dashboard`: cabecera con logo pequeño, tres chips MXN/USD/EUR (uno resaltado) e icono de salir; contenido "Solo disponible en escritorio" con botón "Ir a Resumen"; nav inferior de 5 pestañas con "Resumen" resaltada; si hay pendientes vencidos, badge rojo en "Por cobrar". Sin sidebar y sin parpadeo.
  - Tocar cada pestaña: la nav no desaparece al cambiar; se resalta la actual.
  - Tocar chip USD: se resalta; recargar: sigue USD. En consola `localStorage.removeItem('savium.movil.divisa')` y recargar: vuelve a la divisa del perfil.
  - `#/transacciones`, `#/alertas`, `#/configuracion`: "Solo disponible en escritorio".
  - `#/auth` (tras cerrar sesión): pantalla de acceso sin cabecera móvil ni nav.
  - Modo oscuro: fondo oscuro, chips y nav legibles.
  - `preset: "desktop"`: Dashboard, Transacciones, CxP, Inversiones idénticos a antes, con sidebar. Redimensionar en caliente a 390: cambia a móvil.
- [ ] Commit: `git add src/contexts/MobileCurrencyContext.tsx src/components/movil src/components/Responsive.tsx src/pages/movil/SoloEscritorio.tsx src/App.tsx src/components/Layout.tsx && git commit -m "Estructura móvil: Responsive, MobileLayout, divisa móvil y SoloEscritorio"`.

---

### Task 7: `ResumenMovil` (`/` y `/dashboard`)

**Files**
- Create: `src/pages/movil/ResumenMovil.tsx`
- Modify: `src/App.tsx` (rutas `/` y `/dashboard`)

**Interfaces**
- Consumes: `useFinanceDataSupabase()` → `accounts`, `transactions`, `loading`; `useExchangeRates().convertCurrency`; `useMobileCurrency().currency`; `computeDashboardMetrics(accounts, transactions, convertCurrency, currency)`; `Importe`, `Seccion`, `Cargando` de `@/components/movil/ui`.
- Produces: `export default ResumenMovil`.

- [ ] Crear `src/pages/movil/ResumenMovil.tsx`:

```tsx
import { useMemo } from 'react';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computeDashboardMetrics } from '@/lib/finance/dashboardMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { Account, AccountType } from '@/types/finance';
import { cn } from '@/lib/utils';

const ORDEN_TIPOS: AccountType[] = [
  'Efectivo', 'Banco', 'Ahorros', 'Tarjeta de Crédito', 'Inversiones', 'Empresa Propia', 'Bien Raíz', 'Hipoteca',
];

const nombreMesAnterior = (now: Date) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const s = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const Linea = ({ etiqueta, amount, currency, destacado = false, negativo = false }: {
  etiqueta: string; amount: number; currency: string; destacado?: boolean; negativo?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 min-h-12">
    <span className={cn('text-base', destacado ? 'font-semibold' : 'text-muted-foreground')}>{etiqueta}</span>
    <Importe amount={amount} currency={currency} className={cn(negativo && 'text-destructive')} />
  </div>
);

const ResumenMovil = () => {
  const { accounts, transactions, loading } = useFinanceDataSupabase();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  // Se llama directamente porque el dashboardMetrics del hook está fijo a config.currency.
  const metrics = useMemo(
    () => computeDashboardMetrics(accounts, transactions, convertCurrency, currency),
    [accounts, transactions, convertCurrency, currency],
  );

  const cuentasPorTipo = useMemo(() => {
    const visibles = accounts.filter((a) => !a.vendida && a.saldoActual !== 0);
    return ORDEN_TIPOS
      .map((tipo) => ({ tipo, cuentas: visibles.filter((a) => a.tipo === tipo) as Account[] }))
      .filter((g) => g.cuentas.length > 0);
  }, [accounts]);

  if (loading) return <Cargando texto="Cargando resumen..." />;

  const { activos, pasivos } = metrics;

  return (
    <div className="space-y-6">
      {/* 1. Patrimonio neto */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Patrimonio neto</p>
        <Importe amount={metrics.patrimonioNeto} currency={currency} principal className={cn(metrics.patrimonioNeto < 0 && 'text-destructive')} />
      </div>

      {/* 2. Activos y pasivos */}
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4">
            <Linea etiqueta="Activos" amount={activos.total} currency={currency} destacado />
            <div className="border-t pt-1">
              <Linea etiqueta="Efectivo y bancos" amount={activos.efectivoBancos} currency={currency} />
              <Linea etiqueta="Inversiones" amount={activos.inversiones} currency={currency} />
              <Linea etiqueta="Empresas" amount={activos.empresasPrivadas} currency={currency} />
              <Linea etiqueta="Bien raíz" amount={activos.bienRaiz} currency={currency} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Linea etiqueta="Pasivos" amount={pasivos.total} currency={currency} destacado negativo={pasivos.total > 0} />
            <div className="border-t pt-1">
              <Linea etiqueta="Tarjetas de crédito" amount={pasivos.tarjetasCredito} currency={currency} />
              <Linea etiqueta="Hipoteca" amount={pasivos.hipoteca} currency={currency} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Mes anterior */}
      <Seccion titulo={`Mes anterior (${nombreMesAnterior(new Date())})`}>
        <Card>
          <CardContent className="p-4">
            <Linea etiqueta="Ingresos" amount={metrics.ingresosMesAnterior} currency={currency} />
            <Linea etiqueta="Gastos" amount={metrics.gastosMesAnterior} currency={currency} />
            <Linea etiqueta="Balance" amount={metrics.balanceMesAnterior} currency={currency} destacado negativo={metrics.balanceMesAnterior < 0} />
          </CardContent>
        </Card>
      </Seccion>

      {/* 4. Cuentas por tipo, saldo en su divisa */}
      <Seccion titulo="Cuentas">
        {cuentasPorTipo.map((g) => (
          <Card key={g.tipo}>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-muted-foreground mb-1">{g.tipo}</p>
              {g.cuentas.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 min-h-12 border-t first:border-t-0">
                  <span className="text-base truncate">{a.nombre}</span>
                  <Importe amount={a.saldoActual} currency={a.divisa} className={cn(a.saldoActual < 0 && 'text-destructive')} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {cuentasPorTipo.length === 0 && (
          <p className="text-base text-muted-foreground px-1">Sin cuentas con saldo.</p>
        )}
      </Seccion>
    </div>
  );
};

export default ResumenMovil;
```

- [ ] En `src/App.tsx`: añadir bajo `const SoloEscritorio = ...`:

```tsx
const ResumenMovil = lazy(() => import("./pages/movil/ResumenMovil"));
```

  y en las rutas `/` y `/dashboard` cambiar `mobile={SoloEscritorio}` por `mobile={ResumenMovil}`.

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual a 390px, `#/dashboard`: patrimonio neto a 32px con código de divisa; tarjeta Activos con total + 4 líneas; Pasivos con total + 2 líneas; "Mes anterior (Agosto de 2026)" con ingresos/gastos/balance; cuentas agrupadas por tipo con saldo en su divisa, sin vendidas ni saldo cero. Tocar chip USD: patrimonio, activos, pasivos y mes anterior cambian; los saldos de cuentas no. El patrimonio neto en la divisa del perfil coincide con el Dashboard de escritorio. Modo oscuro legible.
- [ ] Commit: `git add src/pages/movil/ResumenMovil.tsx src/App.tsx && git commit -m "Pantalla móvil de Resumen"`.

---

### Task 8: `InversionesMovil` (`/inversiones`)

**Files**
- Create: `src/pages/movil/InversionesMovil.tsx`
- Modify: `src/App.tsx` (ruta `/inversiones`)

**Interfaces**
- Consumes: `useInvestments()` → `investments`, `valuations`, `loading`; `useExchangeRates().convertCurrency`; `useMobileCurrency().currency`; `investmentReturn(inv, valuations)`; `formatNumber` de `@/lib/formatters`.
- Produces: `export default InversionesMovil`.

- [ ] Crear `src/pages/movil/InversionesMovil.tsx`:

```tsx
import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { investmentReturn } from '@/lib/finance/investmentReturn';
import { CurrencyCode } from '@/lib/finance/dashboardMetrics';
import { formatNumber } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const InversionesMovil = () => {
  const { investments, valuations, loading } = useInvestments();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  const activas = useMemo(() => investments.filter((i) => i.activa !== false), [investments]);

  // Misma regla que el escritorio (toPref), pero hacia la divisa elegida en móvil
  const totals = useMemo(() => {
    const toElegida = (amount: number, divisa: string) =>
      divisa === currency ? amount : convertCurrency(amount, divisa as CurrencyCode, currency);
    return activas.reduce(
      (acc, i) => {
        acc.invertido += toElegida(i.monto_invertido || 0, i.moneda);
        acc.valor += toElegida(i.valor_actual || i.monto_invertido || 0, i.moneda);
        return acc;
      },
      { invertido: 0, valor: 0 },
    );
  }, [activas, currency, convertCurrency]);
  const rendimiento = totals.valor - totals.invertido;
  const rendimientoPct = totals.invertido ? (rendimiento / totals.invertido) * 100 : 0;

  if (loading) return <Cargando texto="Cargando inversiones..." />;

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Valor actual</p>
        <Importe amount={totals.valor} currency={currency} principal />
        <p className="text-sm text-muted-foreground mt-1">sin cripto</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 min-h-12">
            <span className="text-base text-muted-foreground">Invertido</span>
            <Importe amount={totals.invertido} currency={currency} />
          </div>
          <div className="flex items-center justify-between gap-3 min-h-12 border-t">
            <span className="text-base text-muted-foreground">Rendimiento</span>
            <span className={cn('text-base font-semibold tabular-nums', rendimiento >= 0 ? 'text-emerald-600' : 'text-destructive')}>
              {rendimiento >= 0 ? '+' : '-'}{formatNumber(Math.abs(rendimiento))} {currency} ({rendimientoPct.toFixed(2)}%)
            </span>
          </div>
        </CardContent>
      </Card>

      <Seccion titulo={`Inversiones activas (${activas.length})`}>
        {activas.length === 0 && <p className="text-base text-muted-foreground px-1">Sin inversiones activas.</p>}
        {activas.map((i) => {
          const { valor, delta, pct } = investmentReturn(i, valuations);
          const positivo = delta >= 0;
          return (
            <Card key={i.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{i.nombre}</p>
                  <Badge variant="outline" className="text-sm font-normal mt-1">{i.tipo}</Badge>
                </div>
                <div className="text-right shrink-0">
                  <Importe amount={valor} currency={i.moneda} />
                  <p className={cn('text-sm font-medium flex items-center justify-end gap-1', positivo ? 'text-emerald-600' : 'text-destructive')}>
                    {positivo ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {positivo ? '+' : '-'}{formatNumber(Math.abs(delta))} ({pct.toFixed(2)}%)
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </Seccion>
    </div>
  );
};

export default InversionesMovil;
```

- [ ] En `src/App.tsx`: añadir `const InversionesMovil = lazy(() => import("./pages/movil/InversionesMovil"));` y en la ruta `/inversiones` cambiar `mobile={SoloEscritorio}` por `mobile={InversionesMovil}`.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual a 390px, `#/inversiones`: "Valor actual" a 32px con nota "sin cripto"; tarjeta Invertido/Rendimiento (verde/rojo); lista de activas con nombre, tipo, valor en su moneda y rendimiento coloreado. Con el chip en la divisa del perfil, "Invertido" y "Valor actual" coinciden con las tarjetas de escritorio (que excluyen cripto en esos dos totales). Cambiar chip: los totales se recalculan; los valores por fila no.
- [ ] Commit: `git add src/pages/movil/InversionesMovil.tsx src/App.tsx && git commit -m "Pantalla móvil de Inversiones"`.

---

### Task 9: `SuscripcionesMovil` (`/suscripciones`)

**Files**
- Create: `src/pages/movil/SuscripcionesMovil.tsx`
- Modify: `src/App.tsx` (ruta `/suscripciones`)

**Interfaces**
- Consumes: `useSubscriptionServices()` → `subscriptions`, `loading`; `useAppConfig().config.currency`; `useExchangeRates().convertCurrency`; `useMobileCurrency().currency`; `computeSubscriptionsSummary`, `diasHasta`, `parseFechaLocal`, `formatFechaCorta`.
- Produces: `export default SuscripcionesMovil`.

- [ ] Crear `src/pages/movil/SuscripcionesMovil.tsx`:

```tsx
import { useMemo } from 'react';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computeSubscriptionsSummary } from '@/lib/finance/subscriptionsSummary';
import { diasHasta, formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const etiquetaVencimiento = (dias: number) => {
  if (dias < 0) return 'Vencida';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
};

const SuscripcionesMovil = () => {
  const { subscriptions, loading } = useSubscriptionServices();
  const { config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  // La tabla no guarda divisa: todo importe es config.currency (igual que CxP)
  const divisaTabla = config.currency;

  const resumen = useMemo(() => computeSubscriptionsSummary(subscriptions), [subscriptions]);
  const estimadoElegida =
    divisaTabla === currency ? resumen.estimadoMensual : convertCurrency(resumen.estimadoMensual, divisaTabla, currency);

  const ordenadas = useMemo(
    () => [...subscriptions].sort((a, b) => a.proximo_pago.localeCompare(b.proximo_pago)),
    [subscriptions],
  );

  if (loading) return <Cargando texto="Cargando suscripciones..." />;

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Estimado mensual (prorrateado)</p>
        <Importe amount={estimadoElegida} currency={currency} principal />
        <p className="text-sm text-muted-foreground mt-1">
          {resumen.estimadas} con frecuencia conocida
          {resumen.sinEstimar > 0 && ` · ${resumen.sinEstimar} irregular${resumen.sinEstimar !== 1 ? 'es' : ''} sin estimar`}
        </p>
      </div>

      <Seccion titulo={`Activas (${ordenadas.length})`}>
        {ordenadas.length === 0 && <p className="text-base text-muted-foreground px-1">Sin suscripciones activas.</p>}
        {ordenadas.map((s) => {
          const dias = diasHasta(s.proximo_pago, now);
          const pronto = dias <= 7;
          return (
            <Card key={s.id} className={cn(pronto && 'border-destructive')}>
              <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{s.service_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-sm font-normal">{s.frecuencia}</Badge>
                    <span className={cn('text-sm', pronto ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      {formatFechaCorta(parseFechaLocal(s.proximo_pago))}
                      {pronto && ` · ${etiquetaVencimiento(dias)}`}
                    </span>
                  </div>
                </div>
                <Importe amount={Number(s.ultimo_pago_monto) || 0} currency={divisaTabla} className="shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </Seccion>
    </div>
  );
};

export default SuscripcionesMovil;
```

- [ ] En `src/App.tsx`: añadir `const SuscripcionesMovil = lazy(() => import("./pages/movil/SuscripcionesMovil"));` y en la ruta `/suscripciones` cambiar `mobile={SoloEscritorio}` por `mobile={SuscripcionesMovil}`.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual a 390px, `#/suscripciones`: "Estimado mensual (prorrateado)" a 32px, línea "N con frecuencia conocida · M irregulares sin estimar"; lista ordenada por próximo pago: nombre, badge de frecuencia, fecha, importe con el código de `config.currency`; las que vencen en ≤ 7 días con borde rojo y "En N días"/"Hoy"/"Vencida". Cambiar chip: solo cambia el estimado. La suma de las "Mensual" del móvil coincide con el total de escritorio (que solo suma mensuales).
- [ ] Commit: `git add src/pages/movil/SuscripcionesMovil.tsx src/App.tsx && git commit -m "Pantalla móvil de Suscripciones"`.

---

### Task 10: `PorCobrarMovil` (`/pendientes`)

**Files**
- Create: `src/pages/movil/PorCobrarMovil.tsx`
- Modify: `src/App.tsx` (ruta `/pendientes`)

**Interfaces**
- Consumes: `usePendings()` → `pendings`, `loading`; `useExchangeRates().convertCurrency`; `useMobileCurrency().currency`; `computePendingsSummary`; `parseFechaLocal`, `formatFechaCorta`.
- Produces: `export default PorCobrarMovil`.

- [ ] Crear `src/pages/movil/PorCobrarMovil.tsx`:

```tsx
import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePendings } from '@/hooks/usePendings';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computePendingsSummary } from '@/lib/finance/pendingsSummary';
import { formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const TIPO_LABEL: Record<string, string> = {
  reembolso_gasto: 'Reembolso',
  ingreso_esperado: 'Ingreso esperado',
};

const PorCobrarMovil = () => {
  const { pendings, loading } = usePendings();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  // El total NO usa totalPendientePorCobrar (suma sin convertir): se convierte fila a fila.
  const resumen = useMemo(
    () => computePendingsSummary(pendings, convertCurrency, currency),
    [pendings, convertCurrency, currency],
  );

  if (loading) return <Cargando texto="Cargando pendientes..." />;

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Por cobrar</p>
        <Importe amount={resumen.total} currency={currency} principal />
        <p className="text-sm text-muted-foreground mt-1">
          {resumen.rows.length} pendiente{resumen.rows.length !== 1 ? 's' : ''}
          {resumen.vencidos > 0 && (
            <span className="text-destructive font-medium"> · {resumen.vencidos} vencido{resumen.vencidos !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>

      <Seccion titulo="Pendientes">
        {resumen.rows.length === 0 && <p className="text-base text-muted-foreground px-1">Nada por cobrar.</p>}
        {resumen.rows.map(({ pending: p, restante, vencido }) => (
          <Card key={p.id} className={cn(vencido && 'border-destructive')}>
            <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
              <div className="min-w-0">
                <p className={cn('text-base font-semibold truncate', vencido && 'text-destructive')}>{p.concepto}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-sm font-normal">{TIPO_LABEL[p.tipo] ?? p.tipo}</Badge>
                  {p.estado === 'cobrado_parcial' && <Badge variant="outline" className="text-sm font-normal">Parcial</Badge>}
                  <span className={cn('text-sm flex items-center gap-1', vencido ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {vencido && <AlertCircle className="h-4 w-4" />}
                    {p.fecha_esperada ? formatFechaCorta(parseFechaLocal(p.fecha_esperada)) : 'Sin fecha'}
                  </span>
                </div>
              </div>
              <Importe amount={restante} currency={p.divisa} className={cn('shrink-0', vencido && 'text-destructive')} />
            </CardContent>
          </Card>
        ))}
      </Seccion>
    </div>
  );
};

export default PorCobrarMovil;
```

- [ ] En `src/App.tsx`: añadir `const PorCobrarMovil = lazy(() => import("./pages/movil/PorCobrarMovil"));` y en la ruta `/pendientes` cambiar `mobile={SoloEscritorio}` por `mobile={PorCobrarMovil}`.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual a 390px, `#/pendientes`: total a 32px en la divisa elegida; "N pendientes · M vencidos"; vencidos primero (borde y texto rojo, icono), luego por fecha, sin fecha al final; restante en su divisa y "Parcial" si `cobrado_parcial`. El número de vencidos coincide con el badge de la pestaña. Cambiar chip: cambia el total, no las filas.
- [ ] Commit: `git add src/pages/movil/PorCobrarMovil.tsx src/App.tsx && git commit -m "Pantalla móvil de Por cobrar"`.

---

### Task 11: `PorPagarMovil` (`/cxp`)

**Files**
- Create: `src/pages/movil/PorPagarMovil.tsx`
- Modify: `src/App.tsx` (ruta `/cxp`)

**Interfaces**
- Consumes: `useFinanceDataSupabase()` → `accounts`, `categories`, `transactions`, `loading`; `useSubscriptionServices()`; `useAppConfig().config.currency` (→ `baseCurrency`); `useExchangeRates().convertCurrency`; `useMobileCurrency().currency`; `computeCxP`; `formatFechaCorta`.
- Produces: `export default PorPagarMovil`.

- [ ] Crear `src/pages/movil/PorPagarMovil.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computeCxP } from '@/lib/finance/cxp';
import { formatFechaCorta } from '@/lib/finance/fechas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const HORIZONTES = [30, 60, 90] as const;
type Horizonte = (typeof HORIZONTES)[number];

const PorPagarMovil = () => {
  const { accounts, categories, transactions, loading } = useFinanceDataSupabase();
  const { subscriptions, loading: loadingSubs } = useSubscriptionServices();
  const { config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();
  const [horizonte, setHorizonte] = useState<Horizonte>(30);

  // baseCurrency SIEMPRE es la del perfil (fallback de filas sin divisa y clave de
  // agrupación de recurrentes); la divisa elegida solo afecta al total.
  const rows = useMemo(
    () => computeCxP({ transactions, categories, accounts, subscriptions, horizonte, baseCurrency: config.currency }),
    [transactions, categories, accounts, subscriptions, horizonte, config.currency],
  );

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + convertCurrency(r.monto, r.divisa, currency), 0),
    [rows, convertCurrency, currency],
  );

  if (loading || loadingSubs) return <Cargando texto="Cargando cuentas por pagar..." />;

  const hoy = Date.now();

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Por pagar en {horizonte} días</p>
        <Importe amount={total} currency={currency} principal className="text-destructive" />
        <p className="text-sm text-muted-foreground mt-1">{rows.length} concepto{rows.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Horizonte">
        {HORIZONTES.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizonte(h)}
            aria-pressed={horizonte === h}
            className={cn(
              'flex-1 h-12 rounded-full text-base font-semibold transition-colors',
              horizonte === h ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {h} días
          </button>
        ))}
      </div>

      <Seccion titulo="Provisiones">
        {rows.length === 0 && <p className="text-base text-muted-foreground px-1">Sin provisiones en este horizonte.</p>}
        {rows.map((r) => {
          const dias = Math.ceil((r.fechaEstimada.getTime() - hoy) / (1000 * 60 * 60 * 24));
          const pronto = dias <= 7;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{r.concepto}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-sm font-normal">{r.tipo}</Badge>
                    <span className={cn('text-sm', pronto ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      {formatFechaCorta(r.fechaEstimada)} · en {dias} d
                    </span>
                  </div>
                </div>
                <Importe amount={r.monto} currency={r.divisa} className="shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </Seccion>
    </div>
  );
};

export default PorPagarMovil;
```

- [ ] En `src/App.tsx`: añadir `const PorPagarMovil = lazy(() => import("./pages/movil/PorPagarMovil"));` y en la ruta `/cxp` cambiar `mobile={SoloEscritorio}` por `mobile={PorPagarMovil}`.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Verificación manual a 390px, `#/cxp`: total a 32px en rojo; chips 30/60/90 (30 por defecto) de 48px; lista ordenada por fecha con concepto, badge de tipo, fecha, "en N d" (rojo si ≤ 7) e importe en su divisa. Con el chip en la divisa del perfil, total y número de conceptos coinciden con "Total CxP 30d" de escritorio; también en 60 y 90. Cambiar chip de divisa: solo cambia el total. Una suscripción puede aparecer aquí con la fecha un día antes que en Suscripciones: es el comportamiento heredado de la decisión 6, no un fallo.
- [ ] Commit: `git add src/pages/movil/PorPagarMovil.tsx src/App.tsx && git commit -m "Pantalla móvil de Por pagar"`.

---

### Task 12: Changelog 7.1, build y verificación final

**Files**
- Modify: `src/components/Changelog.tsx`

**Interfaces**
- Produces: `APP_VERSION === '7.1'` (sale de `changelog[0].version`).

- [ ] En `src/components/Changelog.tsx`, insertar al principio del array `changelog` (antes de la entrada `version: '7.0'`):

```tsx
  {
    version: '7.1',
    date: 'Septiembre 2026',
    changes: [
      { icon: <Sparkles className="h-4 w-4" />, text: 'Versión móvil de solo lectura (pantallas de menos de 768px): Resumen, Inversiones, Suscripciones, Por cobrar y Por pagar con letra grande, nav inferior y selector de divisa propio', type: 'feature' },
      { icon: <Zap className="h-4 w-4" />, text: 'Las cuentas por pagar y el rendimiento de inversiones se calculan con funciones compartidas entre escritorio y móvil, con tests automáticos', type: 'improvement' },
      { icon: <Bug className="h-4 w-4" />, text: 'En el móvil ya no aparece un instante la versión de escritorio al abrir la app', type: 'fix' },
    ],
  },
```

- [ ] `npx vitest run` → todo en verde (incluidos `cxp`, `investmentReturn`, `subscriptionsSummary`, `pendingsSummary`, `fechas`).
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] `npm run build` → sin errores; aparecen chunks separados para `ResumenMovil`, `InversionesMovil`, `SuscripcionesMovil`, `PorCobrarMovil`, `PorPagarMovil`, `SoloEscritorio`.
- [ ] Verificación final a 390×844 con datos reales, claro y oscuro:
  - Las cinco pestañas cargan y muestran datos; ningún texto de contenido < 14px; ningún botón de crear/editar/borrar.
  - `#/transacciones` y `#/alertas` → "Solo disponible en escritorio".
  - Cambiar chip de divisa recalcula los totales en las cinco pantallas y persiste al recargar.
  - Sidebar de escritorio: "v7.1" bajo el nombre del perfil.
- [ ] Verificación final a escritorio: Dashboard, Inversiones, CxP y Suscripciones iguales que antes (mismas filas y totales en CxP para 30/60/90).
- [ ] Commit: `git add src/components/Changelog.tsx && git commit -m "Versión 7.1: versión móvil de solo lectura"`.
- [ ] Merge de `version-movil` en `main` y push **solo cuando el usuario lo pida**.

---

## Verificación end-to-end (resumen)

1. `npx vitest run` → 5 archivos de test nuevos en verde más los 4 existentes.
2. `npx tsc --noEmit -p tsconfig.app.json` y `npm run build` sin errores.
3. Browser pane (`preview_start` `savium-dev`) a 390×844: recorrer las cinco pestañas, cambiar divisa, recargar, modo oscuro, `#/transacciones` → SoloEscritorio.
4. Browser pane a escritorio: CxP 30/60/90 y Inversiones con los mismos números que antes de la rama (comparar con `git stash` o con producción en savium.manoloto.com).

## Archivos críticos

- `src/pages/CxP.tsx` — fuente literal de la lógica que pasa a `src/lib/finance/cxp.ts`
- `src/App.tsx` — cableado `ProtectedRoute > Responsive > página`
- `src/components/movil/MobileLayout.tsx` — cabecera, chips, nav inferior, Suspense propio
- `src/contexts/MobileCurrencyContext.tsx` — prioridad localStorage → perfil
- `src/lib/finance/dashboardMetrics.test.ts` — estilo de fixtures que replican los tests nuevos
