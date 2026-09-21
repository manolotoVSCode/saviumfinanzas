import { Account, Category, Transaction } from '@/types/finance';
import { CurrencyCode } from './dashboardMetrics';

export type CxPTipo = 'Suscripción' | 'Pago anual' | 'Recurrente mensual' | 'Tarjeta de crédito' | 'Préstamo';

export interface CxPRow {
  id: string;
  concepto: string;
  tipo: CxPTipo;
  monto: number;
  divisa: CurrencyCode;
  fechaEstimada: Date;
  detalle?: string;
}

/** Subconjunto de subscription_services que necesita el cálculo. */
export interface CxPSubscription {
  id: string;
  service_name: string;
  active: boolean;
  frecuencia: string;
  proximo_pago: string;
  ultimo_pago_monto: number;
}

export interface CxPInput {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  subscriptions: CxPSubscription[];
  /** Días hacia adelante (30, 60, 90). */
  horizonte: number;
  /** Divisa del perfil: fallback de filas sin divisa y parte de la clave de agrupación de recurrentes. */
  baseCurrency: CurrencyCode;
  now?: Date;
}

const DIA_MS = 1000 * 60 * 60 * 24;

/**
 * Cuentas por pagar estimadas en el horizonte: suscripciones, pagos anuales,
 * recurrentes, tarjetas y préstamos. Devuelve las filas con su divisa (no
 * convierte) ordenadas por fecha estimada. Un único `now` para las cinco fuentes.
 */
