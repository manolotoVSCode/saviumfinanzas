# App iOS · Plan 1: datos compartidos (Postgres, web y fixtures) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar listo lo que la app iOS necesita de la web y de la base de datos. Saldos y patrimonio pasan a calcularse en vistas de Postgres que la web ya usa. Las reglas que la app repetirá en Swift quedan fijadas en fixtures JSON compartidos, que vitest verifica.

**Architecture:** Dos vistas con `security_invoker`: `saldos_cuentas` y `patrimonio_por_divisa`. La web lee los saldos de la primera, y los activos y pasivos de la segunda mediante una función pura nueva, `computePatrimonio`. Las reglas que siguen en cliente (vencidos, Por pagar, suscripciones, mes anterior, divisas) se describen en `shared/fixtures/*.json`. Un test de vitest los recorre contra el código TypeScript; en el plan 2, `SaviumCore` (Swift) leerá los mismos archivos.

**Tech Stack:** React 18 + Vite + TypeScript, TanStack Query, Supabase (PostgREST), vitest, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-06-app-ios-nativa-design.md` (secciones 2 y 6). Este plan cubre solo la parte de Postgres, web y fixtures. La app iOS (plan 2) y la publicación (plan 3) van en planes aparte.

## Global Constraints

- Todo el texto de UI, los nombres nuevos de funciones y archivos, y los commits van en **español**.
- Commits por tema, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Nunca `git push`**: dispara el deploy a producción y lo decide el usuario.
- La migración se escribe en `supabase/migrations/`. **La ejecuta el usuario en el SQL Editor de Supabase**; no intentes aplicarla tú.
- Todo SQL que se le pase al usuario lleva `WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'`, con un comentario que lo diga: el SQL Editor corre como administrador e **ignora RLS**, y en la base hay otras dos cuentas. El editor solo muestra el resultado de la última sentencia, así que las consultas de verificación se pasan **una a una**.
- Las vistas **deben** crearse con `WITH (security_invoker = true)`; sin eso se saltan las políticas RLS.
- Las cifras de la web deben ser idénticas antes y después del cambio (criterio 1 de la spec).
- Verificación de cada tarea: `npx vitest run` (hoy 217 tests en verde) y `npx tsc --noEmit -p tsconfig.app.json`. Al final, además, `npm run lint` y `npm run build`.
- Los tests corren en `America/Mexico_City` (UTC−6, sin horario de verano). La tarea 5 lo fija en `vite.config.ts`.
- Convención de fechas del repo (`src/lib/finance/fechas.ts`):
  - `Transaction.fecha` se crea con `new Date('YYYY-MM-DD')`, es decir, a medianoche UTC.
  - `parseFechaLocal` devuelve medianoche local.
  - `toFechaISO` devuelve la fecha local en formato `YYYY-MM-DD`.
- Hay una tarea paralela («Fix day-1 transactions counted in previous month») que también puede tocar `dashboardMetrics.ts` y `vite.config.ts`. Si al hacer commit hay conflicto, conserva los dos cambios.

## Review Focus

1. **Un pendiente que vence hoy no debe salir como vencido.** Hoy `isPendingOverdue` y `usePendings.overdueCount` parsean `fecha_esperada` en UTC, así que en México lo de hoy cuenta como vencido. Los tests de la tarea 4 lo fijan.
2. **Después de apuntar, editar, borrar o importar transacciones en la web, saldos y patrimonio deben refrescarse.** Ahora vienen de otra consulta (`QK.cuentas` y `QK.patrimonio`), que hay que invalidar junto a `QK.transacciones`. Lo cubren el paso de invalidación y la comprobación manual de la tarea 3.
3. **Una cuenta sin transacciones tiene saldo igual al saldo inicial, no nulo.** Lo garantiza el `COALESCE` de la vista y la consulta de verificación 2 de la tarea 1.
4. **Las reglas de clasificación deben quedar exactamente como antes:**
   - Una cuenta en una divisa distinta de MXN, USD o EUR no entra en el patrimonio.
   - Una cuenta sin divisa cuenta como MXN.
   - Una tarjeta con saldo positivo no es pasivo.
   - Una cuenta vendida no suma a los activos, pero sí a los pasivos.

   Está en el SQL de la tarea 1 y se comprueba en la tarea 3, comparando con producción.
5. **Los fixtures deben describir el comportamiento correcto, no un fallo.** Evitan a propósito las transacciones con fecha día 1 (fallo conocido, en otra tarea) y comparan fechas como `YYYY-MM-DD`. Lo cubre la tarea 5.

---

### Task 1: Vistas `saldos_cuentas` y `patrimonio_por_divisa`

**Files:**
- Create: `supabase/migrations/20261006120000_vistas_saldos_patrimonio.sql`
- Modify: `src/integrations/supabase/types.ts:765-767` (bloque `Views`)

**Interfaces:**
- Consumes: tablas `cuentas` (`id`, `user_id`, `tipo`, `divisa`, `vendida`, `saldo_inicial`…) y `transacciones` (`cuenta_id`, `ingreso`, `gasto`).
- Produces:
  - Vista `public.saldos_cuentas`: todas las columnas de `cuentas` más `saldo_actual numeric`.
  - Vista `public.patrimonio_por_divisa`: columnas `user_id uuid`, `divisa text` (MXN, USD o EUR), `clase text` (`activo` o `pasivo`), `rubro text` (`efectivo_bancos`, `inversiones`, `empresas_privadas`, `bien_raiz`, `tarjetas_credito` o `hipoteca`) e `importe numeric` (siempre ≥ 0 en pasivos).
  - Los tipos `Views.saldos_cuentas` y `Views.patrimonio_por_divisa` en `types.ts`.

- [ ] **Step 1: Escribir la migración**

```sql
-- Vistas para que la web y la app iOS lean saldos y patrimonio calculados en un
-- solo sitio. Mismas reglas que computeAccountBalances y computeDashboardMetrics
-- (src/lib/finance). security_invoker = true: se aplican las RLS de cuentas y
-- transacciones del usuario que consulta.

CREATE VIEW public.saldos_cuentas
WITH (security_invoker = true) AS
SELECT
  c.*,
  c.saldo_inicial + COALESCE(m.movimientos, 0) AS saldo_actual
FROM public.cuentas c
LEFT JOIN (
  SELECT cuenta_id, SUM(COALESCE(ingreso, 0) - COALESCE(gasto, 0)) AS movimientos
  FROM public.transacciones
  GROUP BY cuenta_id
) m ON m.cuenta_id = c.id;

-- Una fila por (usuario, divisa, rubro). Activos sin cuentas vendidas; pasivos =
-- parte negativa del saldo de tarjetas e hipotecas, en positivo (sin filtrar
-- vendidas, como hoy). Divisa vacía = MXN; otras divisas no entran.
-- user_id está para poder filtrar desde el SQL Editor (que ignora RLS).
CREATE VIEW public.patrimonio_por_divisa
WITH (security_invoker = true) AS
WITH clasificadas AS (
  SELECT
    user_id,
    COALESCE(NULLIF(divisa, ''), 'MXN') AS divisa,
    COALESCE(vendida, false) AS vendida,
    CASE
      WHEN tipo IN ('Efectivo', 'Banco', 'Ahorros') THEN 'efectivo_bancos'
      WHEN tipo = 'Inversiones' THEN 'inversiones'
      WHEN tipo = 'Empresa Propia' THEN 'empresas_privadas'
      WHEN tipo = 'Bien Raíz' THEN 'bien_raiz'
      WHEN tipo = 'Tarjeta de Crédito' THEN 'tarjetas_credito'
      WHEN tipo = 'Hipoteca' THEN 'hipoteca'
    END AS rubro,
    CASE WHEN tipo IN ('Tarjeta de Crédito', 'Hipoteca') THEN 'pasivo' ELSE 'activo' END AS clase,
    CASE
      WHEN tipo IN ('Tarjeta de Crédito', 'Hipoteca') THEN ABS(LEAST(0, saldo_actual))
      ELSE saldo_actual
    END AS importe
  FROM public.saldos_cuentas
)
SELECT user_id, divisa, clase, rubro, SUM(importe) AS importe
FROM clasificadas
WHERE rubro IS NOT NULL
  AND divisa IN ('MXN', 'USD', 'EUR')
  AND NOT (clase = 'activo' AND vendida)
GROUP BY user_id, divisa, clase, rubro;

GRANT SELECT ON public.saldos_cuentas TO authenticated;
GRANT SELECT ON public.patrimonio_por_divisa TO authenticated;
GRANT ALL ON public.saldos_cuentas TO service_role;
GRANT ALL ON public.patrimonio_por_divisa TO service_role;

-- Que PostgREST vea las vistas nuevas sin esperar a la recarga automática.
NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Añadir las vistas a los tipos de Supabase**

En `src/integrations/supabase/types.ts`, sustituye:

```ts
    Views: {
      [_ in never]: never
    }
