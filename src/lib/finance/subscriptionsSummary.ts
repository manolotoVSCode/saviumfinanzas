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
