import { describe, expect, it } from 'vitest';
import { Account, Category, Transaction } from '@/types/finance';
import { computeAccountBalances, enrichTransactions } from './calculations';

const account = (over: Partial<Account>): Account => ({
  id: 'a1', nombre: 'Banco', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN', ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 1), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

describe('computeAccountBalances', () => {
  it('saldoActual = saldoInicial + suma de montos de la cuenta', () => {
    const accounts = [account({ id: 'a1', saldoInicial: 1000 }), account({ id: 'a2', saldoInicial: 50 })];
    const transactions = [
      tx({ cuentaId: 'a1', monto: 200 }),
      tx({ cuentaId: 'a1', monto: -75.5 }),
      tx({ cuentaId: 'a2', monto: -10 }),
    ];
    const [a1, a2] = computeAccountBalances(accounts, transactions);
    expect(a1.saldoActual).toBeCloseTo(1124.5);
    expect(a2.saldoActual).toBeCloseTo(40);
  });

  it('ignora valorMercado: el saldo sale siempre de las transacciones', () => {
    const [inv] = computeAccountBalances(
      [account({ tipo: 'Inversiones', saldoInicial: 100, valorMercado: 999 })],
      [tx({ monto: 25 })]
    );
    expect(inv.saldoActual).toBe(125);
    expect(inv.valorMercado).toBe(999);
  });
});

describe('enrichTransactions', () => {
  const categories: Category[] = [
    { id: 'c1', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos' },
  ];

  it('añade categoría, subcategoría y tipo de la categoría', () => {
    const [t] = enrichTransactions([tx({ subcategoriaId: 'c1' })], categories);
    expect(t.categoria).toBe('Casa');
    expect(t.subcategoria).toBe('Luz');
    expect(t.tipo).toBe('Gastos');
  });

  it('marca SIN ASIGNAR cuando la categoría no existe', () => {
    const [t] = enrichTransactions([tx({ subcategoriaId: 'nope' })], categories);
    expect(t.categoria).toBe('SIN ASIGNAR');
    expect(t.subcategoria).toBe('SIN ASIGNAR');
    expect(t.tipo).toBeUndefined();
  });
});