```

por:

```ts
    Views: {
      patrimonio_por_divisa: {
        Row: {
          clase: string
          divisa: string
          importe: number
          rubro: string
          user_id: string
        }
        Relationships: []
      }
      saldos_cuentas: {
        Row: {
          created_at: string
          divisa: string
          fecha_inicio: string | null
          id: string
          modalidad: string | null
          nombre: string
          rendimiento_bruto: number | null
          rendimiento_mensual: number | null
          rendimiento_neto: number | null
          saldo_actual: number
          saldo_inicial: number
          tipo: string
          tipo_inversion: string | null
          ultimo_pago: string | null
          updated_at: string
          user_id: string
          valor_mercado: number | null
          vendida: boolean
        }
        Relationships: []
      }
    }
```

- [ ] **Step 3: Comprobar que compila**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx vitest run`
Expected: sin errores; 217 tests en verde.

- [ ] **Step 4: Pedir al usuario que ejecute la migración y verificarla**

Pide al usuario que pegue el contenido de la migración en el SQL Editor de Supabase y lo ejecute. Las vistas no cambian ningún dato. Después, pásale estas consultas **una a una** y anota los resultados:

```sql
-- Verificación 1. Filtra por el user_id de manoloto: el SQL Editor ignora RLS.
-- Patrimonio por divisa y rubro.
SELECT divisa, clase, rubro, ROUND(importe, 2) AS importe
FROM public.patrimonio_por_divisa
WHERE user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'
ORDER BY clase, rubro, divisa;
```

```sql
-- Verificación 2. Filtra por el user_id de manoloto: el SQL Editor ignora RLS.
-- Ninguna cuenta con saldo nulo, y las cuentas sin movimientos con saldo = saldo inicial.
SELECT
  COUNT(*) AS cuentas,
  COUNT(*) FILTER (WHERE saldo_actual IS NULL) AS saldos_nulos,
  COUNT(*) FILTER (
    WHERE NOT EXISTS (SELECT 1 FROM public.transacciones t WHERE t.cuenta_id = s.id)
      AND saldo_actual <> saldo_inicial
  ) AS sin_movimientos_descuadradas
FROM public.saldos_cuentas s
WHERE s.user_id = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e';
```

Expected: la verificación 2 devuelve `saldos_nulos = 0` y `sin_movimientos_descuadradas = 0`. La verificación 1 muestra entre 1 y 18 filas, sin importes negativos en `pasivo`. Guarda la salida de la verificación 1: se usa en la tarea 3.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261006120000_vistas_saldos_patrimonio.sql src/integrations/supabase/types.ts
git commit -m "Vistas saldos_cuentas y patrimonio_por_divisa para compartir el cálculo con la app iOS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `computePatrimonio` y su uso en `computeDashboardMetrics`

**Files:**
- Create: `src/lib/finance/patrimonio.ts`
- Create: `src/lib/finance/patrimonio.test.ts`
- Modify: `src/lib/finance/dashboardMetrics.ts:109-115` (firma) y `:192-275` (bloque de activos y pasivos)
- Modify: `src/lib/finance/dashboardMetrics.test.ts` (todas las llamadas y el bloque `activos, pasivos y patrimonio`)

**Interfaces:**
- Consumes: `ConvertCurrency` y `CurrencyCode` de `./dashboardMetrics`, como `import type`, para evitar un import circular en tiempo de ejecución.
- Produces:
  - `type PatrimonioFila = { divisa: CurrencyCode; clase: 'activo' | 'pasivo'; rubro: 'efectivo_bancos' | 'inversiones' | 'empresas_privadas' | 'bien_raiz' | 'tarjetas_credito' | 'hipoteca'; importe: number }`
  - `mapPatrimonio(rows: { divisa: string; clase: string; rubro: string; importe: number | string }[]): PatrimonioFila[]`
  - `computePatrimonio(filas: PatrimonioFila[], convertCurrency: ConvertCurrency, currency: CurrencyCode): Patrimonio`, donde `Patrimonio = { activosPorMoneda, pasivosPorMoneda, activos, pasivos, patrimonioNeto }` con las mismas formas que `DashboardMetrics` (`src/types/finance.ts:58-79`).
  - La nueva firma: `computeDashboardMetrics(accounts: Account[], enrichedTransactions: Transaction[], patrimonio: PatrimonioFila[], convertCurrency: ConvertCurrency, currency: CurrencyCode, now?: Date)`.

- [ ] **Step 1: Escribir los tests de `computePatrimonio`**

`src/lib/finance/patrimonio.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ConvertCurrency } from './dashboardMetrics';
import { computePatrimonio, mapPatrimonio, PatrimonioFila } from './patrimonio';

// Tasas fijas: 1 USD = 20 MXN, 1 EUR = 22 MXN
const RATES = { MXN: 1, USD: 20, EUR: 22 };
const convert: ConvertCurrency = (amount, from, to) => (from === to ? amount : (amount * RATES[from]) / RATES[to]);

const fila = (over: Partial<PatrimonioFila>): PatrimonioFila => ({
  divisa: 'MXN', clase: 'activo', rubro: 'efectivo_bancos', importe: 0, ...over,
});

describe('computePatrimonio', () => {
  it('reparte por rubro y divisa y convierte a la divisa elegida', () => {
    const p = computePatrimonio([
      fila({ rubro: 'efectivo_bancos', importe: 1500 }),
      fila({ rubro: 'inversiones', importe: 100, divisa: 'USD' }),
      fila({ rubro: 'bien_raiz', importe: 10000 }),
      fila({ rubro: 'empresas_privadas', importe: 300 }),
      fila({ clase: 'pasivo', rubro: 'tarjetas_credito', importe: 400 }),
      fila({ clase: 'pasivo', rubro: 'hipoteca', importe: 50, divisa: 'EUR' }),
    ], convert, 'MXN');
    expect(p.activos).toEqual({ efectivoBancos: 1500, inversiones: 2000, empresasPrivadas: 300, bienRaiz: 10000, total: 13800 });
    expect(p.pasivos).toEqual({ tarjetasCredito: 400, hipoteca: 1100, total: 1500 });
    expect(p.patrimonioNeto).toBe(12300);
    expect(p.activosPorMoneda.USD).toEqual({ efectivoBancos: 0, inversiones: 100, empresasPrivadas: 0, bienRaiz: 0, total: 100 });
    expect(p.pasivosPorMoneda.EUR).toEqual({ tarjetasCredito: 0, hipoteca: 50, total: 50 });
  });

  it('sin filas todo es cero', () => {
    const p = computePatrimonio([], convert, 'MXN');
    expect(p.activos.total).toBe(0);
    expect(p.pasivos.total).toBe(0);
    expect(p.patrimonioNeto).toBe(0);
  });

  it('con divisa USD convierte los saldos MXN', () => {
    const p = computePatrimonio([fila({ importe: 2000 })], convert, 'USD');
    expect(p.activos.efectivoBancos).toBe(100);
  });

  it('mapPatrimonio convierte importes de texto (numeric de PostgREST) a número', () => {
    expect(mapPatrimonio([{ divisa: 'USD', clase: 'pasivo', rubro: 'hipoteca', importe: '12.50' }]))
      .toEqual([{ divisa: 'USD', clase: 'pasivo', rubro: 'hipoteca', importe: 12.5 }]);
  });
});
```

