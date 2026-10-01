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
    account({ id: 'tc0', nombre: 'Visa', tipo: 'Tarjeta de Crédito', saldoInicial: 50 }),
    account({ id: 'cero', nombre: 'Pagaré saldado', tipo: 'Inversiones', saldoInicial: 0 }),
    account({ id: 'tc', nombre: 'Amex', tipo: 'Tarjeta de Crédito', saldoInicial: -300 }),
  ];
  const txs = [tx({ cuentaId: 'b', monto: 200, fecha: new Date(2026, 8, 10) })]; // mes en curso
  const r = resumenPatrimonioFamilia({ accounts, transactions: txs, convert, currency: 'MXN', now: NOW });

  it('agrupa por tipo en orden fijo, omite grupos vacíos y excluye vendidas', () => {
    expect(r.grupos.map(g => g.id)).toEqual(['liquidez', 'inversiones', 'inmuebles', 'deudas']);
    expect(r.grupos.find(g => g.id === 'inmuebles')!.partidas.map(p => p.nombre)).toEqual(['Casa']);
  });

  it('no lista cuentas con saldo cero', () => {
    expect(r.grupos.flatMap(g => g.partidas).map(p => p.nombre)).not.toContain('Pagaré saldado');
  });

  it('el total es igual al último punto de computeNetWorthHistory, con movimientos del mes en curso', () => {
    const puntos = computeNetWorthHistory(accounts, txs, convert, 'MXN', NOW);
    const last = puntos[puntos.length - 1];
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
      inv({ id: 'd', nombre: 'Suelta', valor_actual: 5 }),
      inv({ id: 'e', nombre: 'Saldada', tipo_id: 'cete' }),
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
