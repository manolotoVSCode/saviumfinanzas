# «Para mi familia» — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/familia` (solo escritorio) con la información que la familia necesitaría si el usuario falta: carta, contactos, seguros, patrimonio automático con notas, pagos a mantener/cancelar, documentos; guardado automático con control de concurrencia y alerta de revisión cada 180 días.

**Architecture:** Una fila JSONB por usuario en `informacion_familia`. Lógica pura en `src/lib/finance/familia.ts` (documento, revisión) y `src/lib/finance/familiaResumen.ts` (cálculos sobre datos existentes), testeada con vitest. `useInformacionFamilia` habla con Supabase; `useEditorFamilia` mantiene el estado local único y el autoguardado; los componentes de `src/components/familia/` solo pintan.

**Tech Stack:** React 18 + Vite + TypeScript, TanStack Query, Supabase (supabase-js / PostgREST), shadcn/ui, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-para-mi-familia-design.md`

## Global Constraints

- Todo el texto de UI, nombres de funciones nuevas y commits en **español**.
- Commits por tema, terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Nunca `git push`** (dispara el deploy); lo decide el usuario.
- La migración SQL se escribe en `supabase/migrations/`; **el usuario la ejecuta** en el SQL Editor. No intentes aplicarla.
- Nunca se guardan contraseñas, NIP ni frases semilla: los avisos de la UI lo recuerdan (textos exactos en las tareas).
- El total de patrimonio debe coincidir con el último punto de `computeNetWorthHistory` (Informes › Patrimonio Neto).
- Nada escrito a mano se pierde en silencio (normalización, huérfanas, conflictos).
- Verificación por tarea: `npx vitest run` (hoy 172 tests verdes) y `npx tsc --noEmit -p tsconfig.app.json`. Al final además `npm run build`.
- Convención de fechas del repo (`src/lib/finance/fechas.ts`): `toFechaISO` = fecha local `YYYY-MM-DD`; `diasHasta(iso, now)` = días naturales locales; `Transaction.fecha` es medianoche UTC.

---

### Task 1: Migración, tipos de Supabase y claves de caché

**Files:**
- Create: `supabase/migrations/20260930120000_informacion_familia.sql`
- Modify: `src/integrations/supabase/types.ts` (insertar la tabla justo antes de `      inversiones: {`, ~l.239)
- Modify: `src/lib/finance/queryKeys.ts:5-19`

**Interfaces:**
- Produces: tabla `informacion_familia(user_id PK, contenido jsonb, revisado_at timestamptz null, updated_at timestamptz)`; claves `financeQueryKeys(uid).informacionFamilia` y `.revisionFamilia`.

- [ ] **Step 1: Escribir la migración**

```sql
-- Información para la familia ("Para mi familia"): un documento JSONB por usuario.
-- updated_at lo mantiene el trigger (DEFAULT solo actúa al insertar) y sirve de
-- control de concurrencia: el cliente actualiza con .eq('updated_at', leído).
CREATE TABLE public.informacion_familia (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
  revisado_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.informacion_familia TO authenticated;
GRANT ALL ON public.informacion_familia TO service_role;

ALTER TABLE public.informacion_familia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own family info"
  ON public.informacion_familia FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_informacion_familia_updated_at
  BEFORE UPDATE ON public.informacion_familia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

- [ ] **Step 2: Añadir la tabla a los tipos generados** (antes de `      inversiones: {`)

```ts
      informacion_familia: {
        Row: {
          contenido: Json
          revisado_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contenido?: Json
          revisado_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contenido?: Json
          revisado_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
```

- [ ] **Step 3: Claves de caché** — en `financeQueryKeys`, tras `alertDismissals`:

```ts
  informacionFamilia: ['finance', userId, 'informacionFamilia'] as const,
  /** Solo revisado_at: la usa useAlerts en todas las páginas sin cargar el contenido. */
  revisionFamilia: ['finance', userId, 'revisionFamilia'] as const,
```

- [ ] **Step 4: Verificar** — `npx tsc --noEmit -p tsconfig.app.json` → sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260930120000_informacion_familia.sql src/integrations/supabase/types.ts src/lib/finance/queryKeys.ts
git commit -m "Tabla informacion_familia con RLS y trigger de updated_at

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `saldosAlCierre` y constantes de clasificación exportadas

**Files:**
- Modify: `src/lib/finance/netWorthHistory.ts:18-19` y añadir función al final
- Test: `src/lib/finance/netWorthHistory.test.ts` (añadir `describe`)

**Interfaces:**
- Produces: `export const ASSET_TYPES: Set<string>`, `export const LIABILITY_TYPES: Set<string>`, `export const saldosAlCierre(accounts: Account[], transactions: Transaction[], cierre: Date): Map<string, number>` (saldo en la divisa de la cuenta, **todas** las cuentas recibidas).

- [ ] **Step 1: Test que falla** — añadir al final de `netWorthHistory.test.ts` (y `saldosAlCierre` al import):

```ts
describe('saldosAlCierre', () => {
  it('suma saldo inicial y movimientos hasta el cierre incluido, sin los posteriores', () => {
    const cierre = new Date(2026, 8, 30, 23, 59, 59, 999);
    const s = saldosAlCierre(
      [account({ id: 'a1', saldoInicial: 100 }), account({ id: 'a2', saldoInicial: 5 })],
      [
        tx({ cuentaId: 'a1', monto: 50, fecha: new Date(2026, 8, 30, 12) }),
        tx({ cuentaId: 'a1', monto: 7, fecha: new Date(2026, 9, 1) }),
        tx({ cuentaId: 'zz', monto: 1, fecha: new Date(2026, 8, 1) }),
      ],
      cierre
    );
    expect(s.get('a1')).toBe(150);
    expect(s.get('a2')).toBe(5);
    expect(s.has('zz')).toBe(false);
  });

  it('al cierre del mes en curso coincide con el último punto del histórico', () => {
    const accounts = [
      account({ id: 'b', tipo: 'Banco', saldoInicial: 1000 }),
      account({ id: 'tc', tipo: 'Tarjeta de Crédito', saldoInicial: -300 }),
    ];
    const txs = [tx({ cuentaId: 'b', monto: 200, fecha: new Date(2026, 8, 10) })];
    const s = saldosAlCierre(accounts, txs, new Date(2026, 9, 0, 23, 59, 59, 999));
    const last = computeNetWorthHistory(accounts, txs, convert, 'MXN', NOW).at(-1)!;
    expect((s.get('b') ?? 0) - Math.abs(Math.min(0, s.get('tc') ?? 0))).toBe(last.patrimonio);
  });
});
```

- [ ] **Step 2: Ejecutar** — `npx vitest run src/lib/finance/netWorthHistory.test.ts` → FAIL (`saldosAlCierre` no exportado).

- [ ] **Step 3: Implementar** — cambiar `const ASSET_TYPES` / `const LIABILITY_TYPES` por `export const` y añadir al final del archivo:

```ts
/**
 * Saldo de cada cuenta (en su divisa) al instante `cierre`, incluido:
 * saldoInicial + Σ movimientos con fecha ≤ cierre. Misma regla que
 * computeNetWorthHistory; con el cierre del mes en curso da su último punto.
 */
export const saldosAlCierre = (accounts: Account[], transactions: Transaction[], cierre: Date): Map<string, number> => {
  const saldos = new Map<string, number>(accounts.map(a => [a.id, a.saldoInicial]));
  for (const t of transactions) {
    if (t.fecha > cierre || !saldos.has(t.cuentaId)) continue;
    saldos.set(t.cuentaId, saldos.get(t.cuentaId)! + t.monto);
  }
  return saldos;
};
```

- [ ] **Step 4: Ejecutar** — `npx vitest run src/lib/finance/netWorthHistory.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance/netWorthHistory.ts src/lib/finance/netWorthHistory.test.ts
git commit -m "saldosAlCierre: saldo por cuenta a una fecha, con la regla del patrimonio neto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Documento familiar — tipos, normalización, edición y revisión (`familia.ts`)

**Files:**
- Create: `src/lib/finance/familia.ts`
- Test: `src/lib/finance/familia.test.ts`

**Interfaces:**
- Consumes: `diasHasta`, `toFechaISO` de `./fechas`.
- Produces (todo exportado):
  - Tipos `Divisa`, `Contacto`, `Seguro`, `Documento`, `DecisionPago`, `InfoFamilia` (formas del spec, con `extra: Record<string, unknown>`), `EstadoRevision = 'sin_datos' | 'al_dia' | 'vencida'`, `EstadoVencimiento = 'sin_fecha' | 'vigente' | 'proxima' | 'vencida'`, `NotaHuerfana = { origen: 'nota' | 'pago'; clave: string; texto: string }`.
  - `DIAS_REVISION = 180`, `DIAS_AVISO_VENCIMIENTO = 30`.
  - `infoFamiliaVacia(): InfoFamilia`, `normalizarInfoFamilia(raw: unknown): InfoFamilia`, `serializarInfoFamilia(info: InfoFamilia): Record<string, unknown>`.
  - `nuevoContacto(): Contacto`, `nuevoSeguro(): Seguro`, `nuevoDocumento(): Documento`.
  - `conNota(d, clave, texto): InfoFamilia`, `conDecision(d, clave, p: DecisionPago): InfoFamilia`, `sinHuerfana(d, h: NotaHuerfana): InfoFamilia`.
  - `diasDesdeRevision(revisadoAt: string, now?: Date): number`, `estadoRevision(revisadoAt: string | null, now?: Date): EstadoRevision`, `estadoVencimientoSeguro(vencimiento: string | null, now?: Date): EstadoVencimiento`.
  - `esTablaInexistente(error: unknown): boolean`.

- [ ] **Step 1: Tests que fallan** — `src/lib/finance/familia.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  conDecision, conNota, diasDesdeRevision, esTablaInexistente, estadoRevision, estadoVencimientoSeguro,
  infoFamiliaVacia, normalizarInfoFamilia, serializarInfoFamilia, sinHuerfana,
} from './familia';

const NOW = new Date(2026, 8, 30, 12); // 30 sep 2026, hora local

describe('normalizarInfoFamilia', () => {
  it('null, undefined y {} dan el documento vacío', () => {
    expect(normalizarInfoFamilia(null)).toEqual(infoFamiliaVacia());
    expect(normalizarInfoFamilia(undefined)).toEqual(infoFamiliaVacia());
    expect(normalizarInfoFamilia({})).toEqual(infoFamiliaVacia());
  });

  it('repara campos faltantes, convierte escalares a texto y asigna id', () => {
    const info = normalizarInfoFamilia({ carta: 'Paso 1', contactos: [{ nombre: 'Ana', telefono: 5512345678 }] });
    expect(info.carta).toBe('Paso 1');
    expect(info.contactos[0]).toMatchObject({ nombre: 'Ana', telefono: '5512345678', rol: '', email: '', nota: '' });
    expect(info.contactos[0].id).toMatch(/.+/);
  });

  it('repara seguros: suma numérica o null, divisa válida, vencimiento YYYY-MM-DD', () => {
    const [s] = normalizarInfoFamilia({ seguros: [{ id: 's1', sumaAsegurada: '1500000', divisa: 'GBP', vencimiento: '31/12/2026' }] }).seguros;
    expect(s).toMatchObject({ id: 's1', sumaAsegurada: 1500000, divisa: 'MXN', vencimiento: null, tipo: '', comoReclamar: '' });
    const [t] = normalizarInfoFamilia({ seguros: [{ sumaAsegurada: 'mucho', divisa: 'USD', vencimiento: '2027-01-15' }] }).seguros;
    expect(t).toMatchObject({ sumaAsegurada: null, divisa: 'USD', vencimiento: '2027-01-15' });
  });

  it('lo irreparable va a extra._irreparables y las claves desconocidas a extra', () => {
    const info = normalizarInfoFamilia({
      contactos: ['texto suelto', { nombre: 'Ana' }],
      documentos: 'no es lista',
      notasPatrimonio: { 'cuenta:a': 'ok', 'cuenta:b': { raro: 1 } },
      pagos: { 'sub:x': 'mantener' },
      futuro: 42,
    });
    expect(info.contactos).toHaveLength(1);
    expect(info.documentos).toEqual([]);
    expect(info.notasPatrimonio).toEqual({ 'cuenta:a': 'ok' });
    expect(info.pagos).toEqual({});
    expect(info.extra.futuro).toBe(42);
    expect(info.extra._irreparables).toEqual({
      contactos: ['texto suelto'],
      documentos: ['no es lista'],
      notasPatrimonio: [{ clave: 'cuenta:b', valor: { raro: 1 } }],
      pagos: [{ clave: 'sub:x', valor: 'mantener' }],
    });
  });

  it('una decisión desconocida queda en null conservando la nota', () => {
    expect(normalizarInfoFamilia({ pagos: { 'sub:x': { decision: 'vender', nota: 'ver' } } }).pagos['sub:x'])
      .toEqual({ decision: null, nota: 'ver' });
  });

  it('una raíz que no es objeto se conserva', () => {
    expect(normalizarInfoFamilia('texto').extra._irreparables).toEqual({ raiz: ['texto'] });
  });

  it('ida y vuelta es idempotente y no pierde nada', () => {
    const raw = { carta: 'Hola', contactos: [{ id: 'c1', nombre: 'Ana' }, 7], futuro: { a: 1 }, _irreparables: { seguros: ['viejo'] } };
    const una = normalizarInfoFamilia(raw);
    const dos = normalizarInfoFamilia(serializarInfoFamilia(una));
    expect(dos).toEqual(una);
    expect(una.extra._irreparables).toEqual({ seguros: ['viejo'], contactos: [7] });
    expect(serializarInfoFamilia(una).futuro).toEqual({ a: 1 });
  });
});

describe('edición', () => {
  it('conNota añade y, con texto vacío, borra la clave', () => {
    const d = conNota(infoFamiliaVacia(), 'cuenta:a', 'beneficiaria: Ana');
    expect(d.notasPatrimonio).toEqual({ 'cuenta:a': 'beneficiaria: Ana' });
    expect(conNota(d, 'cuenta:a', '').notasPatrimonio).toEqual({});
  });

  it('conDecision guarda y, sin decisión ni nota, borra la clave', () => {
    const d = conDecision(infoFamiliaVacia(), 'sub:x', { decision: 'cancelar', nota: '' });
    expect(d.pagos['sub:x']).toEqual({ decision: 'cancelar', nota: '' });
    expect(conDecision(d, 'sub:x', { decision: null, nota: '' }).pagos).toEqual({});
  });

  it('sinHuerfana borra de notas o de pagos según el origen', () => {
    let d = conNota(infoFamiliaVacia(), 'cuenta:a', 'x');
    d = conDecision(d, 'sub:x', { decision: 'mantener', nota: '' });
    expect(sinHuerfana(d, { origen: 'nota', clave: 'cuenta:a', texto: 'x' }).notasPatrimonio).toEqual({});
    expect(sinHuerfana(d, { origen: 'pago', clave: 'sub:x', texto: '' }).pagos).toEqual({});
  });
});

describe('revisión', () => {
  const hace = (dias: number) => new Date(2026, 8, 30 - dias, 23, 30).toISOString();

  it('sin fecha → sin_datos', () => {
    expect(estadoRevision(null, NOW)).toBe('sin_datos');
  });

  it('180 días → al_dia; 181 → vencida (días naturales locales)', () => {
    expect(diasDesdeRevision(hace(180), NOW)).toBe(180);
    expect(estadoRevision(hace(180), NOW)).toBe('al_dia');
    expect(estadoRevision(hace(181), NOW)).toBe('vencida');
    expect(estadoRevision(hace(0), NOW)).toBe('al_dia');
  });

  it('cruzar un cambio de horario no desplaza el conteo', () => {
    // 2 abr → 30 sep 2026: 181 días naturales
    expect(diasDesdeRevision(new Date(2026, 3, 2, 0, 30).toISOString(), NOW)).toBe(181);
  });
});

describe('estadoVencimientoSeguro', () => {
  it('distingue sin fecha, vigente, próxima (≤30 días) y vencida', () => {
    expect(estadoVencimientoSeguro(null, NOW)).toBe('sin_fecha');
    expect(estadoVencimientoSeguro('2026-10-31', NOW)).toBe('vigente');
    expect(estadoVencimientoSeguro('2026-10-30', NOW)).toBe('proxima');
    expect(estadoVencimientoSeguro('2026-09-30', NOW)).toBe('proxima');
    expect(estadoVencimientoSeguro('2026-09-29', NOW)).toBe('vencida');
  });
});

describe('esTablaInexistente', () => {
  it('reconoce los códigos de Postgres y PostgREST', () => {
    expect(esTablaInexistente({ code: '42P01' })).toBe(true);
    expect(esTablaInexistente({ code: 'PGRST205' })).toBe(true);
    expect(esTablaInexistente({ code: '23505' })).toBe(false);
    expect(esTablaInexistente(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar** — `npx vitest run src/lib/finance/familia.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/lib/finance/familia.ts`:

```ts
import { diasHasta, toFechaISO } from './fechas';

export type Divisa = 'MXN' | 'USD' | 'EUR';
const DIVISAS: readonly Divisa[] = ['MXN', 'USD', 'EUR'];

export interface Contacto { id: string; nombre: string; rol: string; telefono: string; email: string; nota: string }
export interface Seguro {
  id: string; tipo: string; aseguradora: string; poliza: string;
  sumaAsegurada: number | null; divisa: Divisa;
  beneficiarios: string;
  /** YYYY-MM-DD local. */
  vencimiento: string | null;
  /** Agente, teléfono y pasos para reclamar. */
  comoReclamar: string;
}
export interface Documento { id: string; que: string; donde: string; nota: string }
export interface DecisionPago { decision: 'mantener' | 'cancelar' | null; nota: string }

export interface InfoFamilia {
  /** "Si estás leyendo esto": pasos en orden. */
  carta: string;
  contactos: Contacto[];
  seguros: Seguro[];
  documentos: Documento[];
  /** Clave `cuenta:<id>` | `inversion:<id>` | `cripto:<id>`. */
  notasPatrimonio: Record<string, string>;
  /** Clave `sub:<id>` | `anual:<groupId>`. */
  pagos: Record<string, DecisionPago>;
  /** Lo que normalizar no supo interpretar; se reescribe tal cual al guardar. */
  extra: Record<string, unknown>;
}

export type EstadoRevision = 'sin_datos' | 'al_dia' | 'vencida';
export type EstadoVencimiento = 'sin_fecha' | 'vigente' | 'proxima' | 'vencida';
export interface NotaHuerfana { origen: 'nota' | 'pago'; clave: string; texto: string }

export const DIAS_REVISION = 180;
export const DIAS_AVISO_VENCIMIENTO = 30;

const CAMPOS = new Set(['carta', 'contactos', 'seguros', 'documentos', 'notasPatrimonio', 'pagos']);
const IRREPARABLES = '_irreparables';
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const nuevoId = () => crypto.randomUUID();
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
const numero = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export const infoFamiliaVacia = (): InfoFamilia => ({
  carta: '', contactos: [], seguros: [], documentos: [], notasPatrimonio: {}, pagos: {}, extra: {},
});

export const nuevoContacto = (): Contacto => ({ id: nuevoId(), nombre: '', rol: '', telefono: '', email: '', nota: '' });
export const nuevoSeguro = (): Seguro => ({
  id: nuevoId(), tipo: '', aseguradora: '', poliza: '', sumaAsegurada: null, divisa: 'MXN',
  beneficiarios: '', vencimiento: null, comoReclamar: '',
});
export const nuevoDocumento = (): Documento => ({ id: nuevoId(), que: '', donde: '', nota: '' });

const repararContacto = (o: Record<string, unknown>): Contacto => ({
  id: texto(o.id) || nuevoId(), nombre: texto(o.nombre), rol: texto(o.rol),
  telefono: texto(o.telefono), email: texto(o.email), nota: texto(o.nota),
});
const repararSeguro = (o: Record<string, unknown>): Seguro => ({
  id: texto(o.id) || nuevoId(), tipo: texto(o.tipo), aseguradora: texto(o.aseguradora), poliza: texto(o.poliza),
  sumaAsegurada: numero(o.sumaAsegurada),
  divisa: DIVISAS.includes(o.divisa as Divisa) ? (o.divisa as Divisa) : 'MXN',
  beneficiarios: texto(o.beneficiarios),
  vencimiento: typeof o.vencimiento === 'string' && FECHA_ISO.test(o.vencimiento) ? o.vencimiento : null,
  comoReclamar: texto(o.comoReclamar),
});
const repararDocumento = (o: Record<string, unknown>): Documento => ({
  id: texto(o.id) || nuevoId(), que: texto(o.que), donde: texto(o.donde), nota: texto(o.nota),
});

/**
 * Convierte lo que venga de la BD en un documento válido. Repara en vez de
 * descartar; lo irreparable va a `extra._irreparables[campo]` y las claves
 * desconocidas a `extra`, y serializarInfoFamilia lo reescribe tal cual.
 */
export const normalizarInfoFamilia = (raw: unknown): InfoFamilia => {
  const info = infoFamiliaVacia();
  if (raw === null || raw === undefined) return info;
  if (!esObjeto(raw)) {
    info.extra[IRREPARABLES] = { raiz: [raw] };
    return info;
  }

  const irreparables: Record<string, unknown[]> = {};
  if (esObjeto(raw[IRREPARABLES])) {
    for (const [k, v] of Object.entries(raw[IRREPARABLES] as Record<string, unknown>)) {
      irreparables[k] = Array.isArray(v) ? [...v] : [v];
    }
  }
  const apartar = (campo: string, valor: unknown) => { (irreparables[campo] ??= []).push(valor); };

  for (const [k, v] of Object.entries(raw)) {
    if (!CAMPOS.has(k) && k !== IRREPARABLES) info.extra[k] = v;
  }

  if (raw.carta !== undefined) {
    if (typeof raw.carta === 'string') info.carta = raw.carta;
    else apartar('carta', raw.carta);
  }

  const lista = <T>(campo: string, reparar: (o: Record<string, unknown>) => T): T[] => {
    const v = raw[campo];
    if (v === undefined) return [];
    if (!Array.isArray(v)) { apartar(campo, v); return []; }
    const out: T[] = [];
    for (const el of v) {
      if (esObjeto(el)) out.push(reparar(el));
      else apartar(campo, el);
    }
    return out;
  };
  info.contactos = lista('contactos', repararContacto);
  info.seguros = lista('seguros', repararSeguro);
  info.documentos = lista('documentos', repararDocumento);

  if (raw.notasPatrimonio !== undefined) {
    if (!esObjeto(raw.notasPatrimonio)) apartar('notasPatrimonio', raw.notasPatrimonio);
    else for (const [clave, valor] of Object.entries(raw.notasPatrimonio)) {
      if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') info.notasPatrimonio[clave] = String(valor);
      else apartar('notasPatrimonio', { clave, valor });
    }
  }

  if (raw.pagos !== undefined) {
    if (!esObjeto(raw.pagos)) apartar('pagos', raw.pagos);
    else for (const [clave, valor] of Object.entries(raw.pagos)) {
      if (!esObjeto(valor)) { apartar('pagos', { clave, valor }); continue; }
      const decision = valor.decision === 'mantener' || valor.decision === 'cancelar' ? valor.decision : null;
      info.pagos[clave] = { decision, nota: texto(valor.nota) };
    }
  }

  if (Object.keys(irreparables).length > 0) info.extra[IRREPARABLES] = irreparables;
  return info;
};

/** Inverso de normalizarInfoFamilia: funde `extra` de vuelta en la raíz. */
export const serializarInfoFamilia = (info: InfoFamilia): Record<string, unknown> => ({
  ...info.extra,
  carta: info.carta,
  contactos: info.contactos,
  seguros: info.seguros,
  documentos: info.documentos,
  notasPatrimonio: info.notasPatrimonio,
  pagos: info.pagos,
});

/** Nota para la familia de una partida; texto vacío la borra. */
export const conNota = (d: InfoFamilia, clave: string, textoNota: string): InfoFamilia => {
  const notasPatrimonio = { ...d.notasPatrimonio };
  if (textoNota) notasPatrimonio[clave] = textoNota;
  else delete notasPatrimonio[clave];
  return { ...d, notasPatrimonio };
};

/** Decisión sobre un pago; sin decisión ni nota se borra. */
export const conDecision = (d: InfoFamilia, clave: string, p: DecisionPago): InfoFamilia => {
  const pagos = { ...d.pagos };
  if (p.decision || p.nota) pagos[clave] = p;
  else delete pagos[clave];
  return { ...d, pagos };
};

export const sinHuerfana = (d: InfoFamilia, h: NotaHuerfana): InfoFamilia => {
  if (h.origen === 'nota') return conNota(d, h.clave, '');
  const pagos = { ...d.pagos };
  delete pagos[h.clave];
  return { ...d, pagos };
};

/** Días naturales locales desde la revisión (misma cuenta que diasHasta: el cambio de horario no desplaza). */
export const diasDesdeRevision = (revisadoAt: string, now: Date = new Date()): number =>
  -diasHasta(toFechaISO(new Date(revisadoAt)), now);

export const estadoRevision = (revisadoAt: string | null, now: Date = new Date()): EstadoRevision => {
  if (!revisadoAt) return 'sin_datos';
  return diasDesdeRevision(revisadoAt, now) <= DIAS_REVISION ? 'al_dia' : 'vencida';
};

export const estadoVencimientoSeguro = (vencimiento: string | null, now: Date = new Date()): EstadoVencimiento => {
  if (!vencimiento) return 'sin_fecha';
  const dias = diasHasta(vencimiento, now);
  if (dias < 0) return 'vencida';
  return dias <= DIAS_AVISO_VENCIMIENTO ? 'proxima' : 'vigente';
};

/** Migración sin aplicar: Postgres 42P01 (undefined_table) o PostgREST PGRST205 (tabla fuera del schema cache). */
export const esTablaInexistente = (error: unknown): boolean => {
  const code = esObjeto(error) ? error.code : undefined;
  return code === '42P01' || code === 'PGRST205';
};
```

`PostgrestError` es un objeto (no array), así que `esObjeto` lo acepta y lee su `code`.

- [ ] **Step 4: Ejecutar** — `npx vitest run src/lib/finance/familia.test.ts` → PASS. Luego `npx tsc --noEmit -p tsconfig.app.json`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance/familia.ts src/lib/finance/familia.test.ts
git commit -m "Documento de información familiar: normalización sin pérdidas, edición y revisión

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cálculos sobre datos de Savium (`familiaResumen.ts`)

**Files:**
- Create: `src/lib/finance/familiaResumen.ts`
- Test: `src/lib/finance/familiaResumen.test.ts`
- Modify: `src/lib/finance/annualPayments.ts` (añadir `readInactiveAnnualIds`), `src/hooks/useAlerts.ts:16-24` (usarla en vez de la copia local)

**Interfaces:**
- Consumes: `saldosAlCierre`, `ASSET_TYPES`, `LIABILITY_TYPES` (Task 2); `finMesAnterior` (`fechas.ts`); `AnnualPaymentGroup` (`annualPayments.ts`); `DecisionPago`, `InfoFamilia`, `NotaHuerfana` (Task 3); `Investment`, `InvestmentType` (`@/types/investments`); `CryptoWithPrice` (`@/types/crypto`).
- Produces:
  - `resumenPatrimonioFamilia({ accounts, transactions, convert, currency, now? }): ResumenPatrimonio` con `ResumenPatrimonio = { grupos: GrupoPatrimonio[]; activos; pasivos; patrimonio; ultimoMesCompleto: Date }`, `GrupoPatrimonio = { id: GrupoId; titulo: string; partidas: PartidaCuenta[]; subtotal: number }`, `PartidaCuenta = { clave: string; nombre: string; saldo: number; divisa: CurrencyCode; saldoConvertido: number; sinDeuda: boolean }`, `GrupoId = 'liquidez' | 'inversiones' | 'inmuebles' | 'empresas' | 'deudas'`.
  - `detalleInversionesFamilia(investments, types): GrupoInversiones[]` con `GrupoInversiones = { tipo: string; partidas: PartidaInversion[] }`, `PartidaInversion = { clave; nombre; valor: number; moneda: string; vencimiento: string | null; tasaAnual: number | null }`.
  - `detalleCriptoFamilia(criptos: CryptoWithPrice[]): PartidaCripto[]` con `PartidaCripto = { clave; nombre; simbolo; cantidad: number; valorUsd: number; aPrecioDeCompra: boolean }`.
  - `pagosRecurrentesFamilia({ subscriptions, annualGroups, transactions, inactiveAnnualIds, baseCurrency, decisiones }): PagoRecurrente[]` con `PagoRecurrente = { clave; concepto; monto: number; divisa: string; frecuencia: string; decision: DecisionPago }` y `SuscripcionFamilia = { id: string; service_name: string; active: boolean; frecuencia: string | null; ultimo_pago_monto: number | null }`.
  - `notasHuerfanas(info: InfoFamilia, ids: IdsExistentes): NotaHuerfana[]` con `IdsExistentes = { cuentas: string[]; inversiones: string[]; criptos: string[]; suscripciones: string[]; anuales: string[] }`.
  - `readInactiveAnnualIds(): Set<string>` en `annualPayments.ts`.

- [ ] **Step 1: Tests que fallan** — `src/lib/finance/familiaResumen.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Account, Transaction } from '@/types/finance';
import { Investment, InvestmentType } from '@/types/investments';
import { CryptoWithPrice } from '@/types/crypto';
import { ConvertCurrency } from './dashboardMetrics';
import { AnnualPaymentGroup } from './annualPayments';
import { computeNetWorthHistory } from './netWorthHistory';
import { infoFamiliaVacia } from './familia';
import {
  detalleCriptoFamilia, detalleInversionesFamilia, notasHuerfanas, pagosRecurrentesFamilia, resumenPatrimonioFamilia,
} from './familiaResumen';

const RATES = { MXN: 1, USD: 20, EUR: 22 };
const convert: ConvertCurrency = (amount, from, to) => (from === to ? amount : (amount * RATES[from]) / RATES[to]);
const NOW = new Date(2026, 8, 15);

const account = (over: Partial<Account>): Account => ({
  id: 'a1', nombre: 'Banco', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN', ...over,
});
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

describe('resumenPatrimonioFamilia', () => {
  const accounts = [
    account({ id: 'b', nombre: 'BBVA', tipo: 'Banco', saldoInicial: 1000 }),
    account({ id: 'usd', nombre: 'Schwab', tipo: 'Inversiones', saldoInicial: 100, divisa: 'USD' }),
    account({ id: 'casa', nombre: 'Casa', tipo: 'Bien Raíz', saldoInicial: 5000 }),
    account({ id: 'vendida', nombre: 'Depa', tipo: 'Bien Raíz', saldoInicial: 9999, vendida: true }),
    account({ id: 'tc0', nombre: 'Visa', tipo: 'Tarjeta de Crédito', saldoInicial: 0 }),
    account({ id: 'tc', nombre: 'Amex', tipo: 'Tarjeta de Crédito', saldoInicial: -300 }),
  ];
  const txs = [tx({ cuentaId: 'b', monto: 200, fecha: new Date(2026, 8, 10) })]; // mes en curso
  const r = resumenPatrimonioFamilia({ accounts, transactions: txs, convert, currency: 'MXN', now: NOW });

  it('agrupa por tipo en orden fijo, omite grupos vacíos y excluye vendidas', () => {
    expect(r.grupos.map(g => g.id)).toEqual(['liquidez', 'inversiones', 'inmuebles', 'deudas']);
    expect(r.grupos.find(g => g.id === 'inmuebles')!.partidas.map(p => p.nombre)).toEqual(['Casa']);
  });

  it('el total es igual al último punto de computeNetWorthHistory, con movimientos del mes en curso', () => {
    const last = computeNetWorthHistory(accounts, txs, convert, 'MXN', NOW).at(-1)!;
    expect(r.activos).toBe(last.activos);
    expect(r.pasivos).toBe(last.pasivos);
    expect(r.patrimonio).toBe(last.patrimonio);
    expect(r.patrimonio).toBe(1200 + 2000 + 5000 - 300);
  });

  it('una tarjeta sin deuda aparece marcada y no suma', () => {
    const deudas = r.grupos.find(g => g.id === 'deudas')!;
    expect(deudas.partidas.map(p => [p.nombre, p.sinDeuda])).toEqual([['Amex', false], ['Visa', true]]);
    expect(deudas.subtotal).toBe(300);
  });

  it('convierte a la divisa pedida conservando el saldo original y la clave de nota', () => {
    expect(r.grupos.find(g => g.id === 'inversiones')!.partidas[0])
      .toMatchObject({ clave: 'cuenta:usd', saldo: 100, divisa: 'USD', saldoConvertido: 2000 });
  });

  it('el último mes completo es el anterior al actual', () => {
    expect([r.ultimoMesCompleto.getFullYear(), r.ultimoMesCompleto.getMonth()]).toEqual([2026, 7]);
  });
});

describe('detalleInversionesFamilia', () => {
  const inv = (o: Partial<Investment>) => ({
    id: 'i', nombre: 'X', tipo: '', tipo_id: null, monto_invertido: 0, valor_actual: 0, moneda: 'MXN',
    fecha_vencimiento: null, tasa_anual: null, activa: true, ...o,
  }) as Investment;
  const types = [{ id: 'cete', nombre: 'CETES' }, { id: 'fibra', nombre: 'Fibras' }] as InvestmentType[];

  it('agrupa las activas por tipo, usa valor_actual y cae a monto_invertido', () => {
    const grupos = detalleInversionesFamilia([
      inv({ id: 'a', nombre: 'Cete 28', tipo_id: 'cete', valor_actual: 1000, fecha_vencimiento: '2026-10-15', tasa_anual: 10 }),
      inv({ id: 'b', nombre: 'Fibra', tipo_id: 'fibra', valor_actual: 0, monto_invertido: 500 }),
      inv({ id: 'c', nombre: 'Vieja', tipo_id: 'cete', activa: false, valor_actual: 99 }),
      inv({ id: 'd', nombre: 'Suelta' }),
    ], types);
    expect(grupos.map(g => g.tipo)).toEqual(['CETES', 'Fibras', 'Sin tipo asignado']);
    expect(grupos[0].partidas).toEqual([
      { clave: 'inversion:a', nombre: 'Cete 28', valor: 1000, moneda: 'MXN', vencimiento: '2026-10-15', tasaAnual: 10 },
    ]);
    expect(grupos[1].partidas[0].valor).toBe(500);
  });
});

describe('detalleCriptoFamilia', () => {
  it('usa el precio actual o, si falta, el de compra marcándolo', () => {
    const c = (o: Partial<CryptoWithPrice>) => ({ id: 'x', nombre: 'Bitcoin', simbolo: 'BTC', cantidad: 1, ...o }) as CryptoWithPrice;
    expect(detalleCriptoFamilia([
      c({ id: 'btc', valor_actual_usd: 60000, valor_compra_usd: 30000 }),
      c({ id: 'eth', nombre: 'Ether', simbolo: 'ETH', cantidad: 2, valor_compra_usd: 4000 }),
    ])).toEqual([
      { clave: 'cripto:btc', nombre: 'Bitcoin', simbolo: 'BTC', cantidad: 1, valorUsd: 60000, aPrecioDeCompra: false },
      { clave: 'cripto:eth', nombre: 'Ether', simbolo: 'ETH', cantidad: 2, valorUsd: 4000, aPrecioDeCompra: true },
    ]);
  });
});

describe('pagosRecurrentesFamilia', () => {
  const grupo = (o: Partial<AnnualPaymentGroup>): AnnualPaymentGroup => ({
    id: 'seg-seguro auto', categoryId: 'seg', categoryName: 'Seguros', subcategoryName: 'Auto', concept: 'SEGURO AUTO',
    lastAmount: 12000, lastDate: new Date(2026, 0, 5), nextPayment: new Date(2027, 0, 5),
    history: [{ date: new Date(2026, 0, 5), amount: 12000, comment: 'SEGURO AUTO' }], totalPaid: 12000, ...o,
  });

  it('lista suscripciones activas y anuales no inactivos, con divisa y decisión', () => {
    const pagos = pagosRecurrentesFamilia({
      subscriptions: [
        { id: 's1', service_name: 'Netflix', active: true, frecuencia: 'Mensual', ultimo_pago_monto: 299 },
        { id: 's2', service_name: 'Vieja', active: false, frecuencia: 'Mensual', ultimo_pago_monto: 1 },
      ],
      annualGroups: [grupo({}), grupo({ id: 'seg-predial', concept: 'PREDIAL' })],
      transactions: [tx({ comentario: 'SEGURO AUTO', subcategoriaId: 'seg', divisa: 'USD' })],
      inactiveAnnualIds: new Set(['seg-predial']),
      baseCurrency: 'MXN',
      decisiones: { 'sub:s1': { decision: 'cancelar', nota: 'la usa Ana' } },
    });
    expect(pagos).toEqual([
      { clave: 'sub:s1', concepto: 'Netflix', monto: 299, divisa: 'MXN', frecuencia: 'Mensual', decision: { decision: 'cancelar', nota: 'la usa Ana' } },
      { clave: 'anual:seg-seguro auto', concepto: 'SEGURO AUTO', monto: 12000, divisa: 'USD', frecuencia: 'Anual', decision: { decision: null, nota: '' } },
    ]);
  });
});

describe('notasHuerfanas', () => {
  it('solo marca como huérfanas las claves cuya entidad ya no existe', () => {
    const info = {
      ...infoFamiliaVacia(),
      notasPatrimonio: { 'cuenta:viva': 'a', 'cuenta:borrada': 'b', 'inversion:i1': 'c', 'cripto:k': 'd', 'raro:1': 'e' },
      pagos: {
        'sub:s1': { decision: 'mantener' as const, nota: '' },
        'anual:ido': { decision: 'cancelar' as const, nota: 'llamar' },
      },
    };
    const h = notasHuerfanas(info, { cuentas: ['viva'], inversiones: ['i1'], criptos: [], suscripciones: ['s1'], anuales: [] });
    expect(h).toEqual([
      { origen: 'nota', clave: 'cuenta:borrada', texto: 'b' },
      { origen: 'nota', clave: 'cripto:k', texto: 'd' },
      { origen: 'nota', clave: 'raro:1', texto: 'e' },
      { origen: 'pago', clave: 'anual:ido', texto: 'Cancelar · llamar' },
    ]);
  });
});
```

- [ ] **Step 2: Ejecutar** — `npx vitest run src/lib/finance/familiaResumen.test.ts` → FAIL.

- [ ] **Step 3: Implementar** — `src/lib/finance/familiaResumen.ts`:

```ts
import { Account, AccountType, Transaction } from '@/types/finance';
import { Investment, InvestmentType } from '@/types/investments';
import { CryptoWithPrice } from '@/types/crypto';
import { ConvertCurrency, CurrencyCode } from './dashboardMetrics';
import { AnnualPaymentGroup } from './annualPayments';
import { saldosAlCierre } from './netWorthHistory';
import { finMesAnterior } from './fechas';
import { DecisionPago, InfoFamilia, NotaHuerfana } from './familia';

export type GrupoId = 'liquidez' | 'inversiones' | 'inmuebles' | 'empresas' | 'deudas';
export interface PartidaCuenta {
  clave: string; nombre: string;
  /** En la divisa de la cuenta. */
  saldo: number; divisa: CurrencyCode;
  saldoConvertido: number;
  /** Deuda con saldo ≥ 0: se muestra pero no suma. */
  sinDeuda: boolean;
}
export interface GrupoPatrimonio { id: GrupoId; titulo: string; partidas: PartidaCuenta[]; subtotal: number }
export interface ResumenPatrimonio {
  grupos: GrupoPatrimonio[];
  activos: number; pasivos: number; patrimonio: number;
  /** Fin del mes anterior: hasta aquí el libro está completo. */
  ultimoMesCompleto: Date;
}

const GRUPOS: { id: GrupoId; titulo: string; tipos: AccountType[] }[] = [
  { id: 'liquidez', titulo: 'Bancos y efectivo', tipos: ['Efectivo', 'Banco', 'Ahorros'] },
  { id: 'inversiones', titulo: 'Inversiones', tipos: ['Inversiones'] },
  { id: 'inmuebles', titulo: 'Bienes raíces', tipos: ['Bien Raíz'] },
  { id: 'empresas', titulo: 'Empresas', tipos: ['Empresa Propia'] },
  { id: 'deudas', titulo: 'Deudas', tipos: ['Tarjeta de Crédito', 'Hipoteca'] },
];

const porNombre = <T extends { nombre: string }>(a: T, b: T) => a.nombre.localeCompare(b.nombre, 'es');

/**
 * Patrimonio para la familia con la misma regla que Informes › Patrimonio Neto:
 * saldos al cierre del mes en curso, activos sin vendidas, pasivos = parte
 * negativa de tarjetas e hipotecas. Las deudas se listan siempre.
 */
export const resumenPatrimonioFamilia = ({ accounts, transactions, convert, currency, now = new Date() }: {
  accounts: Account[]; transactions: Transaction[]; convert: ConvertCurrency; currency: CurrencyCode; now?: Date;
}): ResumenPatrimonio => {
  const cierre = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const saldos = saldosAlCierre(accounts, transactions, cierre);
  let activos = 0;
  let pasivos = 0;

  const grupos = GRUPOS.flatMap(g => {
    const esDeuda = g.id === 'deudas';
    const partidas: PartidaCuenta[] = accounts
      .filter(a => g.tipos.includes(a.tipo) && (esDeuda || !a.vendida))
      .map(a => {
        const divisa = (a.divisa || 'MXN') as CurrencyCode;
        const saldo = saldos.get(a.id) ?? a.saldoInicial;
        const saldoConvertido = convert(saldo, divisa, currency);
        return { clave: `cuenta:${a.id}`, nombre: a.nombre, saldo, divisa, saldoConvertido, sinDeuda: esDeuda && saldoConvertido >= 0 };
      })
      .sort(porNombre);
    if (partidas.length === 0) return [];
    const subtotal = esDeuda
      ? partidas.reduce((s, p) => s + Math.abs(Math.min(0, p.saldoConvertido)), 0)
      : partidas.reduce((s, p) => s + p.saldoConvertido, 0);
    if (esDeuda) pasivos += subtotal;
    else activos += subtotal;
    return [{ id: g.id, titulo: g.titulo, partidas, subtotal }];
  });

  return { grupos, activos, pasivos, patrimonio: activos - pasivos, ultimoMesCompleto: finMesAnterior(now) };
};

export interface PartidaInversion {
  clave: string; nombre: string; valor: number; moneda: string;
  vencimiento: string | null; tasaAnual: number | null;
}
export interface GrupoInversiones { tipo: string; partidas: PartidaInversion[] }

/** Inversiones activas agrupadas por tipo. Informativo: no suma al patrimonio. `valor_actual` ya viene calculado por useInvestments. */
export const detalleInversionesFamilia = (investments: Investment[], types: InvestmentType[]): GrupoInversiones[] => {
  const nombreTipo = new Map(types.map(t => [t.id, t.nombre]));
  const grupos = new Map<string, PartidaInversion[]>();
  for (const i of investments) {
    if (!i.activa) continue;
    const tipo = (i.tipo_id && nombreTipo.get(i.tipo_id)) || 'Sin tipo asignado';
    if (!grupos.has(tipo)) grupos.set(tipo, []);
    grupos.get(tipo)!.push({
      clave: `inversion:${i.id}`, nombre: i.nombre, valor: i.valor_actual || i.monto_invertido || 0,
      moneda: i.moneda || 'MXN', vencimiento: i.fecha_vencimiento, tasaAnual: i.tasa_anual,
    });
  }
  return [...grupos.entries()]
    .map(([tipo, partidas]) => ({ tipo, partidas: partidas.sort(porNombre) }))
    .sort((a, b) => (a.tipo === 'Sin tipo asignado' ? 1 : b.tipo === 'Sin tipo asignado' ? -1 : a.tipo.localeCompare(b.tipo, 'es')));
};

export interface PartidaCripto {
  clave: string; nombre: string; simbolo: string; cantidad: number;
  valorUsd: number;
  /** Sin precio actual: se valora al de compra, como en la página Inversiones. */
  aPrecioDeCompra: boolean;
}

export const detalleCriptoFamilia = (criptos: CryptoWithPrice[]): PartidaCripto[] =>
  criptos
    .map(c => ({
      clave: `cripto:${c.id}`, nombre: c.nombre, simbolo: c.simbolo, cantidad: c.cantidad,
      valorUsd: c.valor_actual_usd ?? c.valor_compra_usd ?? 0,
      aPrecioDeCompra: c.valor_actual_usd === undefined,
    }))
    .sort(porNombre);

export interface SuscripcionFamilia {
  id: string; service_name: string; active: boolean; frecuencia: string | null; ultimo_pago_monto: number | null;
}
export interface PagoRecurrente {
  clave: string; concepto: string; monto: number; divisa: string; frecuencia: string; decision: DecisionPago;
}

const SIN_DECISION: DecisionPago = { decision: null, nota: '' };

/**
 * Suscripciones activas (divisa del perfil: la tabla no la guarda) y pagos
 * anuales no marcados inactivos (divisa deducida como en alerts.ts).
 */
export const pagosRecurrentesFamilia = ({ subscriptions, annualGroups, transactions, inactiveAnnualIds, baseCurrency, decisiones }: {
  subscriptions: SuscripcionFamilia[];
  annualGroups: AnnualPaymentGroup[];
  transactions: Transaction[];
  inactiveAnnualIds: Set<string>;
  baseCurrency: CurrencyCode;
  decisiones: Record<string, DecisionPago>;
}): PagoRecurrente[] => {
  const subs = subscriptions
    .filter(s => s.active)
    .map(s => ({
      clave: `sub:${s.id}`, concepto: s.service_name, monto: s.ultimo_pago_monto ?? 0,
      divisa: baseCurrency as string, frecuencia: s.frecuencia ?? '',
    }))
    .sort((a, b) => a.concepto.localeCompare(b.concepto, 'es'));
  const anuales = annualGroups
    .filter(g => !inactiveAnnualIds.has(g.id))
    .map(g => {
      const ultimo = g.history[0];
      const divisa = (ultimo && transactions.find(t => t.comentario === ultimo.comment && t.subcategoriaId === g.categoryId)?.divisa) || baseCurrency;
      return { clave: `anual:${g.id}`, concepto: g.concept, monto: g.lastAmount, divisa, frecuencia: 'Anual' };
    })
    .sort((a, b) => a.concepto.localeCompare(b.concepto, 'es'));
  return [...subs, ...anuales].map(p => ({ ...p, decision: decisiones[p.clave] ?? SIN_DECISION }));
};

export interface IdsExistentes {
  cuentas: string[]; inversiones: string[]; criptos: string[]; suscripciones: string[]; anuales: string[];
}

const PREFIJOS: Record<string, keyof IdsExistentes> = {
  cuenta: 'cuentas', inversion: 'inversiones', cripto: 'criptos', sub: 'suscripciones', anual: 'anuales',
};
const ETIQUETA_DECISION = { mantener: 'Mantener', cancelar: 'Cancelar' } as const;

/**
 * Notas y decisiones cuya entidad ya no existe. Se compara con TODAS las
 * entidades (vendidas, inactivas, liquidadas incluidas), no con lo que se pinta.
 * Llamar solo cuando todas las fuentes han cargado sin error.
 */
export const notasHuerfanas = (info: InfoFamilia, ids: IdsExistentes): NotaHuerfana[] => {
  const existentes = Object.fromEntries(
    Object.entries(ids).map(([k, v]) => [k, new Set(v)])
  ) as Record<keyof IdsExistentes, Set<string>>;
  const existe = (clave: string) => {
    const i = clave.indexOf(':');
    const grupo = PREFIJOS[clave.slice(0, i)];
    return i > 0 && grupo !== undefined && existentes[grupo].has(clave.slice(i + 1));
  };
  const notas: NotaHuerfana[] = Object.entries(info.notasPatrimonio)
    .filter(([clave, texto]) => texto.trim() !== '' && !existe(clave))
    .map(([clave, texto]) => ({ origen: 'nota', clave, texto }));
  const pagos: NotaHuerfana[] = Object.entries(info.pagos)
    .filter(([clave, p]) => (p.decision || p.nota) && !existe(clave))
    .map(([clave, p]) => ({
      origen: 'pago', clave,
      texto: [p.decision ? ETIQUETA_DECISION[p.decision] : '', p.nota].filter(Boolean).join(' · '),
    }));
  return [...notas, ...pagos];
};
```

Los tipos de `GRUPOS` son exactamente `ASSET_TYPES ∪ LIABILITY_TYPES` de `netWorthHistory.ts`; la coherencia la garantiza el test «el total es igual al último punto».

- [ ] **Step 4: Mover la lectura de inactivos** — al final de `src/lib/finance/annualPayments.ts`:

```ts
/** Ids de pagos anuales marcados inactivos (localStorage, por dispositivo; lo escribe AnnualPaymentsTracker). */
export const readInactiveAnnualIds = (): Set<string> => {
  try {
    const saved = localStorage.getItem('inactive_annual_payments');
    return new Set(saved ? (JSON.parse(saved) as string[]) : []);
  } catch {
    return new Set();
  }
};
```

En `src/hooks/useAlerts.ts`: borrar `readInactiveAnnual` (l.16-24), importar `readInactiveAnnualIds` de `@/lib/finance/annualPayments` y usar `useState(readInactiveAnnualIds)`.

- [ ] **Step 5: Ejecutar** — `npx vitest run` → todo PASS; `npx tsc --noEmit -p tsconfig.app.json` → sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/finance/familiaResumen.ts src/lib/finance/familiaResumen.test.ts src/lib/finance/annualPayments.ts src/hooks/useAlerts.ts
git commit -m "Resumen para la familia: patrimonio como en Informes, inversiones, cripto, pagos y notas huérfanas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Alerta de revisión

**Files:**
- Modify: `src/lib/finance/alerts.ts` (tipo, `amount?`, nueva función, `computeAlerts`, orden de `categorySpikeAlerts`)
- Modify: `src/hooks/useAlerts.ts` (consulta ligera `revisionFamilia`)
- Modify: `src/pages/Alertas.tsx:12-16, 38-41, 69-72`
- Modify: `src/components/movil/AlertasResumen.tsx:1, 8-12, 36-38`
- Test: `src/lib/finance/alerts.test.ts`

**Interfaces:**
- Consumes: `estadoRevision`, `diasDesdeRevision` (Task 3); `financeQueryKeys(uid).revisionFamilia` (Task 1).
- Produces: `AlertType` incluye `'familia_revision'`; `Alert.amount?: number`; `export interface RevisionFamilia { revisadoAt: string | null }`; `export const familiaRevisionAlerts(revision: RevisionFamilia | null, now: Date): Alert[]`; `AlertsInput.revisionFamilia?: RevisionFamilia | null`.

- [ ] **Step 1: Test que falla** — añadir a `alerts.test.ts` (y `computeAlerts, familiaRevisionAlerts` al import):

```ts
describe('familiaRevisionAlerts', () => {
  const HOY = new Date(2026, 8, 30, 12);

  it('sin fila o revisada hace ≤180 días no alerta', () => {
    expect(familiaRevisionAlerts(null, HOY)).toEqual([]);
    expect(familiaRevisionAlerts({ revisadoAt: null }, HOY)).toEqual([]);
    expect(familiaRevisionAlerts({ revisadoAt: new Date(2026, 3, 3, 10).toISOString() }, HOY)).toEqual([]); // 180 días
  });

  it('vencida: alerta media sin importe, con clave estable por fecha local', () => {
    const [a] = familiaRevisionAlerts({ revisadoAt: new Date(2026, 3, 2, 10).toISOString() }, HOY);
    expect(a).toMatchObject({
      key: 'familia_revision:2026-04-02', type: 'familia_revision', href: '/familia', severity: 'media',
      title: 'Revisa la información para tu familia', detail: 'Última revisión hace 181 días',
    });
    expect(a.amount).toBeUndefined();
  });

  it('computeAlerts la incluye', () => {
    const alerts = computeAlerts({
      categories: [], transactions: [], subscriptions: [], inactiveAnnualIds: new Set(), now: HOY,
      revisionFamilia: { revisadoAt: new Date(2026, 0, 1).toISOString() },
    });
    expect(alerts.map(a => a.type)).toEqual(['familia_revision']);
  });
});
```

- [ ] **Step 2: Ejecutar** — `npx vitest run src/lib/finance/alerts.test.ts` → FAIL.

- [ ] **Step 3: Implementar en `alerts.ts`**
  - Import: `import { diasDesdeRevision, estadoRevision } from './familia';`
  - `export type AlertType = 'pago_anual' | 'suscripcion_sube' | 'categoria_disparada' | 'familia_revision';`
  - En `Alert`: `/** Importe principal en la divisa de la transacción origen; sin importe en avisos que no son de dinero. */ amount?: number;`
  - Añadir tras `SubscriptionForAlerts`:

```ts
/** Estado de revisión de «Para mi familia»; null = sin fila, cargando o error (no alerta). */
export interface RevisionFamilia {
  revisadoAt: string | null;
}
```

  - En `AlertsInput`: `revisionFamilia?: RevisionFamilia | null;`
  - En `categorySpikeAlerts`, la última línea: `return alerts.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));`
  - Añadir antes de `computeAlerts`:

```ts
/**
 * «Para mi familia» sin revisar hace más de DIAS_REVISION días. La clave lleva
 * la fecha local de la última revisión: al marcar como revisado deja de estar
 * vencida, y un descarte vale solo hasta la siguiente revisión.
 */
export const familiaRevisionAlerts = (revision: RevisionFamilia | null, now: Date): Alert[] => {
  if (!revision?.revisadoAt || estadoRevision(revision.revisadoAt, now) !== 'vencida') return [];
  const fecha = new Date(revision.revisadoAt);
  return [{
    key: `familia_revision:${toFechaISO(fecha)}`,
    type: 'familia_revision',
    title: 'Revisa la información para tu familia',
    detail: `Última revisión hace ${diasDesdeRevision(revision.revisadoAt, now)} días`,
    currency: 'MXN',
    date: fecha,
    href: '/familia',
    severity: 'media',
  }];
};
```

  - `computeAlerts`:

```ts
export const computeAlerts = ({ categories, transactions, subscriptions, inactiveAnnualIds, revisionFamilia = null, now = new Date() }: AlertsInput): Alert[] => [
  ...annualPaymentAlerts(categories, transactions, inactiveAnnualIds, now),
  ...subscriptionIncreaseAlerts(subscriptions, transactions),
  ...categorySpikeAlerts(categories, transactions, now),
  ...familiaRevisionAlerts(revisionFamilia, now),
];
```

- [ ] **Step 4: Ejecutar** — `npx vitest run src/lib/finance/alerts.test.ts` → PASS.

- [ ] **Step 5: `useAlerts` con consulta ligera** — en `src/hooks/useAlerts.ts`:

```ts
import { RevisionFamilia } from '@/lib/finance/alerts'; // junto a Alert, computeAlerts

/** Solo revisado_at: useAlerts se monta en todas las páginas y no debe traer el documento. */
const fetchRevisionFamilia = async (): Promise<RevisionFamilia | null> => {
  const { data, error } = await supabase.from('informacion_familia').select('revisado_at').maybeSingle();
  if (error) throw error;
  return data ? { revisadoAt: data.revisado_at } : null;
};
```

Dentro del hook, tras `dismissalsQuery`:

```ts
  // Si falla (p.ej. migración sin aplicar) no hay alerta y no bloquea el resto: fuera de `loading`.
  const revisionQuery = useQuery({
    queryKey: QK.revisionFamilia,
    queryFn: fetchRevisionFamilia,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });
  const revisionFamilia = revisionQuery.data ?? null;
```

Y en `allAlerts`: `computeAlerts({ categories, transactions, subscriptions, inactiveAnnualIds: inactiveAnnual, revisionFamilia })` con `revisionFamilia` en las dependencias del `useMemo`. Actualizar el comentario del hook: «…categorías disparadas, revisión de la información familiar…».

- [ ] **Step 6: UI de escritorio** — `src/pages/Alertas.tsx`:
  - Import `HeartHandshake` de lucide-react.
  - `TYPE_META`: `familia_revision: { label: 'Familia', icon: <HeartHandshake className="h-5 w-5" /> },`
  - En `AlertRow`, envolver el importe: `{alert.amount !== undefined && (<span className="text-sm font-semibold tabular-nums">${formatCurrency(alert.amount)} {alert.currency}</span>)}`
  - Texto descriptivo (l.71): añadir al final `, y la información para tu familia si lleva más de {DIAS_REVISION} días sin revisar` importando `DIAS_REVISION` de `@/lib/finance/familia`.

- [ ] **Step 7: UI móvil** — `src/components/movil/AlertasResumen.tsx`:
  - Import `HeartHandshake`; `ICONO` añade `familia_revision: HeartHandshake,`
  - `{a.amount !== undefined && (<div className="mt-1"><Importe amount={a.amount} currency={a.currency} /></div>)}`

- [ ] **Step 8: Verificar** — `npx vitest run` y `npx tsc --noEmit -p tsconfig.app.json` → verdes.

- [ ] **Step 9: Commit**

```bash
git add src/lib/finance/alerts.ts src/lib/finance/alerts.test.ts src/hooks/useAlerts.ts src/pages/Alertas.tsx src/components/movil/AlertasResumen.tsx
git commit -m "Alerta para revisar la información familiar pasados 180 días

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Hooks de datos y autoguardado

**Files:**
- Create: `src/hooks/useInformacionFamilia.ts`
- Create: `src/hooks/useEditorFamilia.ts`
- Modify: `src/hooks/useFinanceDataSupabase.ts:580-588` (añadir `error: loadError` al return)
- Modify: `src/hooks/useInvestments.ts:194-198` (añadir `error: query.error`)
- Modify: `src/hooks/useCriptomonedas.ts:142-145` (añadir `error: criptosQuery.error`)

**Interfaces:**
- Consumes: Task 1 (tabla, claves), Task 3 (`InfoFamilia`, `infoFamiliaVacia`, `normalizarInfoFamilia`, `serializarInfoFamilia`).
- Produces:
  - `useInformacionFamilia(): { fila: FilaFamilia | null; cargando: boolean; error: unknown; guardar(info, updatedAtLeido: string | null, forzar?: boolean): Promise<ResultadoGuardado>; marcarRevisado(): Promise<FilaFamilia>; recargar(): Promise<FilaFamilia | null> }` con `FilaFamilia = { contenido: InfoFamilia; revisadoAt: string | null; updatedAt: string }` y `ResultadoGuardado = { tipo: 'ok'; fila: FilaFamilia } | { tipo: 'conflicto' } | { tipo: 'error'; error: unknown }`.
  - `useEditorFamilia(): { doc: InfoFamilia | null; estado: EstadoGuardado; fila: FilaFamilia | null; error: unknown; actualizar(fn: (d: InfoFamilia) => InfoFamilia): void; recargar(): Promise<void>; guardarLaMia(): void; reintentar(): void; marcarRevisado(): Promise<void> }` con `EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error' | 'conflicto'`.

No hay infraestructura de tests de hooks en el repo (vitest solo cubre `src/lib`); la verificación de esta tarea es `tsc` y la prueba manual de la Task 9.

- [ ] **Step 1: Exponer errores de carga** — en los tres hooks, añadir al objeto devuelto `error: loadError` / `error: query.error` / `error: criptosQuery.error` respectivamente. `useSubscriptionServices` ya devuelve `error`.

- [ ] **Step 2: `src/hooks/useInformacionFamilia.ts`**

```ts
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys } from '@/lib/finance/queryKeys';
import { InfoFamilia, normalizarInfoFamilia, serializarInfoFamilia } from '@/lib/finance/familia';

export interface FilaFamilia {
  contenido: InfoFamilia;
  revisadoAt: string | null;
  /** Control de concurrencia: se actualiza con .eq('updated_at', este valor). */
  updatedAt: string;
}
export type ResultadoGuardado =
  | { tipo: 'ok'; fila: FilaFamilia }
  | { tipo: 'conflicto' }
  | { tipo: 'error'; error: unknown };

const COLUMNAS = 'contenido, revisado_at, updated_at';
interface FilaBD { contenido: Json; revisado_at: string | null; updated_at: string }
const aFila = (d: FilaBD): FilaFamilia => ({
  contenido: normalizarInfoFamilia(d.contenido), revisadoAt: d.revisado_at, updatedAt: d.updated_at,
});

const fetchFila = async (): Promise<FilaFamilia | null> => {
  const { data, error } = await supabase.from('informacion_familia').select(COLUMNAS).maybeSingle();
  if (error) throw error;
  return data ? aFila(data) : null;
};

/**
 * Fila de «Para mi familia». Sin refetch al volver a la pestaña: el editor
 * hidrata una vez y un refetch no debe competir con lo que se está escribiendo.
 */
export const useInformacionFamilia = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = useMemo(() => financeQueryKeys(user?.id), [user?.id]);

  const query = useQuery({
    queryKey: QK.informacionFamilia,
    queryFn: fetchFila,
    enabled: !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const alGuardar = useCallback((fila: FilaFamilia) => {
    queryClient.setQueryData(QK.informacionFamilia, fila);
    queryClient.invalidateQueries({ queryKey: QK.revisionFamilia });
  }, [queryClient, QK]);

  const guardar = useCallback(async (info: InfoFamilia, updatedAtLeido: string | null, forzar = false): Promise<ResultadoGuardado> => {
    if (!user) return { tipo: 'error', error: new Error('Sin sesión') };
    const contenido = serializarInfoFamilia(info) as unknown as Json;

    if (updatedAtLeido === null && !forzar) {
      // Primer guardado: crear la información cuenta como primera revisión.
      const { data, error } = await supabase
        .from('informacion_familia')
        .insert({ user_id: user.id, contenido, revisado_at: new Date().toISOString() })
        .select(COLUMNAS)
        .single();
      if (error) return error.code === '23505' ? { tipo: 'conflicto' } : { tipo: 'error', error };
      const fila = aFila(data);
      alGuardar(fila);
      return { tipo: 'ok', fila };
    }

    let q = supabase.from('informacion_familia').update({ contenido }).eq('user_id', user.id);
    if (!forzar && updatedAtLeido) q = q.eq('updated_at', updatedAtLeido);
    const { data, error } = await q.select(COLUMNAS).maybeSingle();
    if (error) return { tipo: 'error', error };
    if (!data) return { tipo: 'conflicto' }; // otra pestaña o dispositivo guardó antes
    const fila = aFila(data);
    alGuardar(fila);
    return { tipo: 'ok', fila };
  }, [user, alGuardar]);

  const marcarRevisado = useCallback(async (): Promise<FilaFamilia> => {
    if (!user) throw new Error('Sin sesión');
    const { data, error } = await supabase
      .from('informacion_familia')
      .update({ revisado_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select(COLUMNAS)
      .single();
    if (error) throw error;
    const fila = aFila(data);
    alGuardar(fila);
    return fila;
  }, [user, alGuardar]);

  const { refetch } = query;
  const recargar = useCallback(async (): Promise<FilaFamilia | null> => {
    const r = await refetch();
    if (r.error) throw r.error;
    return r.data ?? null;
  }, [refetch]);

  return {
    fila: query.data ?? null,
    cargando: !!user && query.isPending,
    error: query.error,
    guardar,
    marcarRevisado,
    recargar,
  };
};
```

- [ ] **Step 3: `src/hooks/useEditorFamilia.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { InfoFamilia, infoFamiliaVacia } from '@/lib/finance/familia';
import { FilaFamilia, useInformacionFamilia } from './useInformacionFamilia';

export type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error' | 'conflicto';

const RETRASO_MS = 1500;
const motivo = (error: unknown) => (error instanceof Error ? error.message : String(error ?? ''));

/**
 * Estado local único de «Para mi familia» con guardado automático:
 * se hidrata de la caché una sola vez, guarda 1,5 s después del último cambio,
 * al salir de la página y al cerrar la pestaña; los conflictos no sobrescriben.
 */
export const useEditorFamilia = () => {
  const remoto = useInformacionFamilia();
  const { toast } = useToast();
  const [doc, setDoc] = useState<InfoFamilia | null>(null);
  const [estado, setEstadoState] = useState<EstadoGuardado>('guardado');
  const [cambios, setCambios] = useState(0);

  const docRef = useRef<InfoFamilia | null>(null);
  const baseRef = useRef<string | null>(null);
  const estadoRef = useRef<EstadoGuardado>('guardado');
  const enVueloRef = useRef(false);
  const repetirRef = useRef(false);

  const setEstado = useCallback((e: EstadoGuardado) => {
    estadoRef.current = e;
    setEstadoState(e);
  }, []);

  const hidratar = useCallback((fila: FilaFamilia | null) => {
    const d = fila?.contenido ?? infoFamiliaVacia();
    docRef.current = d;
    setDoc(d);
    baseRef.current = fila?.updatedAt ?? null;
    setEstado('guardado');
  }, [setEstado]);

  // Una sola hidratación: después, la caché (que cambia con cada guardado) no pisa el estado local.
  useEffect(() => {
    if (docRef.current === null && !remoto.cargando && !remoto.error) hidratar(remoto.fila);
  }, [remoto.cargando, remoto.error, remoto.fila, hidratar]);

  const guardarAhora = async (forzar = false): Promise<void> => {
    const enviado = docRef.current;
    if (!enviado) return;
    if (enVueloRef.current) { repetirRef.current = true; return; }
    enVueloRef.current = true;
    setEstado('guardando');
    const r = await remoto.guardar(enviado, baseRef.current, forzar);
    enVueloRef.current = false;
    if (r.tipo === 'ok') {
      baseRef.current = r.fila.updatedAt;
      if (repetirRef.current || docRef.current !== enviado) {
        repetirRef.current = false;
        void guardarAhoraRef.current();
      } else {
        setEstado('guardado');
      }
    } else if (r.tipo === 'conflicto') {
      repetirRef.current = false;
      setEstado('conflicto');
    } else {
      repetirRef.current = false;
      setEstado('error');
      toast({ title: 'No se pudo guardar', description: motivo(r.error) || 'Error desconocido', variant: 'destructive' });
    }
  };
  const guardarAhoraRef = useRef(guardarAhora);
  guardarAhoraRef.current = guardarAhora;

  const actualizar = useCallback((fn: (d: InfoFamilia) => InfoFamilia) => {
    const d = docRef.current;
    if (!d) return;
    const nuevo = fn(d);
    docRef.current = nuevo;
    setDoc(nuevo);
    if (estadoRef.current !== 'conflicto') setEstado('pendiente');
    setCambios(c => c + 1);
  }, [setEstado]);

  // Debounce: cada cambio reinicia el temporizador.
  useEffect(() => {
    if (cambios === 0 || estadoRef.current === 'conflicto') return;
    const t = setTimeout(() => void guardarAhoraRef.current(), RETRASO_MS);
    return () => clearTimeout(t);
  }, [cambios]);

  // HashRouter no permite bloquear la navegación: se guarda al desmontar; al cerrar la pestaña, además se avisa.
  useEffect(() => {
    const antesDeCerrar = (e: BeforeUnloadEvent) => {
      if (!['pendiente', 'guardando', 'error'].includes(estadoRef.current)) return;
      if (estadoRef.current === 'pendiente') void guardarAhoraRef.current();
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', antesDeCerrar);
    return () => {
      window.removeEventListener('beforeunload', antesDeCerrar);
      if (estadoRef.current === 'pendiente') void guardarAhoraRef.current();
    };
  }, []);

  const recargar = async () => {
    try {
      hidratar(await remoto.recargar());
    } catch (error) {
      toast({ title: 'No se pudo cargar', description: motivo(error), variant: 'destructive' });
    }
  };

  const marcarRevisado = async () => {
    try {
      const fila = await remoto.marcarRevisado();
      baseRef.current = fila.updatedAt; // el trigger movió updated_at
      toast({ title: 'Marcado como revisado' });
    } catch (error) {
      toast({ title: 'No se pudo marcar como revisado', description: motivo(error), variant: 'destructive' });
    }
  };

  return {
    doc,
    estado,
    fila: remoto.fila,
    error: remoto.error,
    actualizar,
    recargar,
    guardarLaMia: () => void guardarAhoraRef.current(true),
    reintentar: () => void guardarAhoraRef.current(),
    marcarRevisado,
  };
};
```

- [ ] **Step 4: Verificar** — `npx tsc --noEmit -p tsconfig.app.json` → sin errores; `npx vitest run` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useInformacionFamilia.ts src/hooks/useEditorFamilia.ts src/hooks/useFinanceDataSupabase.ts src/hooks/useInvestments.ts src/hooks/useCriptomonedas.ts
git commit -m "Hooks de la información familiar: lectura, guardado con control de concurrencia y autoguardado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Página `/familia`, componentes, ruta y menú

**Files:**
- Create: `src/components/familia/ListaEditable.tsx`
- Create: `src/components/familia/IndicadorGuardado.tsx`
- Create: `src/components/familia/PatrimonioFamilia.tsx`
- Create: `src/components/familia/PagosFamilia.tsx`
- Create: `src/components/familia/NotasHuerfanas.tsx`
- Create: `src/pages/Familia.tsx`
- Modify: `src/App.tsx` (lazy import tras `Alertas`, ruta antes de `/alertas`)
- Modify: `src/components/Layout.tsx:3, 50` (icono y entrada de menú)

**Interfaces:**
- Consumes: Tasks 3, 4, 6; hooks existentes `useFinanceDataSupabase`, `useInvestments`, `useInvestmentTypes`, `useCriptomonedas`, `useSubscriptionServices`, `useExchangeRates`, `useAppConfig`; `groupAnnualPayments`, `readInactiveAnnualIds`; `formatFechaCorta`.
- Produces: ruta `/familia`.

- [ ] **Step 1: `ListaEditable.tsx`** (contactos, seguros y documentos comparten edición en diálogo)

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Trash2 } from 'lucide-react';

export interface CampoLista<T> {
  clave: keyof T & string;
  etiqueta: string;
  tipo: 'texto' | 'area' | 'numero' | 'fecha' | 'divisa';
  placeholder?: string;
}

interface Props<T extends { id: string }> {
  items: T[];
  campos: CampoLista<T>[];
  nuevo: () => T;
  onChange: (items: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  tituloDialogo: string;
  textoAnadir: string;
  vacio: string;
}

const Campo = ({ tipo, id, valor, placeholder, onChange }: {
  tipo: CampoLista<unknown>['tipo']; id: string; valor: unknown; placeholder?: string; onChange: (v: unknown) => void;
}) => {
  switch (tipo) {
    case 'area':
      return <Textarea id={id} rows={3} value={String(valor ?? '')} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
    case 'numero':
      return <Input id={id} type="number" value={valor === null || valor === undefined ? '' : String(valor)} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'fecha':
      return <Input id={id} type="date" value={String(valor ?? '')} onChange={e => onChange(e.target.value || null)} />;
    case 'divisa':
      return (
        <Select value={String(valor ?? 'MXN')} onValueChange={onChange}>
          <SelectTrigger id={id}><SelectValue /></SelectTrigger>
          <SelectContent>{['MXN', 'USD', 'EUR'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      );
    default:
      return <Input id={id} value={String(valor ?? '')} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
  }
};

/** Lista de elementos con alta/edición en diálogo y borrado con confirmación. */
export function ListaEditable<T extends { id: string }>({ items, campos, nuevo, onChange, renderItem, tituloDialogo, textoAnadir, vacio }: Props<T>) {
  const [editando, setEditando] = useState<T | null>(null);
  const esNuevo = editando !== null && !items.some(i => i.id === editando.id);

  const aceptar = () => {
    if (!editando) return;
    onChange(esNuevo ? [...items, editando] : items.map(i => (i.id === editando.id ? editando : i)));
    setEditando(null);
  };
  const borrar = (id: string) => {
    if (window.confirm('¿Borrar este elemento?')) onChange(items.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : items.map(item => (
        <div key={item.id} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 min-w-0">{renderItem(item)}</div>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditando(item)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Borrar" onClick={() => borrar(item.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setEditando(nuevo())}>
        <Plus className="h-4 w-4 mr-1" />{textoAnadir}
      </Button>

      <Dialog open={editando !== null} onOpenChange={o => { if (!o) setEditando(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tituloDialogo}</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-3">
              {campos.map(c => (
                <div key={c.clave} className="space-y-1">
                  <Label htmlFor={`campo-${c.clave}`}>{c.etiqueta}</Label>
                  <Campo
                    tipo={c.tipo}
                    id={`campo-${c.clave}`}
                    valor={editando[c.clave]}
                    placeholder={c.placeholder}
                    onChange={v => setEditando(e => (e ? ({ ...e, [c.clave]: v } as T) : e))}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={aceptar}>Aceptar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: `IndicadorGuardado.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { Check, CloudOff, Loader2, Pencil, TriangleAlert } from 'lucide-react';
import { EstadoGuardado } from '@/hooks/useEditorFamilia';

interface Props {
  estado: EstadoGuardado;
  onReintentar: () => void;
  onRecargar: () => void;
  onGuardarLaMia: () => void;
}

export const IndicadorGuardado = ({ estado, onReintentar, onRecargar, onGuardarLaMia }: Props) => {
  if (estado === 'conflicto') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
        <TriangleAlert className="h-4 w-4" />
        <span>Se guardó una versión más nueva en otro sitio</span>
        <Button size="sm" variant="outline" onClick={onRecargar}>Recargar</Button>
        <Button size="sm" variant="destructive" onClick={onGuardarLaMia}>Guardar la mía</Button>
      </div>
    );
  }
  if (estado === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <CloudOff className="h-4 w-4" /><span>Sin guardar</span>
        <Button size="sm" variant="outline" onClick={onReintentar}>Reintentar</Button>
      </div>
    );
  }
  const meta = {
    guardado: { icon: <Check className="h-4 w-4" />, texto: 'Guardado' },
    pendiente: { icon: <Pencil className="h-4 w-4" />, texto: 'Sin guardar' },
    guardando: { icon: <Loader2 className="h-4 w-4 animate-spin" />, texto: 'Guardando…' },
  }[estado];
  return <span className="flex items-center gap-1 text-sm text-muted-foreground">{meta.icon}{meta.texto}</span>;
};
```

- [ ] **Step 3: `PatrimonioFamilia.tsx`**

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound } from 'lucide-react';
import { GrupoInversiones, PartidaCripto, ResumenPatrimonio } from '@/lib/finance/familiaResumen';

interface Props {
  resumen: ResumenPatrimonio;
  inversiones: GrupoInversiones[];
  cripto: PartidaCripto[];
  notas: Record<string, string>;
  /** Sin callback (información sin cargar) las notas se muestran solo lectura. */
  onNota?: (clave: string, texto: string) => void;
  currency: string;
  formatCurrency: (n: number) => string;
}

export const PatrimonioFamilia = ({ resumen, inversiones, cripto, notas, onNota, currency, formatCurrency }: Props) => {
  const nota = (clave: string) =>
    onNota ? (
      <Input
        className="h-8 text-sm mt-1"
        placeholder="Nota para la familia (beneficiario, a quién llamar…)"
        value={notas[clave] ?? ''}
        onChange={e => onNota(clave, e.target.value)}
      />
    ) : notas[clave] ? <p className="text-sm mt-1">{notas[clave]}</p> : null;
  const mes = resumen.ultimoMesCompleto.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const importe = (n: number, divisa: string) => `$${formatCurrency(n)} ${divisa}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patrimonio</CardTitle>
        <CardDescription>Saldos según lo importado. Último mes completo: {mes}. Se calcula solo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xs text-muted-foreground">Activos</p><p className="font-semibold tabular-nums">{importe(resumen.activos, currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Deudas</p><p className="font-semibold tabular-nums text-destructive">{importe(resumen.pasivos, currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Patrimonio neto</p><p className="font-bold tabular-nums">{importe(resumen.patrimonio, currency)}</p></div>
        </div>

        {resumen.grupos.map(g => (
          <div key={g.id} className="space-y-2">
            <div className="flex items-baseline justify-between border-b pb-1">
              <h3 className="font-semibold">{g.titulo}</h3>
              <span className="text-sm tabular-nums">{importe(g.subtotal, currency)}</span>
            </div>
            {g.partidas.map(p => (
              <div key={p.clave}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{p.nombre}</span>
                  <span className="text-sm tabular-nums shrink-0">
                    {p.sinDeuda ? <Badge variant="outline">sin deuda</Badge> : importe(p.saldo, p.divisa)}
                    {!p.sinDeuda && p.divisa !== currency && <span className="text-muted-foreground"> ≈ {importe(p.saldoConvertido, currency)}</span>}
                  </span>
                </div>
                {nota(p.clave)}
              </div>
            ))}
          </div>
        ))}

        {inversiones.length > 0 && (
          <div className="space-y-3">
            <div className="border-b pb-1">
              <h3 className="font-semibold">Detalle de inversiones</h3>
              <p className="text-xs text-muted-foreground">Informativo: no suma al patrimonio (ya está en las cuentas).</p>
            </div>
            {inversiones.map(g => (
              <div key={g.tipo} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{g.tipo}</p>
                {g.partidas.map(p => (
                  <div key={p.clave}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate">{p.nombre}</span>
                      <span className="text-sm tabular-nums shrink-0">{importe(p.valor, p.moneda)}</span>
                    </div>
                    {(p.vencimiento || p.tasaAnual !== null) && (
                      <p className="text-xs text-muted-foreground">
                        {p.vencimiento && `Vence ${p.vencimiento}`}{p.vencimiento && p.tasaAnual !== null && ' · '}{p.tasaAnual !== null && `${p.tasaAnual}% anual`}
                      </p>
                    )}
                    {nota(p.clave)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {cripto.length > 0 && (
          <div className="space-y-2">
            <div className="border-b pb-1">
              <h3 className="font-semibold">Criptomonedas</h3>
              <p className="text-xs text-muted-foreground">En USD. Informativo: no suma al patrimonio.</p>
            </div>
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription>Indica dónde están las llaves o el acceso al exchange, nunca la frase semilla.</AlertDescription>
            </Alert>
            {cripto.map(c => (
              <div key={c.clave}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{c.nombre} <span className="text-muted-foreground text-sm">{c.cantidad} {c.simbolo}</span></span>
                  <span className="text-sm tabular-nums shrink-0">
                    {importe(c.valorUsd, 'USD')}{c.aPrecioDeCompra && <span className="text-muted-foreground"> (precio de compra)</span>}
                  </span>
                </div>
                {nota(c.clave)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 4: `PagosFamilia.tsx`**

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DecisionPago } from '@/lib/finance/familia';
import { PagoRecurrente } from '@/lib/finance/familiaResumen';

interface Props {
  pagos: PagoRecurrente[];
  onDecision: (clave: string, p: DecisionPago) => void;
  formatCurrency: (n: number) => string;
}

export const PagosFamilia = ({ pagos, onDecision, formatCurrency }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle>Pagos recurrentes</CardTitle>
      <CardDescription>Suscripciones y pagos anuales: qué mantener y qué cancelar.</CardDescription>
    </CardHeader>
    <CardContent>
      {pagos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay suscripciones ni pagos anuales activos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-36">Qué hacer</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.map(p => (
              <TableRow key={p.clave}>
                <TableCell>
                  <div className="font-medium">{p.concepto}</div>
                  <div className="text-xs text-muted-foreground">{p.frecuencia}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">${formatCurrency(p.monto)} {p.divisa}</TableCell>
                <TableCell>
                  <Select
                    value={p.decision.decision ?? 'ninguna'}
                    onValueChange={v => onDecision(p.clave, { ...p.decision, decision: v === 'ninguna' ? null : (v as 'mantener' | 'cancelar') })}
                  >
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">—</SelectItem>
                      <SelectItem value="mantener">Mantener</SelectItem>
                      <SelectItem value="cancelar">Cancelar</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Cómo cancelarlo, a nombre de quién…"
                    value={p.decision.nota}
                    onChange={e => onDecision(p.clave, { ...p.decision, nota: e.target.value })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);
```

- [ ] **Step 5: `NotasHuerfanas.tsx`**

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';
import { NotaHuerfana } from '@/lib/finance/familia';

interface Props {
  notas: NotaHuerfana[];
  onBorrar: (n: NotaHuerfana) => void;
}

export const NotasHuerfanas = ({ notas, onBorrar }: Props) => (
  <Card className="border-amber-500/40">
    <CardHeader>
      <CardTitle>Notas sin partida</CardTitle>
      <CardDescription>
        Notas de cuentas, inversiones o pagos que ya no existen. Cópialas donde corresponda o bórralas.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      {notas.map(n => (
        <div key={`${n.origen}:${n.clave}`} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm">{n.texto}</p>
            <p className="text-xs text-muted-foreground">{n.clave}</p>
          </div>
          <Button variant="ghost" size="icon" title="Copiar" onClick={() => void navigator.clipboard.writeText(n.texto)}><Copy className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Borrar" onClick={() => { if (window.confirm('¿Borrar esta nota?')) onBorrar(n); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </CardContent>
  </Card>
);
```

- [ ] **Step 6: `src/pages/Familia.tsx`**

```tsx
import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { useEditorFamilia } from '@/hooks/useEditorFamilia';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useInvestments } from '@/hooks/useInvestments';
import { useInvestmentTypes } from '@/hooks/useInvestmentTypes';
import { useCriptomonedas } from '@/hooks/useCriptomonedas';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useAppConfig } from '@/hooks/useAppConfig';
import { groupAnnualPayments, readInactiveAnnualIds } from '@/lib/finance/annualPayments';
import { formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import {
  Contacto, Documento, Seguro, conDecision, conNota, esTablaInexistente, estadoRevision, estadoVencimientoSeguro,
  nuevoContacto, nuevoDocumento, nuevoSeguro, sinHuerfana,
} from '@/lib/finance/familia';
import {
  detalleCriptoFamilia, detalleInversionesFamilia, notasHuerfanas, pagosRecurrentesFamilia, resumenPatrimonioFamilia,
} from '@/lib/finance/familiaResumen';
import { CampoLista, ListaEditable } from '@/components/familia/ListaEditable';
import { IndicadorGuardado } from '@/components/familia/IndicadorGuardado';
import { PatrimonioFamilia } from '@/components/familia/PatrimonioFamilia';
import { PagosFamilia } from '@/components/familia/PagosFamilia';
import { NotasHuerfanas } from '@/components/familia/NotasHuerfanas';

const CAMPOS_CONTACTO: CampoLista<Contacto>[] = [
  { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
  { clave: 'rol', etiqueta: 'Rol', tipo: 'texto', placeholder: 'Notario, contador, agente de seguros…' },
  { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
  { clave: 'email', etiqueta: 'Email', tipo: 'texto' },
  { clave: 'nota', etiqueta: 'Para qué llamarle', tipo: 'area' },
];
const CAMPOS_SEGURO: CampoLista<Seguro>[] = [
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'texto', placeholder: 'Vida, gastos médicos, auto, casa…' },
  { clave: 'aseguradora', etiqueta: 'Aseguradora', tipo: 'texto' },
  { clave: 'poliza', etiqueta: 'Nº de póliza', tipo: 'texto' },
  { clave: 'sumaAsegurada', etiqueta: 'Suma asegurada', tipo: 'numero' },
  { clave: 'divisa', etiqueta: 'Divisa', tipo: 'divisa' },
  { clave: 'beneficiarios', etiqueta: 'Beneficiarios', tipo: 'texto' },
  { clave: 'vencimiento', etiqueta: 'Vencimiento', tipo: 'fecha' },
  { clave: 'comoReclamar', etiqueta: 'Cómo reclamar (agente, teléfono, pasos)', tipo: 'area' },
];
const CAMPOS_DOCUMENTO: CampoLista<Documento>[] = [
  { clave: 'que', etiqueta: 'Qué', tipo: 'texto', placeholder: 'Testamento, escrituras, actas, pasaportes…' },
  { clave: 'donde', etiqueta: 'Dónde está', tipo: 'texto', placeholder: 'Caja fuerte, notaría, carpeta en Drive…' },
  { clave: 'nota', etiqueta: 'Nota', tipo: 'area' },
];

const VENCIMIENTO_CLASE = { vencida: 'text-destructive font-semibold', proxima: 'text-amber-600 font-semibold', vigente: 'text-muted-foreground', sin_fecha: 'text-muted-foreground' };

const Familia = () => {
  const editor = useEditorFamilia();
  const { doc } = editor;
  const { accounts, transactions, categories, loading: finLoading, error: finError } = useFinanceDataSupabase();
  const { investments, loading: invLoading, error: invError } = useInvestments();
  const { types } = useInvestmentTypes();
  const { criptomonedas, loading: criptoLoading, error: criptoError } = useCriptomonedas();
  const { subscriptions, loading: subsLoading, error: subsError } = useSubscriptionServices();
  const { convertCurrency } = useExchangeRates();
  const { config, formatCurrency } = useAppConfig();
  const [inactiveAnnual] = useState(readInactiveAnnualIds);

  const resumen = useMemo(
    () => resumenPatrimonioFamilia({ accounts, transactions, convert: convertCurrency, currency: config.currency }),
    [accounts, transactions, convertCurrency, config.currency]
  );
  const inversiones = useMemo(() => detalleInversionesFamilia(investments, types), [investments, types]);
  const cripto = useMemo(() => detalleCriptoFamilia(criptomonedas), [criptomonedas]);
  const annualGroups = useMemo(() => groupAnnualPayments(categories, transactions), [categories, transactions]);
  const pagos = useMemo(
    () => (doc ? pagosRecurrentesFamilia({
      subscriptions, annualGroups, transactions, inactiveAnnualIds: inactiveAnnual, baseCurrency: config.currency, decisiones: doc.pagos,
    }) : []),
    [doc, subscriptions, annualGroups, transactions, inactiveAnnual, config.currency]
  );
  const fuentesListas = !finLoading && !invLoading && !criptoLoading && !subsLoading && !finError && !invError && !criptoError && !subsError;
  const huerfanas = useMemo(
    () => (doc && fuentesListas ? notasHuerfanas(doc, {
      cuentas: accounts.map(a => a.id),
      inversiones: investments.map(i => i.id),
      criptos: criptomonedas.map(c => c.id),
      suscripciones: subscriptions.map(s => s.id),
      anuales: annualGroups.map(g => g.id),
    }) : []),
    [doc, fuentesListas, accounts, investments, criptomonedas, subscriptions, annualGroups]
  );

  const revision = estadoRevision(editor.fila?.revisadoAt ?? null);
  const migracionPendiente = !!editor.error && esTablaInexistente(editor.error);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Para mi familia</h1>
          <p className="text-muted-foreground">Lo que necesitaríais saber si un día no estoy. Se guarda solo mientras escribes.</p>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Última revisión</p>
              <p className="font-semibold">
                {editor.fila?.revisadoAt ? formatFechaCorta(new Date(editor.fila.revisadoAt)) : 'Nunca'}
                {revision === 'vencida' && <Badge variant="destructive" className="ml-2">Toca revisarla</Badge>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <IndicadorGuardado estado={editor.estado} onReintentar={editor.reintentar} onRecargar={editor.recargar} onGuardarLaMia={editor.guardarLaMia} />
              <Button onClick={editor.marcarRevisado} disabled={!editor.fila || editor.estado !== 'guardado'}>Marcar como revisado</Button>
            </div>
          </CardContent>
        </Card>

        {migracionPendiente ? (
          <Card><CardContent className="p-6 text-center">Falta aplicar la migración <code>informacion_familia</code> en Supabase.</CardContent></Card>
        ) : editor.error ? (
          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
              <p>No se pudo cargar la información para tu familia.</p>
              <Button variant="outline" onClick={editor.recargar}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : !doc ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Si estás leyendo esto</CardTitle>
                <CardDescription>Los primeros pasos, en orden: a quién llamar, qué no cancelar, qué hacer primero.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea rows={10} value={doc.carta} onChange={e => { const carta = e.target.value; editor.actualizar(d => ({ ...d, carta })); }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contactos clave</CardTitle></CardHeader>
              <CardContent>
                <ListaEditable
                  items={doc.contactos}
                  campos={CAMPOS_CONTACTO}
                  nuevo={nuevoContacto}
                  onChange={contactos => editor.actualizar(d => ({ ...d, contactos }))}
                  tituloDialogo="Contacto"
                  textoAnadir="Añadir contacto"
                  vacio="Aún no hay contactos."
                  renderItem={c => (
                    <div className="text-sm">
                      <p className="font-medium">{c.nombre || 'Sin nombre'} {c.rol && <span className="text-muted-foreground font-normal">· {c.rol}</span>}</p>
                      <p className="text-muted-foreground">{[c.telefono, c.email].filter(Boolean).join(' · ')}</p>
                      {c.nota && <p>{c.nota}</p>}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Seguros</CardTitle></CardHeader>
              <CardContent>
                <ListaEditable
                  items={doc.seguros}
                  campos={CAMPOS_SEGURO}
                  nuevo={nuevoSeguro}
                  onChange={seguros => editor.actualizar(d => ({ ...d, seguros }))}
                  tituloDialogo="Seguro"
                  textoAnadir="Añadir seguro"
                  vacio="Aún no hay seguros."
                  renderItem={s => {
                    const venc = estadoVencimientoSeguro(s.vencimiento);
                    return (
                      <div className="text-sm space-y-0.5">
                        <p className="font-medium">{s.tipo || 'Seguro'} {s.aseguradora && <span className="text-muted-foreground font-normal">· {s.aseguradora}</span>}</p>
                        <p className="text-muted-foreground">
                          {s.poliza && `Póliza ${s.poliza}`}{s.sumaAsegurada !== null && ` · Suma $${formatCurrency(s.sumaAsegurada)} ${s.divisa}`}
                        </p>
                        {s.beneficiarios && <p>Beneficiarios: {s.beneficiarios}</p>}
                        {s.vencimiento && <p className={VENCIMIENTO_CLASE[venc]}>{venc === 'vencida' ? 'Vencida' : 'Vence'} {formatFechaCorta(parseFechaLocal(s.vencimiento))}</p>}
                        {s.comoReclamar && <p className="whitespace-pre-line">{s.comoReclamar}</p>}
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}

        <PatrimonioFamilia
          resumen={resumen}
          inversiones={inversiones}
          cripto={cripto}
          notas={doc?.notasPatrimonio ?? {}}
          onNota={doc ? (clave, texto) => editor.actualizar(d => conNota(d, clave, texto)) : undefined}
          currency={config.currency}
          formatCurrency={formatCurrency}
        />

        {doc && (
          <>
            <PagosFamilia pagos={pagos} onDecision={(clave, p) => editor.actualizar(d => conDecision(d, clave, p))} formatCurrency={formatCurrency} />

            <Card>
              <CardHeader><CardTitle>Documentos y accesos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>No escribas contraseñas aquí; indica dónde están (gestor, caja fuerte) y quién tiene acceso.</AlertDescription>
                </Alert>
                <ListaEditable
                  items={doc.documentos}
                  campos={CAMPOS_DOCUMENTO}
                  nuevo={nuevoDocumento}
                  onChange={documentos => editor.actualizar(d => ({ ...d, documentos }))}
                  tituloDialogo="Documento"
                  textoAnadir="Añadir documento"
                  vacio="Aún no hay documentos."
                  renderItem={d => (
                    <div className="text-sm">
                      <p className="font-medium">{d.que || 'Sin título'}</p>
                      {d.donde && <p className="text-muted-foreground">{d.donde}</p>}
                      {d.nota && <p>{d.nota}</p>}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {huerfanas.length > 0 && <NotasHuerfanas notas={huerfanas} onBorrar={h => editor.actualizar(d => sinHuerfana(d, h))} />}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Familia;
```

- [ ] **Step 7: Ruta** — en `src/App.tsx`, tras `const Alertas = lazy(...)`: `const Familia = lazy(() => import("./pages/Familia"));` y, justo antes de la ruta `/alertas`:

```tsx
              <Route path="/familia" element={
                <ProtectedRoute>
                  <Responsive desktop={Familia} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
```

- [ ] **Step 8: Menú** — en `src/components/Layout.tsx` añadir `HeartHandshake` al import de lucide-react y, tras la línea de «Informes Financieros» (l.50):

```ts
    { path: '/familia', icon: HeartHandshake, label: 'Para mi familia' },
```

- [ ] **Step 9: Verificar** — `npx tsc --noEmit -p tsconfig.app.json`, `npx vitest run`, `npm run build` → verdes.

- [ ] **Step 10: Commit**

```bash
git add src/components/familia src/pages/Familia.tsx src/App.tsx src/components/Layout.tsx
git commit -m "Página «Para mi familia»: carta, contactos, seguros, patrimonio, pagos y documentos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Backup con la tabla nueva y CSV bien escapado

**Files:**
- Create: `src/lib/csv.ts`
- Test: `src/lib/csv.test.ts`
- Modify: `src/components/DatabaseBackup.tsx:10-28, 78-88, 128-135, 160-163`

**Interfaces:**
- Produces: `valorCSV(value: unknown): string`.

- [ ] **Step 1: Test que falla** — `src/lib/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { valorCSV } from './csv';

describe('valorCSV', () => {
  it('vacío para null/undefined y tal cual para valores simples', () => {
    expect(valorCSV(null)).toBe('');
    expect(valorCSV(undefined)).toBe('');
    expect(valorCSV(12.5)).toBe('12.5');
    expect(valorCSV(true)).toBe('true');
    expect(valorCSV('hola')).toBe('hola');
  });

  it('entrecomilla comas, comillas y saltos de línea, duplicando las comillas', () => {
    expect(valorCSV('a,b')).toBe('"a,b"');
    expect(valorCSV('dijo "sí"')).toBe('"dijo ""sí"""');
    expect(valorCSV('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(valorCSV('a\r\nb')).toBe('"a\r\nb"');
  });

  it('serializa objetos y arrays como JSON escapado', () => {
    expect(valorCSV({ carta: 'Hola' })).toBe('"{""carta"":""Hola""}"');
    expect(valorCSV(['x'])).toBe('"[""x""]"');
  });
});
```

- [ ] **Step 2: Ejecutar** — `npx vitest run src/lib/csv.test.ts` → FAIL.

- [ ] **Step 3: Implementar** — `src/lib/csv.ts`:

```ts
/** Celda CSV (RFC 4180): objetos como JSON; entrecomilla si hay comas, comillas o saltos de línea. */
export const valorCSV = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
```

- [ ] **Step 4: Ejecutar** — `npx vitest run src/lib/csv.test.ts` → PASS.

- [ ] **Step 5: Usarlo en `DatabaseBackup.tsx`**
  - `TableSelection` y el estado inicial: añadir `informacion_familia: boolean` / `informacion_familia: true`.
  - `tableLabels`: `informacion_familia: 'Información para la familia'`.
  - Import `import { valorCSV } from '@/lib/csv';` y sustituir el bloque de valores (l.78-88) por:

```ts
          data.forEach(row => {
            csvContent += headers.map(header => valorCSV((row as Record<string, unknown>)[header])).join(',') + '\n';
          });
```

  - En el `AlertDialogDescription`, tras «Elige qué datos quieres incluir en tu copia de seguridad:» añadir: `El archivo contiene tus datos personales sin cifrar: guárdalo en un lugar seguro.`

- [ ] **Step 6: Verificar** — `npx tsc --noEmit -p tsconfig.app.json` y `npx vitest run` → verdes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts src/components/DatabaseBackup.tsx
git commit -m "Backup: incluye la información familiar y escapa bien comillas y saltos de línea

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Changelog y verificación final

**Files:**
- Modify: `src/components/Changelog.tsx:1-2, 10` (nueva entrada 8.1 al principio de `changelog`)

- [ ] **Step 1: Entrada 8.1** — añadir `HeartHandshake` y `Database` al import de lucide-react y, como primer elemento del array:

```tsx
  {
    version: '8.1',
    date: 'Septiembre 2026',
    changes: [
      { icon: <HeartHandshake className="h-4 w-4" />, text: 'Nueva página "Para mi familia": carta de primeros pasos, contactos clave, seguros, documentos y accesos, más el patrimonio y los pagos recurrentes calculados solos, cada partida con su nota para la familia. Se guarda sola mientras escribes', type: 'feature' },
      { icon: <Bell className="h-4 w-4" />, text: 'Alerta para revisar la información familiar cuando pasan más de 180 días sin marcarla como revisada', type: 'feature' },
      { icon: <Database className="h-4 w-4" />, text: 'La copia de seguridad incluye la información familiar y ya no se rompe con comillas o saltos de línea en los textos', type: 'fix' },
    ],
  },
```

(Añadir también `Bell` al import si no está.)

- [ ] **Step 2: Verificación automática** — `npx vitest run` (≈200 tests, todos PASS), `npx tsc --noEmit -p tsconfig.app.json`, `npm run build` → verdes. Anotar el número de tests.

- [ ] **Step 3: Commit**

```bash
git add src/components/Changelog.tsx
git commit -m "Changelog 8.1: Para mi familia

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Verificación manual (requiere que el usuario haya aplicado la migración)** — con `npm run dev` y el navegador:
  1. Sin migración: `/familia` muestra «Falta aplicar la migración…» y el patrimonio; el resto de la app y las alertas funcionan.
  2. Con migración: escribir en la carta → «Sin guardar» → «Guardando…» → «Guardado»; recargar la página y el texto sigue ahí; «Última revisión» = hoy (primer guardado).
  3. Escribir y cambiar enseguida de página por el menú → volver: el cambio está guardado.
  4. Dos pestañas: guardar en A, luego editar en B → «Se guardó una versión más nueva…»; *Recargar* trae lo de A; *Guardar la mía* impone B.
  5. Añadir contacto, seguro vencido (rojo) y a 20 días (ámbar), documento; nota en una cuenta, en una inversión y en una cripto; decisión en un pago.
  6. Patrimonio neto igual al KPI de Informes › Patrimonio Neto.
  7. En SQL: `update informacion_familia set revisado_at = now() - interval '200 days' where user_id = '<uid>';` → alerta en `/alertas` (sin importe) y en el Resumen móvil; «Marcar como revisado» la quita.
  8. Configuración › Copia de seguridad → abrir el CSV: la sección INFORMACION_FAMILIA con el JSON en una celda y la carta multilínea sin romper filas.
  9. Móvil (`/familia` < 768 px): «Solo disponible en escritorio».

Push y versión en producción: **solo cuando el usuario lo pida**.