- [ ] **Step 2: Ejecutarlos y ver que fallan**

Run: `npx vitest run src/lib/finance/patrimonio.test.ts`
Expected: FAIL con «Failed to resolve import "./patrimonio"».

- [ ] **Step 3: Implementar `patrimonio.ts`**

```ts
import type { ConvertCurrency, CurrencyCode } from './dashboardMetrics';

type RubroActivo = 'efectivo_bancos' | 'inversiones' | 'empresas_privadas' | 'bien_raiz';
type RubroPasivo = 'tarjetas_credito' | 'hipoteca';

/** Fila de la vista `patrimonio_por_divisa`: importe de un rubro en una divisa (pasivos en positivo). */
export interface PatrimonioFila {
  divisa: CurrencyCode;
  clase: 'activo' | 'pasivo';
  rubro: RubroActivo | RubroPasivo;
  importe: number;
}

type Activos = { efectivoBancos: number; inversiones: number; empresasPrivadas: number; bienRaiz: number; total: number };
type Pasivos = { tarjetasCredito: number; hipoteca: number; total: number };

export interface Patrimonio {
  activosPorMoneda: Record<CurrencyCode, Activos>;
  pasivosPorMoneda: Record<CurrencyCode, Pasivos>;
  /** Convertidos a la divisa elegida. */
  activos: Activos;
  pasivos: Pasivos;
  patrimonioNeto: number;
}

const DIVISAS: CurrencyCode[] = ['MXN', 'USD', 'EUR'];
const CLAVES_ACTIVO = ['efectivoBancos', 'inversiones', 'empresasPrivadas', 'bienRaiz'] as const;
const CLAVES_PASIVO = ['tarjetasCredito', 'hipoteca'] as const;
const CLAVE_DE_RUBRO: Record<PatrimonioFila['rubro'], string> = {
  efectivo_bancos: 'efectivoBancos',
  inversiones: 'inversiones',
  empresas_privadas: 'empresasPrivadas',
  bien_raiz: 'bienRaiz',
  tarjetas_credito: 'tarjetasCredito',
  hipoteca: 'hipoteca',
};

const activosVacios = (): Activos => ({ efectivoBancos: 0, inversiones: 0, empresasPrivadas: 0, bienRaiz: 0, total: 0 });
const pasivosVacios = (): Pasivos => ({ tarjetasCredito: 0, hipoteca: 0, total: 0 });

export const mapPatrimonio = (
  rows: { divisa: string; clase: string; rubro: string; importe: number | string }[],
): PatrimonioFila[] =>
  rows.map((r) => ({
    divisa: r.divisa as CurrencyCode,
    clase: r.clase as PatrimonioFila['clase'],
    rubro: r.rubro as PatrimonioFila['rubro'],
    importe: Number(r.importe),
  }));

/**
 * Activos, pasivos y patrimonio neto a partir de la vista `patrimonio_por_divisa`.
 * Las reglas de qué cuenta como activo o pasivo viven en la vista; aquí solo se
 * reparte por divisa y se convierte a `currency`.
 */
export const computePatrimonio = (
  filas: PatrimonioFila[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
): Patrimonio => {
  const activosPorMoneda = { MXN: activosVacios(), USD: activosVacios(), EUR: activosVacios() };
  const pasivosPorMoneda = { MXN: pasivosVacios(), USD: pasivosVacios(), EUR: pasivosVacios() };

  filas.forEach((f) => {
    const destino: Record<string, number> | undefined =
      f.clase === 'activo' ? activosPorMoneda[f.divisa] : pasivosPorMoneda[f.divisa];
    if (!destino) return;
    destino[CLAVE_DE_RUBRO[f.rubro]] += f.importe;
    destino.total += f.importe;
  });

  const activos = activosVacios();
  const pasivos = pasivosVacios();
  DIVISAS.forEach((d) => {
    CLAVES_ACTIVO.forEach((k) => { activos[k] += convertCurrency(activosPorMoneda[d][k], d, currency); });
    CLAVES_PASIVO.forEach((k) => { pasivos[k] += convertCurrency(pasivosPorMoneda[d][k], d, currency); });
  });
  activos.total = activos.efectivoBancos + activos.inversiones + activos.empresasPrivadas + activos.bienRaiz;
  pasivos.total = pasivos.tarjetasCredito + pasivos.hipoteca;

  return { activosPorMoneda, pasivosPorMoneda, activos, pasivos, patrimonioNeto: activos.total - pasivos.total };
};
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx vitest run src/lib/finance/patrimonio.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Adaptar los tests de `computeDashboardMetrics` a la nueva firma**

En `src/lib/finance/dashboardMetrics.test.ts`:

1. Añade el import `import { PatrimonioFila } from './patrimonio';`.
2. En **todas** las llamadas, inserta `[]` como tercer argumento. Por ejemplo, `computeDashboardMetrics([], [...], convert, 'MXN', NOW)` pasa a ser `computeDashboardMetrics([], [...], [], convert, 'MXN', NOW)`.
3. Sustituye el `describe('computeDashboardMetrics · activos, pasivos y patrimonio', …)` completo (líneas 79-116). Sus casos de clasificación ya están en la vista (tarea 1) y en `patrimonio.test.ts`. Pon en su lugar:

```ts
describe('computeDashboardMetrics · activos, pasivos y patrimonio', () => {
  it('toma activos, pasivos y patrimonio de las filas de la vista', () => {
    const filas: PatrimonioFila[] = [
      { divisa: 'MXN', clase: 'activo', rubro: 'efectivo_bancos', importe: 1500 },
      { divisa: 'USD', clase: 'activo', rubro: 'inversiones', importe: 100 },
      { divisa: 'MXN', clase: 'pasivo', rubro: 'tarjetas_credito', importe: 400 },
    ];
    const m = computeDashboardMetrics([], [], filas, convert, 'MXN', NOW);
    expect(m.activos.total).toBe(3500);
    expect(m.pasivos.total).toBe(400);
    expect(m.patrimonioNeto).toBe(3100);
    expect(m.activosPorMoneda.USD.inversiones).toBe(100);
  });
});
```

- [ ] **Step 6: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/finance/dashboardMetrics.test.ts`
Expected: FAIL. El caso nuevo da `activos.total` 0 y los demás reciben los argumentos desplazados.

