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
