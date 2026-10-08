import { describe, expect, it } from 'vitest';
import { Account, AccountType, Category, Transaction, TransactionType } from '@/types/finance';
import divisas from '../../../shared/fixtures/divisas.json';
import vencidos from '../../../shared/fixtures/vencidos.json';
import suscripciones from '../../../shared/fixtures/suscripciones.json';
import mesAnterior from '../../../shared/fixtures/mes_anterior.json';
import cxp from '../../../shared/fixtures/cxp.json';
import inversiones from '../../../shared/fixtures/inversiones.json';
import { parseFechaLocal, toFechaISO } from './fechas';
import { convertWithRates, Tasas } from './currency';
import { ConvertCurrency, CurrencyCode, computeDashboardMetrics } from './dashboardMetrics';
import { computePendingsSummary, PendingForSummary } from './pendingsSummary';
import { computeSubscriptionsSummary, estadoSuscripcion } from './subscriptionsSummary';
import { computeCxP, CxPSubscription } from './cxp';
import { investmentReturn, totalesInversiones, valorActualInversion } from './investmentReturn';
import type { Investment, InvestmentValuation } from '@/types/investments';

// Contrato con la app iOS: ver shared/fixtures/README.md.
const TOL = 6; // decimales de tolerancia (1e-6)

const convertir = (tasas: Tasas): ConvertCurrency => (importe, de, a) => convertWithRates(importe, de, a, tasas);

/** 'YYYY-MM-DDTHH:mm:ss' sin zona → Date local (ECMAScript lo interpreta como hora local). */
const ahora = (s: string) => new Date(s);

/** Día de calendario (local) de una fecha de salida. */
const dia = (d: Date) => toFechaISO(d);

type TxFixture = {
  id: string; fecha: string; ingreso?: number; gasto?: number; divisa?: string;
  subcategoriaId?: string; tipo?: string; categoria?: string;
};

/** Igual que mapTransactions: `fecha` a medianoche local. */
const tx = (f: TxFixture): Transaction => ({
  id: f.id, cuentaId: 'a1', fecha: parseFechaLocal(f.fecha), comentario: '',
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

describe('fixtures compartidos · inversiones', () => {
  const saldos = inversiones.saldosCuenta as Record<string, number>;
  const conValor = inversiones.inversiones.map((i) => ({
    ...i,
    valor_actual: valorActualInversion(i, inversiones.valuaciones, i.cuenta_id ? saldos[i.cuenta_id] : undefined),
    saldo_cuenta: i.cuenta_id ? saldos[i.cuenta_id] : null,
  }));
  conValor.forEach((i) => {
    it(`rendimiento de ${i.id}`, () => {
      const esperado = (inversiones.esperado.porInversion as Record<string, { valor: number; invertido: number; delta: number; pct: number }>)[i.id];
      const r = investmentReturn(i as unknown as Investment, inversiones.valuaciones as unknown as InvestmentValuation[]);
      expect(r.valor).toBeCloseTo(esperado.valor, TOL);
      expect(r.invertido).toBeCloseTo(esperado.invertido, TOL);
      expect(r.delta).toBeCloseTo(esperado.delta, TOL);
      expect(r.pct).toBeCloseTo(esperado.pct, TOL);
    });
  });
  it('totales de las activas', () => {
    const r = totalesInversiones(conValor, convertir(inversiones.tasas), inversiones.moneda as CurrencyCode);
    expect(r.invertido).toBeCloseTo(inversiones.esperado.totales.invertido, TOL);
    expect(r.valor).toBeCloseTo(inversiones.esperado.totales.valor, TOL);
  });
});