- [ ] **Step 7: Cambiar `computeDashboardMetrics`**

En `src/lib/finance/dashboardMetrics.ts`:

1. Añade arriba `import { computePatrimonio, PatrimonioFila } from './patrimonio';`.
2. Cambia la firma (líneas 109-115) a:

```ts
export const computeDashboardMetrics = (
  accountsWithBalances: Account[],
  enrichedTransactions: Transaction[],
  patrimonio: PatrimonioFila[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
  now: Date = new Date()
): DashboardMetrics => {
```

3. Borra desde el comentario `// ACTIVOS DETALLADOS POR MONEDA` hasta la línea `const patrimonioNeto = activos.total - pasivos.total;`, ambas incluidas (≈ líneas 192-275). En su lugar pon:

```ts
    // ACTIVOS, PASIVOS Y PATRIMONIO: reglas en la vista patrimonio_por_divisa (compartida con la app iOS)
    const { activosPorMoneda, pasivosPorMoneda, activos, pasivos, patrimonioNeto } =
      computePatrimonio(patrimonio, convertCurrency, currency);
```

Las variables `activos`, `pasivos`, `activosPorMoneda`, `pasivosPorMoneda` y `patrimonioNeto` conservan su nombre, así que el resto de la función (distribución, score, `return`) no cambia. `accountsWithBalances` se sigue usando más abajo para las cuentas de inversión del score; no lo quites.

- [ ] **Step 8: Ejecutar los tests y el compilador**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Expected: los tests de `src/lib/finance` en verde. `tsc` falla **solo** en `src/hooks/useFinanceDataSupabase.ts` y `src/pages/movil/ResumenMovil.tsx` (llamadas con la firma antigua), que se arreglan en la tarea 3. No hagas commit todavía: la tarea 3 cierra este cambio.

---

### Task 3: La web lee saldos y patrimonio de las vistas

**Files:**
- Modify: `src/lib/finance/queryKeys.ts` (clave `patrimonio`)
- Modify: `src/lib/finance/queries.ts:7-13,59-63` (`mapAccounts`, `fetchAccounts`, nuevo `fetchPatrimonio`)
- Modify: `src/hooks/useFinanceDataSupabase.ts:9-11,40-44,64-70,382,430,522,542,568,582`
- Modify: `src/pages/movil/ResumenMovil.tsx:32-39`
- Modify: `src/lib/finance/calculations.ts` (quitar `computeAccountBalances`)
- Modify: `src/lib/finance/calculations.test.ts` (quitar su `describe`)

**Interfaces:**
- Consumes: las vistas de la tarea 1, más `mapPatrimonio`, `PatrimonioFila` y la nueva firma de `computeDashboardMetrics` de la tarea 2.
- Produces:
  - `fetchPatrimonio(): Promise<PatrimonioFila[]>`.
  - `financeQueryKeys(userId).patrimonio = ['finance', userId, 'cuentas', 'patrimonio']`. Cuelga de `cuentas`, así que invalidar `QK.cuentas` también la invalida.
  - `useFinanceDataSupabase()` devuelve además `patrimonio: PatrimonioFila[]`. Su `accounts` ya trae `saldoActual` desde la vista.

- [ ] **Step 1: Clave de caché**

En `src/lib/finance/queryKeys.ts`, debajo de la línea de `cuentas`:

```ts
  /** Cuelga de `cuentas`: invalidar QK.cuentas refresca también el patrimonio. */
  patrimonio: ['finance', userId, 'cuentas', 'patrimonio'] as const,
```

- [ ] **Step 2: Consultas**

En `src/lib/finance/queries.ts`:

1. En `mapAccounts`, cambia la línea de `saldoActual` por:

```ts
    saldoActual: Number(cuenta.saldo_actual ?? cuenta.saldo_inicial), // de la vista saldos_cuentas
```

2. Sustituye `fetchAccounts` por:

```ts
/** Cuentas con su saldo actual calculado en Postgres (vista saldos_cuentas). */
export const fetchAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase.from('saldos_cuentas').select('*');
  if (error) throw error;
  return mapAccounts(data ?? []);
};

/** Activos y pasivos por divisa y rubro (vista patrimonio_por_divisa). */
export const fetchPatrimonio = async (): Promise<PatrimonioFila[]> => {
  const { data, error } = await supabase.from('patrimonio_por_divisa').select('divisa, clase, rubro, importe');
  if (error) throw error;
  return mapPatrimonio(data ?? []);
};
```

3. Añade el import `import { mapPatrimonio, PatrimonioFila } from './patrimonio';`.

- [ ] **Step 3: El hook**

En `src/hooks/useFinanceDataSupabase.ts`:

1. Imports: `fetchAccounts, fetchCategories, fetchPatrimonio, fetchTransactions` desde `queries`; `enrichTransactions` (sin `computeAccountBalances`) desde `calculations`; añade `import { PatrimonioFila } from '@/lib/finance/patrimonio';`.
2. Junto a los `EMPTY_*`, añade `const EMPTY_PATRIMONIO: PatrimonioFila[] = [];`.
3. Después de `transactionsQuery`:

```ts
  const patrimonioQuery = useQuery({ queryKey: QK.patrimonio, queryFn: fetchPatrimonio, staleTime: STALE_TIME, enabled: !!user });
```

4. Añade `const patrimonio = patrimonioQuery.data ?? EMPTY_PATRIMONIO;`. Añade `|| patrimonioQuery.isPending` a `loading` y `?? patrimonioQuery.error` a `loadError`.
5. Borra la línea `const accountsWithBalances = useMemo(...)` y cambia `dashboardMetrics` a:

```ts
  const dashboardMetrics = useMemo(
    (): DashboardMetrics => computeDashboardMetrics(accounts, enrichedTransactions, patrimonio, convertCurrency, config.currency),
    [accounts, enrichedTransactions, patrimonio, convertCurrency, config.currency]
  );
```

6. En el `return`, cambia `accounts: accountsWithBalances,` por `accounts,` y añade `patrimonio,` justo debajo.
7. **Invalidación (Review Focus 2).** Las cinco llamadas `await invalidate(QK.transacciones);` (≈ líneas 382, 430, 522, 542 y 568) pasan a ser `await invalidate(QK.transacciones, QK.cuentas);`. `QK.cuentas` arrastra el patrimonio. Comprueba que no quede ninguna:

Run: `grep -n "invalidate(QK.transacciones)" src/hooks/useFinanceDataSupabase.ts`
Expected: ninguna línea.

- [ ] **Step 4: Resumen móvil**

En `src/pages/movil/ResumenMovil.tsx`:

```ts
  const { accounts, transactions, patrimonio, loading } = useFinanceDataSupabase();
```

```ts
  const metrics = useMemo(
    () => computeDashboardMetrics(accounts, transactions, patrimonio, convertCurrency, currency),
    [accounts, transactions, patrimonio, convertCurrency, currency],
```

- [ ] **Step 5: Compilar y pasar los tests**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx vitest run`
Expected: sin errores; todos los tests en verde.

- [ ] **Step 6: Comprobación temporal de paridad de saldos**

Añade **temporalmente** en `useFinanceDataSupabase`, después del `useEffect` de `loadError`. Necesita volver a importar `computeAccountBalances`:

```ts
  // TEMPORAL (tarea 3, paso 8 lo borra): saldos de la vista vs cálculo anterior.
  useEffect(() => {
    if (!import.meta.env.DEV || loading) return;
    const anteriores = computeAccountBalances(accounts, transactions);
    const descuadres = anteriores.filter((a) => {
      const vista = accounts.find((v) => v.id === a.id)?.saldoActual ?? NaN;
      return !(Math.abs(vista - a.saldoActual) < 0.005);
    });
    console.info(
      descuadres.length ? `[paridad] ${descuadres.length} cuentas no cuadran` : `[paridad] saldos OK (${accounts.length} cuentas)`,
      descuadres.map((d) => d.nombre),
    );
  }, [loading, accounts, transactions]);
