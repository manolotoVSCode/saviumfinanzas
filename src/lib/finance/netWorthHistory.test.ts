import { describe, expect, it } from 'vitest';
import { Account, Transaction } from '@/types/finance';
import { computeNetWorthHistory } from './netWorthHistory';
import { ConvertCurrency } from './dashboardMetrics';

const RATES = { MXN: 1, USD: 20, EUR: 22 };
const convert: ConvertCurrency = (amount, from, to) => (from === to ? amount : (amount * RATES[from]) / RATES[to]);
const NOW = new Date(2026, 8, 15); // 15 sep 2026

const account = (over: Partial<Account>): Account => ({
  id: 'a1', nombre: 'Banco', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN', ...over,
});
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

describe('computeNetWorthHistory', () => {
  it('reconstruye el saldo al cierre de cada mes acumulando movimientos', () => {
    const points = computeNetWorthHistory(
      [account({ saldoInicial: 1000 })],
      [
        tx({ fecha: new Date(2026, 6, 10), monto: 500 }),   // jul
        tx({ fecha: new Date(2026, 7, 31), monto: -200 }),  // ago (último día)
        tx({ fecha: new Date(2026, 8, 1), monto: 100 }),    // sep
      ],
      convert, 'MXN', NOW
    );
    expect(points.map(p => p.label)).toEqual(['Jul 2026', 'Ago 2026', 'Sep 2026']);
    expect(points.map(p => p.patrimonio)).toEqual([1500, 1300, 1400]);
  });

  it('separa activos y pasivos como el dashboard y excluye propiedades vendidas', () => {
    const accounts = [
      account({ id: 'b', tipo: 'Banco', saldoInicial: 1000 }),
      account({ id: 'tc', tipo: 'Tarjeta de Crédito', saldoInicial: -300 }),
      account({ id: 'r', tipo: 'Bien Raíz', saldoInicial: 9999, vendida: true }),
    ];
    const [p] = computeNetWorthHistory(accounts, [], convert, 'MXN', NOW);
    expect(p.activos).toBe(1000);
    expect(p.pasivos).toBe(300);
    expect(p.patrimonio).toBe(700);
  });

  it('convierte cada cuenta a la divisa preferida', () => {
    const [p] = computeNetWorthHistory([account({ saldoInicial: 100, divisa: 'USD' })], [], convert, 'MXN', NOW);
    expect(p.patrimonio).toBe(2000);
  });

  it('cubre meses sin movimientos y recorta a los últimos N', () => {
    const points = computeNetWorthHistory(
      [account({ saldoInicial: 10 })],
      [tx({ fecha: new Date(2026, 2, 1), monto: 5 })], // marzo
      convert, 'MXN', NOW
    );
    expect(points).toHaveLength(7); // mar..sep
    expect(points.every(p => p.patrimonio === 15)).toBe(true);
    const last3 = computeNetWorthHistory([account({ saldoInicial: 10 })], [tx({ fecha: new Date(2026, 2, 1), monto: 5 })], convert, 'MXN', NOW, 3);
    expect(last3.map(p => p.label)).toEqual(['Jul 2026', 'Ago 2026', 'Sep 2026']);
  });

  it('sin cuentas relevantes devuelve vacío', () => {
    expect(computeNetWorthHistory([], [], convert, 'MXN', NOW)).toEqual([]);
  });
});
