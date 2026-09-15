import { describe, expect, it } from 'vitest';
import { Account, Transaction } from '@/types/finance';
import { computeDashboardMetrics, ConvertCurrency } from './dashboardMetrics';

// Tasas fijas para el test: 1 USD = 20 MXN, 1 EUR = 22 MXN
const RATES = { MXN: 1, USD: 20, EUR: 22 };
const convert: ConvertCurrency = (amount, from, to) => {
  if (from === to) return amount;
  return (amount * RATES[from]) / RATES[to];
};

// "Hoy" fijo: 15 de septiembre de 2026
const NOW = new Date(2026, 8, 15);

const account = (over: Partial<Account>): Account => ({
  id: 'a1', nombre: 'Banco', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN', ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos',
  ...over,
});

describe('computeDashboardMetrics · ingresos y gastos del mes', () => {
  it('suma ingresos y gastos del mes actual y calcula el balance', () => {
    const m = computeDashboardMetrics([], [
      tx({ ingreso: 10000, tipo: 'Ingreso', categoria: 'Sueldo' }),
      tx({ gasto: 1500 }),
      tx({ gasto: 500 }),
    ], convert, 'MXN', NOW);
    expect(m.ingresosMes).toBe(10000);
    expect(m.gastosMes).toBe(2000);
    expect(m.balanceMes).toBe(8000);
  });

  it('un reembolso (ingreso en categoría de gasto) resta del gasto, no suma al ingreso', () => {
    const m = computeDashboardMetrics([], [
      tx({ gasto: 1000 }),
      tx({ ingreso: 300 }), // reembolso: ingreso > 0 con tipo 'Gastos'
    ], convert, 'MXN', NOW);
    expect(m.gastosMes).toBe(700);
    expect(m.ingresosMes).toBe(0);
  });

  it('excluye "Compra Venta Inmuebles" de ingresos y gastos', () => {
    const m = computeDashboardMetrics([], [
      tx({ ingreso: 5_000_000, tipo: 'Ingreso', categoria: 'Compra Venta Inmuebles' }),
      tx({ gasto: 100_000, tipo: 'Gastos', categoria: 'Compra Venta Inmuebles' }),
      tx({ ingreso: 100, tipo: 'Ingreso', categoria: 'Sueldo' }),
    ], convert, 'MXN', NOW);
    expect(m.ingresosMes).toBe(100);
    expect(m.gastosMes).toBe(0);
  });

  it('convierte cada transacción a la divisa preferida', () => {
    const m = computeDashboardMetrics([], [
      tx({ ingreso: 100, divisa: 'USD', tipo: 'Ingreso', categoria: 'Sueldo' }),
      tx({ gasto: 10, divisa: 'EUR' }),
    ], convert, 'MXN', NOW);
    expect(m.ingresosMes).toBe(2000);
    expect(m.gastosMes).toBe(220);
  });

  it('separa mes actual, mes anterior y año anterior por fecha local', () => {
    const m = computeDashboardMetrics([], [
      tx({ ingreso: 1, tipo: 'Ingreso', categoria: 'S', fecha: new Date(2026, 8, 30) }),  // sep 2026
      tx({ ingreso: 2, tipo: 'Ingreso', categoria: 'S', fecha: new Date(2026, 7, 31) }),  // ago 2026
      tx({ ingreso: 4, tipo: 'Ingreso', categoria: 'S', fecha: new Date(2025, 11, 31) }), // dic 2025
    ], convert, 'MXN', NOW);
    expect(m.ingresosMes).toBe(1);
    expect(m.ingresosMesAnterior).toBe(2);
    expect(m.ingresosAnio).toBe(3);
    expect(m.ingresosAnioAnterior).toBe(4);
    expect(m.variacionIngresosMes).toBe(-50);
  });
});

describe('computeDashboardMetrics · activos, pasivos y patrimonio', () => {
  it('clasifica cuentas por tipo y convierte a la divisa preferida', () => {
    const accounts = [
      account({ id: 'b', tipo: 'Banco', saldoActual: 1000 }),
      account({ id: 'e', tipo: 'Efectivo', saldoActual: 500 }),
      account({ id: 'i', tipo: 'Inversiones', saldoActual: 100, divisa: 'USD' }),
      account({ id: 'r', tipo: 'Bien Raíz', saldoActual: 10000 }),
      account({ id: 'p', tipo: 'Empresa Propia', saldoActual: 300 }),
      account({ id: 'tc', tipo: 'Tarjeta de Crédito', saldoActual: -400 }),
      account({ id: 'h', tipo: 'Hipoteca', saldoActual: -50, divisa: 'EUR' }),
    ];
    const m = computeDashboardMetrics(accounts, [], convert, 'MXN', NOW);
    expect(m.activos.efectivoBancos).toBe(1500);
    expect(m.activos.inversiones).toBe(2000);
    expect(m.activos.bienRaiz).toBe(10000);
    expect(m.activos.empresasPrivadas).toBe(300);
    expect(m.activos.total).toBe(13800);
    expect(m.pasivos.tarjetasCredito).toBe(400);
    expect(m.pasivos.hipoteca).toBe(1100);
    expect(m.pasivos.total).toBe(1500);
    expect(m.patrimonioNeto).toBe(12300);
  });

  it('una tarjeta con saldo positivo no cuenta como pasivo', () => {
    const m = computeDashboardMetrics([account({ tipo: 'Tarjeta de Crédito', saldoActual: 250 })], [], convert, 'MXN', NOW);
    expect(m.pasivos.tarjetasCredito).toBe(0);
  });

  it('una propiedad vendida no cuenta en activos', () => {
    const m = computeDashboardMetrics([account({ tipo: 'Bien Raíz', saldoActual: 5000, vendida: true })], [], convert, 'MXN', NOW);
    expect(m.activos.bienRaiz).toBe(0);
  });

  it('con divisa preferida USD los saldos MXN se convierten', () => {
    const m = computeDashboardMetrics([account({ tipo: 'Banco', saldoActual: 2000 })], [], convert, 'USD', NOW);
    expect(m.activos.efectivoBancos).toBe(100);
  });
});