```

Arranca el servidor de desarrollo con `preview_start` (si `.claude/launch.json` no tiene una entrada para `npm run dev`, créala) y pide al usuario que **inicie sesión él mismo** en la pestaña de localhost. Nunca escribas su contraseña. Después:

1. `read_console_messages` con el patrón `[paridad]`. Expected: `[paridad] saldos OK (N cuentas)`.
2. Pide al usuario que abra `https://savium.manoloto.com` (código anterior) y `localhost` (código nuevo) en el Resumen de escritorio, con la misma divisa, y compare **Activos, Pasivos y Patrimonio neto**. Deben coincidir exactamente. Contrasta también los importes por divisa con la verificación 1 de la tarea 1.
3. En localhost, pide al usuario que apunte una transacción de prueba de 1 MXN en una cuenta, compruebe que su saldo y el patrimonio cambian en 1 sin recargar la página, y luego la borre (Review Focus 2).

Si algo no cuadra, **para**, no hagas commit e informa al usuario con las cuentas o rubros afectados.

- [ ] **Step 7: Esperar el visto bueno del usuario**

No sigas sin que el usuario confirme que las cifras coinciden.

- [ ] **Step 8: Quitar la comprobación temporal y `computeAccountBalances`**

1. Borra el `useEffect` temporal y el import de `computeAccountBalances` del hook.
2. Borra `computeAccountBalances` de `src/lib/finance/calculations.ts` (líneas 3-10) y su `describe('computeAccountBalances', …)` de `calculations.test.ts`, junto con los imports que queden sin usar (`Account` y el helper `account`, si ya nadie los usa).

Run: `grep -rn "computeAccountBalances" src`
Expected: ninguna línea.

Run: `npx tsc --noEmit -p tsconfig.app.json && npx vitest run`
Expected: sin errores; todos en verde.

- [ ] **Step 9: Commit (tareas 2 y 3 juntas)**

```bash
git add src/lib/finance/patrimonio.ts src/lib/finance/patrimonio.test.ts src/lib/finance/dashboardMetrics.ts src/lib/finance/dashboardMetrics.test.ts src/lib/finance/queryKeys.ts src/lib/finance/queries.ts src/lib/finance/calculations.ts src/lib/finance/calculations.test.ts src/hooks/useFinanceDataSupabase.ts src/pages/movil/ResumenMovil.tsx
git commit -m "Saldos y patrimonio salen de las vistas de Postgres en lugar de calcularse en el navegador

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Conversión de divisas pura y vencidos con fecha local

**Files:**
- Modify: `src/lib/finance/currency.ts` (nuevo `convertWithRates`)
- Modify: `src/lib/finance/currency.test.ts`
- Modify: `src/hooks/useExchangeRates.ts:45-52`
- Modify: `src/lib/finance/pendingsSummary.ts:31-36`
- Modify: `src/lib/finance/pendingsSummary.test.ts`
- Modify: `src/hooks/usePendings.ts:148-156`

**Interfaces:**
- Produces:
  - `type Tasas = Record<CurrencyCode, number>`, en MXN por unidad.
  - `convertWithRates(amount: number, from: CurrencyCode, to: CurrencyCode, tasas: Tasas): number`.
  - `isPendingOverdue` con la misma firma, ahora con fecha local.

- [ ] **Step 1: Tests que fallan**

Añade a `src/lib/finance/currency.test.ts`. Ajusta el import existente para que incluya `convertWithRates`:

```ts
describe('convertWithRates', () => {
  const tasas = { MXN: 1, USD: 20, EUR: 22 };
  it('convierte siempre pasando por MXN', () => {
    expect(convertWithRates(100, 'USD', 'MXN', tasas)).toBe(2000);
    expect(convertWithRates(2200, 'MXN', 'EUR', tasas)).toBe(100);
    expect(convertWithRates(100, 'USD', 'EUR', tasas)).toBeCloseTo(90.9090909, 6);
  });
  it('misma divisa devuelve el importe tal cual', () => {
    expect(convertWithRates(5, 'EUR', 'EUR', tasas)).toBe(5);
  });
});
```

Añade a `src/lib/finance/pendingsSummary.test.ts`, dentro de `describe('isPendingOverdue')`:

```ts
  it('lo que vence hoy no está vencido; lo de ayer sí (fecha local, no UTC)', () => {
    const now = new Date(2026, 8, 15, 12, 0);
    expect(isPendingOverdue(pending({ fecha_esperada: '2026-09-15' }), now)).toBe(false);
    expect(isPendingOverdue(pending({ fecha_esperada: '2026-09-14' }), now)).toBe(true);
  });
```

- [ ] **Step 2: Ejecutarlos y ver que fallan**

Run: `npx vitest run src/lib/finance/currency.test.ts src/lib/finance/pendingsSummary.test.ts`
Expected: FAIL. `convertWithRates` no existe, y en México el caso `'2026-09-15'` da `true`.

- [ ] **Step 3: Implementar**

En `src/lib/finance/currency.ts`:

```ts
/** Tasas en MXN por unidad de cada divisa (MXN = 1). */
export type Tasas = Record<CurrencyCode, number>;

/** Conversión entre divisas pasando siempre por MXN. Misma regla en la app iOS (shared/fixtures/divisas.json). */
export const convertWithRates = (amount: number, from: CurrencyCode, to: CurrencyCode, tasas: Tasas): number => {
  if (from === to) return amount;
  const enMXN = from !== 'MXN' ? amount * tasas[from] : amount;
  return to === 'MXN' ? enMXN : enMXN / tasas[to];
};
```

En `src/hooks/useExchangeRates.ts`, importa `convertWithRates` desde `@/lib/finance/currency` y sustituye el cuerpo del `useCallback` de `convertCurrency`:

```ts
  const convertCurrency = useCallback(
    (amount: number, fromCurrency: 'MXN' | 'USD' | 'EUR', toCurrency: 'MXN' | 'USD' | 'EUR'): number =>
      convertWithRates(amount, fromCurrency, toCurrency, rates),
    [rates]
  );
```

En `src/lib/finance/pendingsSummary.ts`, importa `parseFechaLocal` desde `./fechas` y cambia `isPendingOverdue`:

```ts
/** Vencido: fecha_esperada (día local) anterior a hoy. Lo que vence hoy aún no está vencido. */
export const isPendingOverdue = (p: { fecha_esperada: string | null }, now: Date): boolean => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return !!p.fecha_esperada && parseFechaLocal(p.fecha_esperada) < today;
};
```

En `src/hooks/usePendings.ts`, sustituye el cálculo de `overdueCount` (≈ líneas 148-156) para que use la misma regla:

```ts
  const overdueCount = useMemo(() => {
    const now = new Date();
    return pendings.filter((p) => isPendingActive(p) && isPendingOverdue(p, now)).length;
  }, [pendings]);
