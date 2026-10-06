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