export const computeCxP = ({
  transactions, categories, accounts, subscriptions, horizonte, baseCurrency, now = new Date(),
}: CxPInput): CxPRow[] => {
  const limite = new Date(now);
  limite.setDate(now.getDate() + horizonte);

  // 1) Suscripciones activas próximas al horizonte
  const cxpSuscripciones: CxPRow[] = subscriptions
    .filter((s) => s.active)
    .filter((s) => {
      const px = new Date(s.proximo_pago);
      return px >= now && px <= limite;
    })
    .map((s) => ({
      id: `sub-${s.id}`,
      concepto: s.service_name,
      tipo: 'Suscripción' as const,
      monto: Number(s.ultimo_pago_monto) || 0,
      divisa: baseCurrency, // subscription_services no guarda divisa → divisa del perfil
      fechaEstimada: new Date(s.proximo_pago),
      detalle: s.frecuencia,
    }));

  // 2) Pagos anuales próximos (categorías anuales, next payment = last + 1 año)
  const cxpAnuales: CxPRow[] = [];
  const anualCats = categories.filter((c) => {
    const s = `${c.categoria} ${c.subcategoria}`.toLowerCase();
    const esPrestamo = s.includes('préstamo') || s.includes('prestamo') || s.includes('hipoteca');
    return c.frecuencia_seguimiento === 'anual' && c.tipo === 'Gastos' && !esPrestamo;
  });
  anualCats.forEach((cat) => {
    const txs = transactions
      .filter((t) => t.subcategoriaId === cat.id && t.gasto > 0)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    if (!txs.length) return;
    const last = txs[0];
    const nextDate = new Date(last.fecha);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    // Si ya pasó, rodar hacia adelante en incrementos anuales
    while (nextDate < now) nextDate.setFullYear(nextDate.getFullYear() + 1);
    if (nextDate <= limite) {
      cxpAnuales.push({
        id: `anual-${cat.id}`,
        concepto: `${cat.categoria} · ${cat.subcategoria}`,
        tipo: 'Pago anual',
        monto: Number(last.gasto),
        divisa: (last.divisa as CurrencyCode) || baseCurrency,
        fechaEstimada: nextDate,
        detalle: 'Estimado según último pago',
      });
    }
  });

  // 3) Recurrentes — obligaciones fijas ineludibles agrupadas POR SUBCATEGORÍA.
  //    Detecta periodicidad real (mensual, bimensual, trimestral) según el espaciado
  //    entre pagos y usa el promedio de los ÚLTIMOS 2 PAGOS como monto de referencia.
  const cxpRecurrentes: CxPRow[] = [];
  const desde = new Date(now);
  desde.setDate(desde.getDate() - 240); // ventana amplia para captar bimensuales/trimestrales

  const catsById = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // Whitelist: SOLO obligaciones fijas ineludibles.
  const esObligacionFija = (cat: Category) => {
    const c = (cat.categoria || '').toLowerCase();
    const s = (cat.subcategoria || '').toLowerCase();
    if (c === 'hogar' && !s.includes('alquiler') && !s.includes('hipoteca') && !s.includes('servicios hogar') && s !== 'servicios') return true;
    if (c === 'educación' || c === 'educacion') return true;
    if (c === 'servicios' && (s.includes('celular') || s.includes('telefon') || s.includes('internet'))) return true;
    if (c === 'salud' && s.includes('seguro')) return true;
    if (c === 'transporte' && s.includes('seguro')) return true;
    return false;
  };

  // Agrupar por subcategoría + divisa (mismo servicio en distintos países = recurrentes distintos)
  const bySubcat = new Map<string, { txs: Transaction[]; cat: Category; divisa: string }>();
  transactions.forEach((t) => {
    if (!t.subcategoriaId || !(t.gasto > 0)) return;
    const fecha = new Date(t.fecha);
    if (fecha < desde) return;
    const cat = catsById.get(t.subcategoriaId);
    if (!cat || cat.tipo !== 'Gastos') return;
    if (!esObligacionFija(cat)) return;
    if (cat.frecuencia_seguimiento === 'anual') return;
    const label = `${cat.categoria} ${cat.subcategoria}`.toLowerCase();
    if (label.includes('suscripc')) return;
    if (label.includes('prestamo') || label.includes('préstamo') || label.includes('hipoteca')) return;

    const divisa = (t.divisa as string) || baseCurrency;
    const key = `${t.subcategoriaId}::${divisa}`;
    const g = bySubcat.get(key) || { txs: [], cat, divisa };
    g.txs.push(t);
    bySubcat.set(key, g);
  });

  bySubcat.forEach(({ txs, cat, divisa }) => {
    const sorted = txs.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    if (sorted.length < 2) return;

    // Detectar periodicidad: mediana de gaps (días) entre pagos consecutivos
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const d1 = new Date(sorted[i].fecha).getTime();
      const d2 = new Date(sorted[i + 1].fecha).getTime();
      gaps.push((d1 - d2) / DIA_MS);
    }
    gaps.sort((a, b) => a - b);
    const gapMed = gaps[Math.floor(gaps.length / 2)];

    // Clasificar en 1, 2 o 3 meses
    let periodoMeses = 1;
    let etiqueta = 'mensual';
    if (gapMed >= 75) {
      periodoMeses = 3;
      etiqueta = 'trimestral';
    } else if (gapMed >= 45) {
      periodoMeses = 2;
      etiqueta = 'bimensual';
    }

    const last = sorted[0];
    const lastDate = new Date(last.fecha);
    const diasDesdeUltimo = (now.getTime() - lastDate.getTime()) / DIA_MS;
    // Tolerancia: 1.5x el periodo esperado (mínimo 45 días para dar margen a mensuales)
    const tolerancia = Math.max(45, periodoMeses * 30 * 1.5);
    if (diasDesdeUltimo > tolerancia) return;

    // Monto = promedio de los últimos 2 pagos
    const ultimos = sorted.slice(0, 2);
    const monto = ultimos.reduce((s, t) => s + Number(t.gasto), 0) / ultimos.length;

    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + periodoMeses);
    while (nextDate < now) nextDate.setMonth(nextDate.getMonth() + periodoMeses);
    if (nextDate > limite) return;

    cxpRecurrentes.push({
      id: `rec-${cat.id}-${divisa}`,
      concepto: `${cat.categoria} · ${cat.subcategoria}`,
      tipo: 'Recurrente mensual',
      monto,
      divisa: divisa as CurrencyCode,
      fechaEstimada: nextDate,
      detalle: `${etiqueta} · prom. últimos 2`,
    });
  });

  // 4) Tarjetas de crédito con saldo negativo
  const cxpTarjetas: CxPRow[] = accounts
    .filter((a) => a.tipo === 'Tarjeta de Crédito' && !a.vendida && a.saldoActual < 0)
    .map((a) => {
      // Fecha estimada: 15 días adelante como aproximación
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + 15);
      return {
        id: `card-${a.id}`,
        concepto: a.nombre,
        tipo: 'Tarjeta de crédito' as const,
        monto: Math.abs(a.saldoActual),
        divisa: (a.divisa as CurrencyCode) || baseCurrency,
        fechaEstimada: nextDate,
        detalle: 'Saldo pendiente actual',
      };
    });

  // 5) Préstamos (subcategoría contiene "Préstamo" o "Hipoteca")
  const cxpPrestamos: CxPRow[] = [];
  const prestamoCats = categories.filter((c) => {
    const s = `${c.categoria} ${c.subcategoria}`.toLowerCase();
    return c.tipo === 'Gastos' && (s.includes('préstamo') || s.includes('prestamo') || s.includes('hipoteca'));
  });
  prestamoCats.forEach((cat) => {
    const txs = transactions
      .filter((t) => t.subcategoriaId === cat.id && t.gasto > 0)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    if (!txs.length) return;
    const last = txs[0];
    const lastDate = new Date(last.fecha);
    const diasDesdeUltimo = (now.getTime() - lastDate.getTime()) / DIA_MS;
    // Préstamo saldado / inactivo: si el último pago es de hace >45 días, no hay compromiso vigente
    if (diasDesdeUltimo > 45) return;
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    while (nextDate < now) nextDate.setMonth(nextDate.getMonth() + 1);
    if (nextDate > limite) return;

    cxpPrestamos.push({
      id: `loan-${cat.id}`,
      concepto: `${cat.categoria} · ${cat.subcategoria}`,
      tipo: 'Préstamo',
      monto: Number(last.gasto),
      divisa: (last.divisa as CurrencyCode) || baseCurrency,
      fechaEstimada: nextDate,
      detalle: 'Cuota estimada',
    });
  });

  return [...cxpSuscripciones, ...cxpAnuales, ...cxpRecurrentes, ...cxpTarjetas, ...cxpPrestamos].sort(
    (a, b) => a.fechaEstimada.getTime() - b.fechaEstimada.getTime()
  );
};