```

Importa `isPendingActive, isPendingOverdue` desde `@/lib/finance/pendingsSummary`. Antes de reemplazarlo, lee el código actual de `overdueCount`: si filtra por `estado` de otra forma que no sea `pendiente`/`cobrado_parcial`, **para** y avisa, porque la regla cambiaría.

- [ ] **Step 4: Tests y compilador**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance/currency.ts src/lib/finance/currency.test.ts src/hooks/useExchangeRates.ts src/lib/finance/pendingsSummary.ts src/lib/finance/pendingsSummary.test.ts src/hooks/usePendings.ts
git commit -m "Lo que vence hoy ya no sale como vencido; conversión de divisas en función pura

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Fixtures compartidos, zona horaria de los tests y deploy

**Files:**
- Create: `shared/fixtures/divisas.json`, `shared/fixtures/vencidos.json`, `shared/fixtures/suscripciones.json`, `shared/fixtures/mes_anterior.json`, `shared/fixtures/cxp.json`, `shared/fixtures/README.md`
- Create: `src/lib/finance/fixturesCompartidos.test.ts`
- Modify: `vite.config.ts` (zona horaria de los tests)
- Modify: `tsconfig.app.json` (`resolveJsonModule`)
- Modify: `.github/workflows/static.yml` (`paths-ignore`)

**Interfaces:**
- Consumes: `convertWithRates` y `Tasas` (tarea 4); `computePendingsSummary`; `computeSubscriptionsSummary` y `estadoSuscripcion`; `computeDashboardMetrics` con la firma de la tarea 2; `computeCxP`.
- Produces: el formato de fixture que el plan 2 leerá desde Swift.
  - `now`: hora local sin zona, en formato `YYYY-MM-DDTHH:mm:ss`, siempre a las 12:00.
  - Fechas de entrada: `YYYY-MM-DD`. Las de transacciones se interpretan como medianoche UTC (igual que `mapTransactions`) y las demás como día local.
  - Fechas de salida: `YYYY-MM-DD` del día de calendario.
  - `tasas`: MXN por unidad.

- [ ] **Step 1: Fijar la zona horaria de los tests y activar JSON**

En `vite.config.ts`, justo después de los imports:

```ts
// Los tests (y los fixtures compartidos con la app iOS) asumen la zona del usuario.
process.env.TZ = 'America/Mexico_City';
```

En `tsconfig.app.json`, dentro de `compilerOptions`, añade `"resolveJsonModule": true,`.

Run: `npx vitest run`
Expected: todos en verde, igual que antes.

- [ ] **Step 2: Escribir los fixtures**

`shared/fixtures/README.md`:

```markdown
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
```

`shared/fixtures/divisas.json`:

```json
{
  "tasas": { "MXN": 1, "USD": 20, "EUR": 22 },
  "casos": [
    { "nombre": "USD a MXN", "importe": 100, "de": "USD", "a": "MXN", "esperado": 2000 },
    { "nombre": "MXN a EUR", "importe": 2200, "de": "MXN", "a": "EUR", "esperado": 100 },
    { "nombre": "USD a EUR pasa por MXN", "importe": 100, "de": "USD", "a": "EUR", "esperado": 90.9090909091 },
    { "nombre": "misma divisa", "importe": 5, "de": "EUR", "a": "EUR", "esperado": 5 }
  ]
}
```

`shared/fixtures/vencidos.json`:

```json
{
  "tasas": { "MXN": 1, "USD": 20, "EUR": 22 },
  "now": "2026-09-15T12:00:00",
  "pendientes": [
    { "id": "p1", "monto_esperado": 1000, "monto_cobrado": 0, "divisa": "MXN", "fecha_esperada": "2026-09-10", "estado": "pendiente" },
    { "id": "p2", "monto_esperado": 500, "monto_cobrado": 100, "divisa": "USD", "fecha_esperada": "2026-09-15", "estado": "cobrado_parcial" },
    { "id": "p3", "monto_esperado": 300, "monto_cobrado": 0, "divisa": "MXN", "fecha_esperada": null, "estado": "pendiente" },
    { "id": "p4", "monto_esperado": 999, "monto_cobrado": 999, "divisa": "MXN", "fecha_esperada": "2026-09-01", "estado": "cobrado" },
    { "id": "p5", "monto_esperado": 888, "monto_cobrado": 0, "divisa": "MXN", "fecha_esperada": "2026-09-02", "estado": "cancelado" },
    { "id": "p6", "monto_esperado": 200, "monto_cobrado": 0, "divisa": "EUR", "fecha_esperada": "2026-10-01", "estado": "pendiente" },
    { "id": "p7", "monto_esperado": 100, "monto_cobrado": 0, "divisa": "MXN", "fecha_esperada": "2026-09-14", "estado": "pendiente" }
  ],
  "casos": [
    { "nombre": "en MXN", "moneda": "MXN", "esperado": { "orden": ["p1", "p7", "p2", "p6", "p3"], "vencidos": ["p1", "p7"], "total": 13800 } },
    { "nombre": "en USD", "moneda": "USD", "esperado": { "orden": ["p1", "p7", "p2", "p6", "p3"], "vencidos": ["p1", "p7"], "total": 690 } }
  ]
}
```

`shared/fixtures/suscripciones.json`:

```json
{
  "now": "2026-09-15T12:00:00",
  "resumen": {
    "suscripciones": [
      { "frecuencia": "Mensual", "ultimo_pago_monto": 199 },
      { "frecuencia": "Anual", "ultimo_pago_monto": 1200 },
      { "frecuencia": "Semanal", "ultimo_pago_monto": 100 },
      { "frecuencia": "Irregular", "ultimo_pago_monto": 50 },
      { "frecuencia": "Quincenal", "ultimo_pago_monto": 10 }
    ],
    "esperado": { "estimadoMensual": 732.3333333333, "estimadas": 3, "sinEstimar": 2 }
  },
  "estados": [
    { "proximo_pago": "2026-08-30", "esperado": { "estado": "sin_cargo", "dias": -16 } },
    { "proximo_pago": "2026-08-31", "esperado": { "estado": "sin_cargo", "dias": -15 } },
    { "proximo_pago": "2026-09-01", "esperado": { "estado": "este_mes", "dias": -14 } },
    { "proximo_pago": "2026-09-10", "esperado": { "estado": "este_mes", "dias": -5 } },
    { "proximo_pago": "2026-09-30", "esperado": { "estado": "este_mes", "dias": 15 } },
    { "proximo_pago": "2026-10-02", "esperado": { "estado": "proxima", "dias": 17 } }
  ]
}
```

`shared/fixtures/mes_anterior.json`:

```json
{
  "tasas": { "MXN": 1, "USD": 20, "EUR": 22 },
  "now": "2026-09-15T12:00:00",
  "transacciones": [
    { "id": "t1", "fecha": "2026-08-10", "ingreso": 30000, "divisa": "MXN", "tipo": "Ingreso", "categoria": "Sueldo" },
    { "id": "t2", "fecha": "2026-08-12", "gasto": 1000, "divisa": "MXN", "tipo": "Gastos", "categoria": "Casa" },
    { "id": "t3", "fecha": "2026-08-13", "ingreso": 200, "divisa": "MXN", "tipo": "Gastos", "categoria": "Casa" },
    { "id": "t4", "fecha": "2026-08-20", "gasto": 50, "divisa": "USD", "tipo": "Gastos", "categoria": "Viajes" },
    { "id": "t5", "fecha": "2026-08-21", "gasto": 500000, "divisa": "MXN", "tipo": "Gastos", "categoria": "Compra Venta Inmuebles" },
    { "id": "t6", "fecha": "2026-09-05", "gasto": 999, "divisa": "MXN", "tipo": "Gastos", "categoria": "Casa" },
    { "id": "t7", "fecha": "2026-07-15", "gasto": 777, "divisa": "MXN", "tipo": "Gastos", "categoria": "Casa" }
  ],
  "casos": [
    { "nombre": "en MXN: reembolso resta del gasto, inmuebles excluidos, USD convertido", "moneda": "MXN", "esperado": { "ingresos": 30000, "gastos": 1800, "balance": 28200 } },
    { "nombre": "en USD", "moneda": "USD", "esperado": { "ingresos": 1500, "gastos": 90, "balance": 1410 } }
  ]
}
```

`shared/fixtures/cxp.json`:

```json
{
  "now": "2026-09-15T12:00:00",
  "monedaBase": "MXN",
  "casos": [
    {
      "nombre": "suscripciones: solo activas y dentro del horizonte",
      "horizonte": 30,
      "suscripciones": [
        { "id": "s1", "service_name": "Netflix", "active": true, "frecuencia": "Mensual", "proximo_pago": "2026-09-20", "ultimo_pago_monto": 199 },
        { "id": "s2", "service_name": "Inactiva", "active": false, "frecuencia": "Mensual", "proximo_pago": "2026-09-20", "ultimo_pago_monto": 50 },
        { "id": "s3", "service_name": "Pasada", "active": true, "frecuencia": "Mensual", "proximo_pago": "2026-09-10", "ultimo_pago_monto": 60 },
        { "id": "s4", "service_name": "Lejana", "active": true, "frecuencia": "Mensual", "proximo_pago": "2026-11-01", "ultimo_pago_monto": 70 }
      ],
      "esperado": [
        { "id": "sub-s1", "concepto": "Netflix", "tipo": "Suscripción", "monto": 199, "divisa": "MXN", "fecha": "2026-09-20", "detalle": "Mensual" }
      ]
    },
    {
      "nombre": "pago anual: último pago + 1 año, con su divisa",
      "horizonte": 30,
      "categorias": [
        { "id": "seg", "categoria": "Seguros", "subcategoria": "Coche", "tipo": "Gastos", "frecuencia_seguimiento": "anual" }
      ],
      "transacciones": [
        { "id": "t1", "fecha": "2025-09-25", "gasto": 12000, "divisa": "USD", "subcategoriaId": "seg" }
      ],
      "esperado": [
        { "id": "anual-seg", "concepto": "Seguros · Coche", "tipo": "Pago anual", "monto": 12000, "divisa": "USD", "fecha": "2026-09-25", "detalle": "Estimado según último pago" }
      ]
    },
    {
      "nombre": "tarjetas: solo con deuda de al menos un céntimo y no vendidas, a 15 días",
      "horizonte": 30,
      "cuentas": [
        { "id": "tc", "nombre": "Visa", "tipo": "Tarjeta de Crédito", "saldoActual": -1234.5, "divisa": "MXN" },
        { "id": "tc2", "nombre": "Amex", "tipo": "Tarjeta de Crédito", "saldoActual": -0.004, "divisa": "MXN" },
        { "id": "tc3", "nombre": "Vieja", "tipo": "Tarjeta de Crédito", "saldoActual": -100, "divisa": "MXN", "vendida": true },
        { "id": "b1", "nombre": "Banco", "tipo": "Banco", "saldoActual": -50, "divisa": "MXN" }
      ],
      "esperado": [
        { "id": "card-tc", "concepto": "Visa", "tipo": "Tarjeta de crédito", "monto": 1234.5, "divisa": "MXN", "fecha": "2026-09-30", "detalle": "Saldo pendiente actual" }
      ]
    },
    {
      "nombre": "préstamos: cuota mensual si el último pago es reciente al corte",
      "horizonte": 30,
      "categorias": [
        { "id": "pr", "categoria": "Deudas", "subcategoria": "Préstamo coche", "tipo": "Gastos" },
        { "id": "pr2", "categoria": "Hogar", "subcategoria": "Hipoteca casa", "tipo": "Gastos" }
      ],
      "transacciones": [
        { "id": "t1", "fecha": "2026-08-20", "gasto": 5000, "divisa": "MXN", "subcategoriaId": "pr" },
        { "id": "t2", "fecha": "2026-06-10", "gasto": 9000, "divisa": "MXN", "subcategoriaId": "pr2" }
      ],
      "esperado": [
        { "id": "loan-pr", "concepto": "Deudas · Préstamo coche", "tipo": "Préstamo", "monto": 5000, "divisa": "MXN", "fecha": "2026-09-20", "detalle": "Cuota estimada" }
      ]
    },
    {
      "nombre": "recurrente mensual: promedio de los dos últimos pagos",
      "horizonte": 30,
      "categorias": [
        { "id": "int", "categoria": "Servicios", "subcategoria": "Internet", "tipo": "Gastos" }
      ],
      "transacciones": [
        { "id": "t1", "fecha": "2026-06-05", "gasto": 500, "divisa": "MXN", "subcategoriaId": "int" },
        { "id": "t2", "fecha": "2026-07-05", "gasto": 520, "divisa": "MXN", "subcategoriaId": "int" },
        { "id": "t3", "fecha": "2026-08-05", "gasto": 540, "divisa": "MXN", "subcategoriaId": "int" }
      ],
      "esperado": [
        { "id": "rec-int-MXN", "concepto": "Servicios · Internet", "tipo": "Recurrente mensual", "monto": 530, "divisa": "MXN", "fecha": "2026-10-05", "detalle": "mensual · prom. últimos 2" }
      ]
    },
    {
      "nombre": "orden por fecha estimada entre fuentes",
      "horizonte": 30,
      "suscripciones": [
        { "id": "s1", "service_name": "Netflix", "active": true, "frecuencia": "Mensual", "proximo_pago": "2026-09-20", "ultimo_pago_monto": 199 }
      ],
      "categorias": [
        { "id": "seg", "categoria": "Seguros", "subcategoria": "Coche", "tipo": "Gastos", "frecuencia_seguimiento": "anual" }
      ],
      "transacciones": [
        { "id": "t1", "fecha": "2025-09-25", "gasto": 12000, "divisa": "USD", "subcategoriaId": "seg" }
      ],
      "cuentas": [
        { "id": "tc", "nombre": "Visa", "tipo": "Tarjeta de Crédito", "saldoActual": -1234.5, "divisa": "MXN" }
      ],
      "esperadoIds": ["sub-s1", "anual-seg", "card-tc"]
    }
  ]
}
```

- [ ] **Step 3: Escribir el test que recorre los fixtures**

`src/lib/finance/fixturesCompartidos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Account, AccountType, Category, Transaction, TransactionType } from '@/types/finance';
import divisas from '../../../shared/fixtures/divisas.json';
import vencidos from '../../../shared/fixtures/vencidos.json';
import suscripciones from '../../../shared/fixtures/suscripciones.json';
import mesAnterior from '../../../shared/fixtures/mes_anterior.json';
import cxp from '../../../shared/fixtures/cxp.json';
import { convertWithRates, Tasas } from './currency';
import { ConvertCurrency, CurrencyCode, computeDashboardMetrics } from './dashboardMetrics';
import { computePendingsSummary, PendingForSummary } from './pendingsSummary';
import { computeSubscriptionsSummary, estadoSuscripcion } from './subscriptionsSummary';
import { computeCxP, CxPSubscription } from './cxp';

// Contrato con la app iOS: ver shared/fixtures/README.md.
const TOL = 6; // decimales de tolerancia (1e-6)

const convertir = (tasas: Tasas): ConvertCurrency => (importe, de, a) => convertWithRates(importe, de, a, tasas);

/** 'YYYY-MM-DDTHH:mm:ss' sin zona → Date local (ECMAScript lo interpreta como hora local). */
const ahora = (s: string) => new Date(s);

/** Día de calendario de una fecha de salida. Sirve igual para medianoche UTC (transacciones)
 *  y para fechas locales de mediodía o medianoche en UTC−6. */
const dia = (d: Date) => d.toISOString().slice(0, 10);

type TxFixture = {
  id: string; fecha: string; ingreso?: number; gasto?: number; divisa?: string;
  subcategoriaId?: string; tipo?: string; categoria?: string;
};

/** Igual que mapTransactions: `fecha` a medianoche UTC. */
const tx = (f: TxFixture): Transaction => ({
  id: f.id, cuentaId: 'a1', fecha: new Date(f.fecha), comentario: '',
  ingreso: f.ingreso ?? 0, gasto: f.gasto ?? 0, monto: (f.ingreso ?? 0) - (f.gasto ?? 0),
  subcategoriaId: f.subcategoriaId ?? 'c1', divisa: (f.divisa ?? 'MXN') as CurrencyCode,
  tipo: f.tipo as TransactionType | undefined, categoria: f.categoria,
});

describe('fixtures compartidos · divisas', () => {
  divisas.casos.forEach((c) => {
    it(c.nombre, () => {
      expect(convertWithRates(c.importe, c.de as CurrencyCode, c.a as CurrencyCode, divisas.tasas)).toBeCloseTo(c.esperado, TOL);
    });
  });
});

describe('fixtures compartidos · vencidos', () => {
  vencidos.casos.forEach((c) => {
    it(c.nombre, () => {
      const r = computePendingsSummary(vencidos.pendientes as PendingForSummary[], convertir(vencidos.tasas), c.moneda as CurrencyCode, ahora(vencidos.now));
      expect(r.rows.map((x) => x.pending.id)).toEqual(c.esperado.orden);
      expect(r.rows.filter((x) => x.vencido).map((x) => x.pending.id)).toEqual(c.esperado.vencidos);
      expect(r.total).toBeCloseTo(c.esperado.total, TOL);
    });
  });
});

describe('fixtures compartidos · suscripciones', () => {
  it('estimado mensual', () => {
    const r = computeSubscriptionsSummary(suscripciones.resumen.suscripciones);
    expect(r.estimadoMensual).toBeCloseTo(suscripciones.resumen.esperado.estimadoMensual, TOL);
    expect(r.estimadas).toBe(suscripciones.resumen.esperado.estimadas);
    expect(r.sinEstimar).toBe(suscripciones.resumen.esperado.sinEstimar);
  });
  suscripciones.estados.forEach((c) => {
    it(`estado de ${c.proximo_pago}`, () => {
      expect(estadoSuscripcion(c.proximo_pago, ahora(suscripciones.now))).toEqual(c.esperado);
    });
  });
});

describe('fixtures compartidos · mes anterior', () => {
  mesAnterior.casos.forEach((c) => {
    it(c.nombre, () => {
      const m = computeDashboardMetrics([], mesAnterior.transacciones.map(tx), [], convertir(mesAnterior.tasas), c.moneda as CurrencyCode, ahora(mesAnterior.now));
      expect(m.ingresosMesAnterior).toBeCloseTo(c.esperado.ingresos, TOL);
      expect(m.gastosMesAnterior).toBeCloseTo(c.esperado.gastos, TOL);
      expect(m.balanceMesAnterior).toBeCloseTo(c.esperado.balance, TOL);
    });
  });
});

type CuentaFixture = { id: string; nombre: string; tipo: string; saldoActual: number; divisa: string; vendida?: boolean };
type CategoriaFixture = { id: string; categoria: string; subcategoria: string; tipo: string; frecuencia_seguimiento?: string };
type CasoCxP = {
  nombre: string; horizonte: number;
  suscripciones?: CxPSubscription[]; categorias?: CategoriaFixture[];
  transacciones?: TxFixture[]; cuentas?: CuentaFixture[];
  esperado?: { id: string; concepto: string; tipo: string; monto: number; divisa: string; fecha: string; detalle: string }[];
  esperadoIds?: string[];
};

describe('fixtures compartidos · por pagar', () => {
  cxp.casos.forEach((c) => {
    it(c.nombre, () => {
      const caso = c as unknown as CasoCxP;
      const rows = computeCxP({
        subscriptions: caso.suscripciones ?? [],
        categories: (caso.categorias ?? []).map((k) => ({ ...k, tipo: k.tipo as TransactionType }) as Category),
        transactions: (caso.transacciones ?? []).map(tx),
        accounts: (caso.cuentas ?? []).map((a) => ({
          ...a, tipo: a.tipo as AccountType, divisa: a.divisa as CurrencyCode, saldoInicial: 0, vendida: a.vendida ?? false,
        }) as Account),
        horizonte: caso.horizonte,
        baseCurrency: cxp.monedaBase as CurrencyCode,
        now: ahora(cxp.now),
      });
      if (caso.esperadoIds) {
        expect(rows.map((r) => r.id)).toEqual(caso.esperadoIds);
        return;
      }
      expect(rows.map((r) => ({ id: r.id, concepto: r.concepto, tipo: r.tipo, monto: r.monto, divisa: r.divisa, fecha: dia(r.fechaEstimada), detalle: r.detalle })))
        .toEqual((caso.esperado ?? []).map((e) => ({ ...e, monto: expect.closeTo(e.monto, TOL) })));
    });
  });
});
```

- [ ] **Step 4: Ejecutar**

Run: `npx vitest run src/lib/finance/fixturesCompartidos.test.ts`
Expected: PASS. Son 4 + 2 + 7 + 2 + 6 = 21 tests.

**Si alguno falla:** la referencia es el código TypeScript actual, no el fixture. Revisa a mano el cálculo del caso contra la función. Si el fixture está mal, corrige el fixture. **No cambies código de `src/lib/finance` para que pase un fixture**, salvo `isPendingOverdue` (ya hecho en la tarea 4). Si el fallo revela un comportamiento dudoso de la web, para e infórmalo.

- [ ] **Step 5: Que un push que solo toque la app no redespliegue la web**

En `.github/workflows/static.yml`, cambia el bloque `on:` a:

```yaml
on:
  push:
    branches: [ main ]
    paths-ignore:
      - 'ios/**'
      - 'shared/**'
```

- [ ] **Step 6: Verificación completa**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm run build`
Expected: todo en verde. El build no incluye `shared/` (compruébalo: `ls dist | grep -c shared` debe dar `0`).

- [ ] **Step 7: Commit**

```bash
git add shared/fixtures src/lib/finance/fixturesCompartidos.test.ts vite.config.ts tsconfig.app.json .github/workflows/static.yml
git commit -m "Fixtures compartidos con la app iOS para vencidos, Por pagar, suscripciones, mes anterior y divisas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cierre

- [ ] **Step 1: Verificación final**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm run build`
Expected: todo en verde.

- [ ] **Step 2: Informar al usuario**

Resume para el usuario:
- Los commits hechos.
- Que la migración está aplicada.
- El resultado de la paridad de la tarea 3.
- El cambio visible: lo que vence hoy ya no sale como vencido.

Recuérdale que **nada está publicado** hasta que haga push. Ojo: si hace push del commit de la tarea 3 sin que la migración esté aplicada en Supabase, la web de producción falla al cargar las cuentas. En este plan la migración ya está aplicada desde la tarea 1.
